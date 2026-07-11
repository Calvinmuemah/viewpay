const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticateAdmin, requirePermission } = require('../middlewares/authMiddleware');

router.get('/stats', authenticateAdmin, AdminController.getDashboardStats);

router.get('/users', authenticateAdmin, requirePermission('manage_users'), AdminController.getUsers);
router.put('/users/:id/status', authenticateAdmin, requirePermission('manage_users'), AdminController.updateUserStatus);

router.get('/advertisers', authenticateAdmin, requirePermission('manage_advertisers'), AdminController.getAdvertisers);
router.put('/advertisers/:id/status', authenticateAdmin, requirePermission('manage_advertisers'), AdminController.updateAdvertiserStatus);

router.get('/withdrawals', authenticateAdmin, requirePermission('manage_withdrawals'), AdminController.getWithdrawals);
router.put('/withdrawals/:id/process', authenticateAdmin, requirePermission('manage_withdrawals'), AdminController.processWithdrawal);

router.get('/campaigns', authenticateAdmin, requirePermission('manage_campaigns'), AdminController.getCampaigns);
router.put('/campaigns/:id/status', authenticateAdmin, requirePermission('manage_campaigns'), AdminController.updateCampaignStatus);

router.get('/audit-logs', authenticateAdmin, requirePermission('view_analytics'), AdminController.getAuditLogs);
router.get('/fraud-reports', authenticateAdmin, requirePermission('view_analytics'), AdminController.getFraudReports);
router.put('/settings', authenticateAdmin, requirePermission('manage_system_settings'), AdminController.updateSettings);

module.exports = router;
