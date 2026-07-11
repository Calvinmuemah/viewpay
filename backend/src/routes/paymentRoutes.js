const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authenticateUser } = require('../middlewares/authMiddleware');

router.post('/withdraw/request', authenticateUser, PaymentController.requestWithdrawal);
router.get('/withdraw/history', authenticateUser, PaymentController.getWithdrawalHistory);
router.get('/wallet/transactions', authenticateUser, PaymentController.getWalletTransactions);

module.exports = router;
