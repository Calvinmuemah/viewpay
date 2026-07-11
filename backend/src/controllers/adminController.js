const db = require('../config/db');
const PaymentService = require('../services/paymentService');
const adminQueries = require('../queries/adminQueries');
const withdrawalQueries = require('../queries/withdrawalQueries');

class AdminController {
  static async getDashboardStats(req, res, next) {
    try {
      const statsRes = await db.query(adminQueries.getAdminDashboardStats);
      
      // Calculate profit margin based on commission rules
      const commissionsRes = await db.query(
        "SELECT COALESCE(SUM(spent * 0.4), 0) as platform_profit FROM campaign_statistics"
      );
      
      const stats = statsRes.rows[0];
      stats.total_profit = parseFloat(commissionsRes.rows[0].platform_profit);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const countRes = await db.query(adminQueries.countUsersList);
      const total = parseInt(countRes.rows[0].count);

      const users = await db.query(adminQueries.getUsersList, [limit, offset]);

      res.status(200).json({
        success: true,
        data: {
          users: users.rows,
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

  static async getAdvertisers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const countRes = await db.query(adminQueries.countAdvertisersList);
      const total = parseInt(countRes.rows[0].count);

      const advertisers = await db.query(adminQueries.getAdvertisersList, [limit, offset]);

      res.status(200).json({
        success: true,
        data: {
          advertisers: advertisers.rows,
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

  static async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // active, suspended

      const result = await db.query(adminQueries.updateUserStatus, [status, id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Log action
      await db.query(adminQueries.insertAuditLog, [
        `user_${status}`,
        req.admin.id,
        'admin',
        JSON.stringify({ userId: id }),
        req.ip
      ]);

      res.status(200).json({
        success: true,
        message: 'User status updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAdvertiserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // active, suspended

      const result = await db.query(adminQueries.updateAdvertiserStatus, [status, id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Advertiser not found' });
      }

      // Log action
      await db.query(adminQueries.insertAuditLog, [
        `advertiser_${status}`,
        req.admin.id,
        'admin',
        JSON.stringify({ advertiserId: id }),
        req.ip
      ]);

      res.status(200).json({
        success: true,
        message: 'Advertiser status updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWithdrawals(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status || null; // pending, completed, rejected

      const countRes = await db.query(withdrawalQueries.countAllWithdrawals, [status]);
      const total = parseInt(countRes.rows[0].count);

      const withdrawals = await db.query(withdrawalQueries.getAllWithdrawals, [status, limit, offset]);

      res.status(200).json({
        success: true,
        data: {
          withdrawals: withdrawals.rows,
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

  static async processWithdrawal(req, res, next) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body; // completed, rejected

      const result = await PaymentService.processWithdrawal(id, status, adminNotes);

      // Log audit
      await db.query(adminQueries.insertAuditLog, [
        `withdrawal_${status}`,
        req.admin.id,
        'admin',
        JSON.stringify({ withdrawalId: id, adminNotes }),
        req.ip
      ]);

      res.status(200).json({
        success: true,
        message: `Withdrawal request successfully ${status}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCampaigns(req, res, next) {
    try {
      const campaigns = await db.query(
        `SELECT c.*, a.company_name 
         FROM campaigns c
         JOIN advertisers a ON c.advertiser_id = a.id
         ORDER BY c.created_at DESC`
      );
      res.status(200).json({
        success: true,
        data: campaigns.rows
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCampaignStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // active, paused, completed, rejected

      const result = await db.query(
        'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      // Log audit
      await db.query(adminQueries.insertAuditLog, [
        `campaign_${status}`,
        req.admin.id,
        'admin',
        JSON.stringify({ campaignId: id }),
        req.ip
      ]);

      res.status(200).json({
        success: true,
        message: `Campaign status updated to ${status}`,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      const logs = await db.query(adminQueries.getAuditLogs, [limit, offset]);
      res.status(200).json({
        success: true,
        data: logs.rows
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFraudReports(req, res, next) {
    try {
      const ips = await db.query(adminQueries.detectDuplicateIps);
      const clickers = await db.query(adminQueries.detectClickSpammers);

      res.status(200).json({
        success: true,
        data: {
          duplicateIps: ips.rows,
          clickSpammers: clickers.rows
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const { key, value } = req.body;
      if (!key || !value) {
        return res.status(400).json({ success: false, message: 'Key and value are required' });
      }

      await db.query(
        'INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP',
        [key, JSON.stringify(value)]
      );

      // Log audit
      await db.query(adminQueries.insertAuditLog, [
        `update_settings_${key}`,
        req.admin.id,
        'admin',
        JSON.stringify({ key, value }),
        req.ip
      ]);

      res.status(200).json({
        success: true,
        message: `Settings updated successfully for ${key}`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
