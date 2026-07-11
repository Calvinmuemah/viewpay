const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');
const { authenticateAdvertiser, authenticateUser } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

// Advertiser routes
router.post('/campaigns', authenticateAdvertiser, CampaignController.createCampaign);
router.get('/campaigns/my', authenticateAdvertiser, CampaignController.getAdvertiserCampaigns);
router.get('/analytics/my', authenticateAdvertiser, CampaignController.getAdvertiserAnalytics);
router.post('/deposit', authenticateAdvertiser, CampaignController.depositFunds);
router.get('/billing/my', authenticateAdvertiser, CampaignController.getBillingHistory);
router.post('/upload', authenticateAdvertiser, upload.single('media'), CampaignController.uploadMediaAsset);

// User/Viewer routes
router.get('/ads/eligible', authenticateUser, CampaignController.getEligibleAds);
router.post('/ads/event', (req, res, next) => {
  // Let this be accessible by authenticated users (to award points)
  // or anonymous users (to track impressions/clicks, but no point reward)
  // We can execute conditional middleware
  if (req.headers.authorization) {
    return authenticateUser(req, res, next);
  }
  next();
}, CampaignController.logAdEvent);

module.exports = router;
