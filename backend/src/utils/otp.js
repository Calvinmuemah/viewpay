const crypto = require('crypto');
const { query } = require('../config/db');

/**
 * Generate a 6-digit numeric OTP
 * @returns {string}
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Save OTP to database
 * @param {string} email 
 * @param {string} code 
 * @param {string} purpose 
 */
const saveOtp = async (email, code, purpose) => {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration
  await query(
    'INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [email, code, purpose, expiresAt]
  );
};

/**
 * Verify OTP code
 * @param {string} email 
 * @param {string} code 
 * @param {string} purpose 
 * @returns {Promise<boolean>}
 */
const verifyOtp = async (email, code, purpose) => {
  const res = await query(
    `SELECT * FROM otp_codes 
     WHERE email = $1 AND code = $2 AND purpose = $3 AND expires_at > CURRENT_TIMESTAMP 
     ORDER BY created_at DESC LIMIT 1`,
    [email, code, purpose]
  );
  
  if (res.rowCount === 0) {
    return false;
  }
  
  // Clean up used OTPs
  await query('DELETE FROM otp_codes WHERE email = $1 AND purpose = $2', [email, purpose]);
  return true;
};

module.exports = {
  generateOtp,
  saveOtp,
  verifyOtp
};
