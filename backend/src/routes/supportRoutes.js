const express = require('express');
const router = express.Router();
const SupportController = require('../controllers/supportController');
const { authenticateUser, authenticateAdvertiser, authenticateAdmin, requirePermission } = require('../middlewares/authMiddleware');

// Middleware to detect user or advertiser or admin
const authenticateAny = (req, res, next) => {
  if (req.headers.authorization) {
    // If it's admin or user or advertiser
    // Let's resolve authentication conditionally
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      const { verifyAccessToken } = require('../utils/jwt');
      const decoded = verifyAccessToken(authHeader.split(' ')[1]);
      if (decoded) {
        if (decoded.type === 'admin') return authenticateAdmin(req, res, next);
        if (decoded.type === 'user') return authenticateUser(req, res, next);
        if (decoded.type === 'advertiser') return authenticateAdvertiser(req, res, next);
      }
    }
  }
  return res.status(401).json({ success: false, message: 'Authentication required' });
};

router.post('/tickets', (req, res, next) => {
  // Can be user or advertiser
  const authHeader = req.headers.authorization || '';
  if (authHeader.includes('Bearer ')) {
    const decoded = require('../utils/jwt').verifyAccessToken(authHeader.split(' ')[1]);
    if (decoded && decoded.type === 'advertiser') return authenticateAdvertiser(req, res, next);
  }
  return authenticateUser(req, res, next);
}, SupportController.createTicket);

router.get('/tickets/my', (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.includes('Bearer ')) {
    const decoded = require('../utils/jwt').verifyAccessToken(authHeader.split(' ')[1]);
    if (decoded && decoded.type === 'advertiser') return authenticateAdvertiser(req, res, next);
  }
  return authenticateUser(req, res, next);
}, SupportController.getMyTickets);

router.get('/tickets/:id', authenticateAny, SupportController.getTicketDetails);
router.post('/tickets/:id/reply', authenticateAny, SupportController.replyTicket);

// Admin-only support management
router.get('/admin/tickets', authenticateAdmin, requirePermission('resolve_support_tickets'), SupportController.adminGetTickets);
router.put('/admin/tickets/:id/resolve', authenticateAdmin, requirePermission('resolve_support_tickets'), SupportController.adminResolveTicket);

module.exports = router;
