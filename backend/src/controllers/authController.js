const AuthService = require('../services/authService');

class AuthController {
  static async registerUser(req, res, next) {
    try {
      const { name, email, password, referralCode } = req.body;
      const user = await AuthService.registerUser(name, email, password, referralCode);
      res.status(201).json({
        success: true,
        message: 'Registration successful. OTP sent to your email.',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerAdvertiser(req, res, next) {
    try {
      const { companyName, contactName, email, password } = req.body;
      const advertiser = await AuthService.registerAdvertiser(companyName, contactName, email, password);
      res.status(201).json({
        success: true,
        message: 'Advertiser registration successful. OTP sent to email.',
        data: advertiser
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password, type } = req.body;
      const deviceDetails = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceId: req.headers['x-device-id'] || 'unknown'
      };

      const result = await AuthService.login(email, password, type, deviceDetails);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: result.accessToken,
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req, res, next) {
    try {
      const { email, code, purpose } = req.body;
      const result = await AuthService.verifyOtpCode(email, code, purpose);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.requestPasswordReset(email);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { email, code, newPassword } = req.body;
      const result = await AuthService.resetPassword(email, code, newPassword);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
      }

      const result = await AuthService.refreshToken(token);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;
      if (token) {
        await AuthService.logout(token);
      }
      res.clearCookie('refreshToken');
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
