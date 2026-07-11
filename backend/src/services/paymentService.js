const db = require('../config/db');
const walletQueries = require('../queries/walletQueries');
const withdrawalQueries = require('../queries/withdrawalQueries');
const advertiserQueries = require('../queries/advertiserQueries');

class PaymentService {
  /**
   * Submit withdrawal request from User
   */
  static async requestWithdrawal(userId, amount, paymentMethod, paymentDetails) {
    const userAmount = parseFloat(amount);

    return await db.transaction(async (client) => {
      // 1. Get system settings for limits and fees
      const sysRes = await client.query("SELECT value FROM system_settings WHERE key = 'pricing'");
      const config = sysRes.rows[0].value;

      if (userAmount < parseFloat(config.min_withdrawal_limit)) {
        const err = new Error(`Minimum withdrawal amount is $${config.min_withdrawal_limit}`);
        err.statusCode = 400;
        throw err;
      }

      // Check KYC status
      const userRes = await client.query('SELECT kyc_status FROM users WHERE id = $1', [userId]);
      if (userRes.rows[0].kyc_status !== 'approved') {
        const err = new Error('KYC verification is required before making withdrawals');
        err.statusCode = 400;
        throw err;
      }

      // 2. Validate user wallet balance
      const walletRes = await client.query(walletQueries.findWalletByUserId, [userId]);
      if (walletRes.rowCount === 0) {
        const err = new Error('Wallet not found');
        err.statusCode = 404;
        throw err;
      }

      const wallet = walletRes.rows[0];
      if (parseFloat(wallet.balance) < userAmount) {
        const err = new Error('Insufficient wallet balance');
        err.statusCode = 400;
        throw err;
      }

      // Calculate fees
      const fee = userAmount * (parseFloat(config.withdrawal_fee_percent) / 100);
      const netAmount = userAmount - fee;

      // 3. Move balance to pending
      await client.query(walletQueries.updateWalletBalance, [-userAmount, userAmount, wallet.id]);

      // 4. Create withdrawal request
      const withdrawal = await client.query(withdrawalQueries.insertWithdrawal, [
        userId,
        userAmount,
        fee,
        netAmount,
        paymentMethod,
        JSON.stringify(paymentDetails)
      ]);

      // 5. Wallet transaction log
      await client.query(walletQueries.insertTransaction, [
        wallet.id,
        -userAmount,
        'withdrawal',
        `Withdrawal request ($${userAmount}) pending approval`,
        'pending',
        withdrawal.rows[0].id
      ]);

      return withdrawal.rows[0];
    });
  }

  /**
   * Process withdrawal approval/rejection (Admin Only)
   */
  static async processWithdrawal(withdrawalId, status, adminNotes) {
    if (!['completed', 'rejected'].includes(status)) {
      const err = new Error('Invalid withdrawal process status');
      err.statusCode = 400;
      throw err;
    }

    return await db.transaction(async (client) => {
      // Fetch withdrawal
      const withRes = await client.query(withdrawalQueries.getWithdrawalById, [withdrawalId]);
      if (withRes.rowCount === 0) {
        const err = new Error('Withdrawal request not found');
        err.statusCode = 404;
        throw err;
      }

      const withdrawal = withRes.rows[0];
      if (withdrawal.status !== 'pending') {
        const err = new Error('Withdrawal request has already been processed');
        err.statusCode = 400;
        throw err;
      }

      const amount = parseFloat(withdrawal.amount);
      const walletRes = await client.query(walletQueries.findWalletByUserId, [withdrawal.user_id]);
      const wallet = walletRes.rows[0];

      if (status === 'completed') {
        // Deduct from pending earnings
        await client.query(walletQueries.updateWalletBalance, [0.00, -amount, wallet.id]);

        // Complete withdrawal
        await client.query(withdrawalQueries.updateWithdrawalStatus, [
          'completed',
          adminNotes || 'Withdrawal approved and sent',
          new Date(),
          withdrawalId
        ]);

        // Update Wallet Transaction log
        await client.query(
          `UPDATE wallet_transactions 
           SET status = 'completed', description = 'Withdrawal processed successfully' 
           WHERE reference_id = $1 AND tx_type = 'withdrawal'`,
          [withdrawalId]
        );

        // Notify user
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'withdrawal')`,
          [withdrawal.user_id, 'Withdrawal Processed!', `Your withdrawal of $${withdrawal.net_amount} has been successfully processed.`]
        );
      } else {
        // Revert pending amount back to main balance
        await client.query(walletQueries.updateWalletBalance, [amount, -amount, wallet.id]);

        // Reject withdrawal
        await client.query(withdrawalQueries.updateWithdrawalStatus, [
          'rejected',
          adminNotes || 'Withdrawal rejected by administrator',
          new Date(),
          withdrawalId
        ]);

        // Update Wallet Transaction log
        await client.query(
          `UPDATE wallet_transactions 
           SET status = 'failed', description = $1 
           WHERE reference_id = $2 AND tx_type = 'withdrawal'`,
          [`Withdrawal rejected: ${adminNotes || 'Contact support'}`, withdrawalId]
        );

        // Notify user
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'withdrawal')`,
          [withdrawal.user_id, 'Withdrawal Rejected', `Your withdrawal request of $${withdrawal.amount} was rejected: ${adminNotes || 'Please contact support.'}`]
        );
      }

      return { withdrawalId, status };
    });
  }

  /**
   * Deposit Advertiser Funds
   */
  static async depositFunds(advertiserId, amount, paymentMethod, transactionReference) {
    const depAmount = parseFloat(amount);

    return await db.transaction(async (client) => {
      // Insert deposit
      const depRes = await client.query(
        `INSERT INTO deposits (advertiser_id, amount, payment_method, transaction_reference, status)
         VALUES ($1, $2, $3, $4, 'completed')
         RETURNING *`,
        [advertiserId, depAmount, paymentMethod, transactionReference]
      );

      const deposit = depRes.rows[0];

      // Update Advertiser balance
      const walletRes = await client.query(walletQueries.findWalletByAdvertiserId, [advertiserId]);
      const wallet = walletRes.rows[0];

      await client.query(walletQueries.updateWalletBalance, [depAmount, 0.00, wallet.id]);

      // Log wallet transaction
      await client.query(walletQueries.insertTransaction, [
        wallet.id,
        depAmount,
        'deposit',
        `Fund wallet via ${paymentMethod}`,
        'completed',
        deposit.id
      ]);

      // Create invoice record
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const subtotal = depAmount / 1.16; // 16% VAT example
      const tax = depAmount - subtotal;

      await client.query(
        `INSERT INTO invoices (advertiser_id, deposit_id, invoice_number, subtotal, tax, total, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid')`,
        [advertiserId, deposit.id, invoiceNumber, subtotal, tax, depAmount]
      );

      // Notify advertiser
      await client.query(
        `INSERT INTO notifications (advertiser_id, title, message, type)
         VALUES ($1, $2, $3, 'info')`,
        [advertiserId, 'Deposit Completed', `Successfully credited $${depAmount} to your advertising account balance.`]
      );

      return deposit;
    });
  }
}

module.exports = PaymentService;
