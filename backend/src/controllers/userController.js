const UserService = require('../services/userService');

class UserController {
  static async getProfile(req, res, next) {
    try {
      const profile = await UserService.getUserProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitKyc(req, res, next) {
    try {
      const { documentType, documentNumber, documentFrontUrl, documentBackUrl } = req.body;
      if (!documentType || !documentNumber || !documentFrontUrl) {
        return res.status(400).json({ success: false, message: 'Document details and front image URL are required' });
      }

      const kyc = await UserService.submitKyc(
        req.user.id,
        documentType,
        documentNumber,
        documentFrontUrl,
        documentBackUrl
      );

      res.status(200).json({
        success: true,
        message: 'KYC documents submitted successfully',
        data: kyc
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDailyRewardStatus(req, res, next) {
    try {
      const status = await UserService.getDailyRewardsStatus(req.user.id);
      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }

  static async claimDailyReward(req, res, next) {
    try {
      const claim = await UserService.claimDailyReward(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Daily check-in reward claimed successfully!',
        data: claim
      });
    } catch (error) {
      next(error);
    }
  }

  static async claimSpinReward(req, res, next) {
    try {
      const spin = await UserService.claimSpinReward(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Spin wheel claimed successfully!',
        data: spin
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardSummary(req, res, next) {
    try {
      const summary = await UserService.getDashboardSummary(req.user.id);
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLeaderboard(req, res, next) {
    try {
      const leaderboard = await UserService.getLeaderboard();
      res.status(200).json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAchievements(req, res, next) {
    try {
      const achievements = await UserService.getAchievements(req.user.id);
      res.status(200).json({
        success: true,
        data: achievements
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
