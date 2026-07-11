const PaymentService = require('../services/paymentService');
const db = require('../config/db');
const walletQueries = require('../queries/walletQueries');
const withdrawalQueries = require('../queries/withdrawalQueries');

class PaymentController {
  static async requestWithdrawal(req, res, next) {
    try {
      const { amount, paymentMethod, paymentDetails } = req.body;
      if (!amount || !paymentMethod || !paymentDetails) {
        return res.status(400).json({ success: false, message: 'amount, paymentMethod and paymentDetails are required' });
      }

      const withdrawal = await PaymentService.requestWithdrawal(
        req.user.id,
        amount,
        paymentMethod,
        paymentDetails
      );

      res.status(201).json({
        success: true,
        message: 'Withdrawal request submitted successfully and is pending approval',
        data: withdrawal
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWithdrawalHistory(req, res, next) {
    try {
      const result = await db.query(withdrawalQueries.getWithdrawalsByUserId, [req.user.id]);
      res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWalletTransactions(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const walletRes = await db.query(walletQueries.findWalletByUserId, [req.user.id]);
      if (walletRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Wallet not found' });
      }

      const wallet = walletRes.rows[0];
      const countRes = await db.query(walletQueries.countTransactionsByWalletId, [wallet.id]);
      const total = parseInt(countRes.rows[0].count);

      const txs = await db.query(walletQueries.getTransactionsByWalletId, [wallet.id, limit, offset]);

      res.status(200).json({
        success: true,
        data: {
          transactions: txs.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PaymentController;
