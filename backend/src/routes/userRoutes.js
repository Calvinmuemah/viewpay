const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticateUser } = require('../middlewares/authMiddleware');

router.get('/profile', authenticateUser, UserController.getProfile);
router.post('/kyc/submit', authenticateUser, UserController.submitKyc);
router.get('/rewards/daily/status', authenticateUser, UserController.getDailyRewardStatus);
router.post('/rewards/daily/claim', authenticateUser, UserController.claimDailyReward);
router.post('/rewards/spin/claim', authenticateUser, UserController.claimSpinReward);
router.get('/dashboard/summary', authenticateUser, UserController.getDashboardSummary);
router.get('/leaderboard', authenticateUser, UserController.getLeaderboard);
router.get('/achievements', authenticateUser, UserController.getAchievements);

module.exports = router;
