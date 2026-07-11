const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const userQueries = require('../queries/userQueries');
const advertiserQueries = require('../queries/advertiserQueries');
const adminQueries = require('../queries/adminQueries');
const { generateOtp, saveOtp, verifyOtp } = require('../utils/otp');
const { sendOtpVerificationEmail, sendPasswordResetEmail } = require('../emails/emailService');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a unique referral code for a new user
 * @param {string} name 
 * @returns {string}
 */
const generateReferralCode = (name) => {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'VP');
  const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${randStr}`;
};

class AuthService {
  /**
   * Register a user
   */
  static async registerUser(name, email, password, referralCode) {
    // Check if user exists
    const existing = await db.query(userQueries.findUserByEmail, [email]);
    if (existing.rowCount > 0) {
      const err = new Error('Email already registered');
      err.statusCode = 400;
      throw err;
    }

    let referredById = null;
    if (referralCode) {
      const referrer = await db.query(userQueries.findUserByReferralCode, [referralCode.toUpperCase()]);
      if (referrer.rowCount > 0) {
        referredById = referrer.rows[0].id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newRefCode = generateReferralCode(name);

    return await db.transaction(async (client) => {
      // Insert User
      const userRes = await client.query(userQueries.insertUser, [
        name,
        email,
        passwordHash,
        newRefCode,
        referredById
      ]);

      const user = userRes.rows[0];

      // Create User Wallet
      await client.query(
        'INSERT INTO wallets (user_id, balance, pending_balance, currency) VALUES ($1, 0.00, 0.00, $2)',
        [user.id, 'USD']
      );

      // Create referral mapping if referred
      if (referredById) {
        // Fetch default referral reward amounts
        const configRes = await client.query("SELECT value FROM system_settings WHERE key = 'referrals'");
        const reward = configRes.rowCount > 0 ? configRes.rows[0].value.referrer_reward : 0.50;
        await client.query(userQueries.insertReferralRecord, [referredById, user.id, reward]);
      }

      // Generate OTP code
      const otp = generateOtp();
      await saveOtp(email, otp, 'verify_email');
      await sendOtpVerificationEmail(email, otp);

      return user;
    });
  }

  /**
   * Register an advertiser
   */
  static async registerAdvertiser(companyName, contactName, email, password) {
    const existing = await db.query(advertiserQueries.findAdvertiserByEmail, [email]);
    if (existing.rowCount > 0) {
      const err = new Error('Email already registered as advertiser');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return await db.transaction(async (client) => {
      // Insert Advertiser
      const advRes = await client.query(advertiserQueries.insertAdvertiser, [
        companyName,
        contactName,
        email,
        passwordHash
      ]);

      const advertiser = advRes.rows[0];

      // Create Advertiser Wallet
      await client.query(
        'INSERT INTO wallets (advertiser_id, balance, pending_balance, currency) VALUES ($1, 0.00, 0.00, $2)',
        [advertiser.id, 'USD']
      );

      // Generate and send OTP
      const otp = generateOtp();
      await saveOtp(email, otp, 'verify_email');
      await sendOtpVerificationEmail(email, otp);

      return advertiser;
    });
  }

  /**
   * Login user, advertiser, or admin
   */
  static async login(email, password, type, deviceDetails = {}) {
    let queryStr;
    let updateAttemptsQuery;
    let resetAttemptsQuery;

    if (type === 'user') {
      queryStr = userQueries.findUserByEmail;
      updateAttemptsQuery = userQueries.updateFailedAttempts;
      resetAttemptsQuery = userQueries.resetFailedAttempts;
    } else if (type === 'advertiser') {
      queryStr = advertiserQueries.findAdvertiserByEmail;
      updateAttemptsQuery = advertiserQueries.updateFailedAttempts;
      resetAttemptsQuery = advertiserQueries.resetFailedAttempts;
    } else if (type === 'admin') {
      queryStr = adminQueries.findAdminByUsername; // or Email
    } else {
      const err = new Error('Invalid account type');
      err.statusCode = 400;
      throw err;
    }

    const res = await db.query(queryStr, [email]);
    if (res.rowCount === 0 && type === 'admin') {
      // Admin fallback to email lookup
      const adminEmailRes = await db.query(adminQueries.findAdminByEmail, [email]);
      if (adminEmailRes.rowCount > 0) {
        return this.verifyPasswordAndGenerateTokens(adminEmailRes.rows[0], password, 'admin', null, null, deviceDetails);
      }
    }

    if (res.rowCount === 0) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const account = res.rows[0];

    // Check account locks (User/Advertiser only)
    if (type !== 'admin' && account.locked_until && new Date(account.locked_until) > new Date()) {
      const lockRemaining = Math.ceil((new Date(account.locked_until) - new Date()) / 1000 / 60);
      const err = new Error(`Account is locked. Try again in ${lockRemaining} minutes.`);
      err.statusCode = 403;
      throw err;
    }

    return this.verifyPasswordAndGenerateTokens(account, password, type, updateAttemptsQuery, resetAttemptsQuery, deviceDetails);
  }

  static async verifyPasswordAndGenerateTokens(account, password, type, updateAttemptsQuery, resetAttemptsQuery, deviceDetails) {
    const isPasswordValid = await bcrypt.compare(password, account.password_hash);

    if (!isPasswordValid) {
      if (type !== 'admin') {
        const attempts = account.failed_login_attempts + 1;
        let lockedUntil = null;
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          lockedUntil = new Date(Date.now() + LOCK_TIME_MS);
        }
        await db.query(updateAttemptsQuery, [attempts, lockedUntil, account.id]);
      }
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    // Reset attempts on successful login
    if (type !== 'admin') {
      await db.query(resetAttemptsQuery, [account.id]);
    }

    // Check verification status
    if (type !== 'admin' && !account.is_verified) {
      const err = new Error('Email not verified. Please verify your email.');
      err.statusCode = 403;
      err.unverified = true;
      throw err;
    }

    const payload = {
      id: account.id,
      email: account.email,
      type
    };

    if (type === 'user') payload.name = account.name;
    if (type === 'advertiser') payload.companyName = account.company_name;

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token session to database
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const sessionId = uuidv4();

    await db.query(
      `INSERT INTO sessions (id, user_id, advertiser_id, refresh_token, ip_address, user_agent, device_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sessionId,
        type === 'user' ? account.id : null,
        type === 'advertiser' ? account.id : null,
        refreshToken,
        deviceDetails.ipAddress || 'unknown',
        deviceDetails.userAgent || 'unknown',
        deviceDetails.deviceId || 'unknown',
        sessionExpiresAt
      ]
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: account.id,
        name: type === 'user' ? account.name : account.company_name,
        email: account.email,
        type
      }
    };
  }

  /**
   * Verify email or reset password OTP code
   */
  static async verifyOtpCode(email, code, purpose) {
    const isValid = await verifyOtp(email, code, purpose);
    if (!isValid) {
      const err = new Error('Invalid or expired OTP code');
      err.statusCode = 400;
      throw err;
    }

    if (purpose === 'verify_email') {
      // Find if email is user or advertiser
      const userRes = await db.query(userQueries.findUserByEmail, [email]);
      if (userRes.rowCount > 0) {
        await db.query(userQueries.verifyUserEmail, [email]);
        return { message: 'Email verified successfully as User' };
      }

      const advRes = await db.query(advertiserQueries.findAdvertiserByEmail, [email]);
      if (advRes.rowCount > 0) {
        await db.query(advertiserQueries.verifyAdvertiserEmail, [email]);
        return { message: 'Email verified successfully as Advertiser' };
      }

      const err = new Error('Email not found');
      err.statusCode = 404;
      throw err;
    }

    return { message: 'OTP verified successfully' };
  }

  /**
   * Initiate forgot password flow
   */
  static async requestPasswordReset(email) {
    const userRes = await db.query(userQueries.findUserByEmail, [email]);
    const advRes = await db.query(advertiserQueries.findAdvertiserByEmail, [email]);

    if (userRes.rowCount === 0 && advRes.rowCount === 0) {
      // We don't disclose that the email does not exist for security reasons,
      // but in this API we can return success to prevent user enum.
      return { message: 'If the email exists, a password reset code has been sent' };
    }

    const otp = generateOtp();
    await saveOtp(email, otp, 'reset_password');
    await sendPasswordResetEmail(email, otp);

    return { message: 'Reset password OTP sent successfully' };
  }

  /**
   * Reset Password with OTP
   */
  static async resetPassword(email, code, newPassword) {
    const isValid = await verifyOtp(email, code, 'reset_password');
    if (!isValid) {
      const err = new Error('Invalid or expired reset code');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const userRes = await db.query(userQueries.findUserByEmail, [email]);
    if (userRes.rowCount > 0) {
      await db.query(userQueries.updateUserPassword, [passwordHash, email]);
      return { message: 'User password reset successfully' };
    }

    const advRes = await db.query(advertiserQueries.findAdvertiserByEmail, [email]);
    if (advRes.rowCount > 0) {
      await db.query(advertiserQueries.updateAdvertiserPassword, [passwordHash, email]);
      return { message: 'Advertiser password reset successfully' };
    }

    const err = new Error('Account not found');
    err.statusCode = 404;
    throw err;
  }

  /**
   * Refresh JWT Token
   */
  static async refreshToken(token) {
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      const err = new Error('Invalid or expired refresh token');
      err.statusCode = 401;
      throw err;
    }

    // Check if session is active in database
    const sessionRes = await db.query(
      'SELECT * FROM sessions WHERE refresh_token = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (sessionRes.rowCount === 0) {
      const err = new Error('Session expired or deactivated');
      err.statusCode = 401;
      throw err;
    }

    const payload = {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type
    };

    if (decoded.name) payload.name = decoded.name;
    if (decoded.companyName) payload.companyName = decoded.companyName;

    const accessToken = generateAccessToken(payload);
    return { accessToken };
  }

  /**
   * Terminate Session / Logout
   */
  static async logout(token) {
    await db.query('UPDATE sessions SET is_active = FALSE WHERE refresh_token = $1', [token]);
    return { message: 'Logged out successfully' };
  }
}

module.exports = AuthService;
