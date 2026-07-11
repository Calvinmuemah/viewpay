const db = require('../config/db');

class GeneralController {
  static async getFaqs(req, res, next) {
    try {
      const category = req.query.category || null;
      let queryStr = 'SELECT * FROM faqs ORDER BY category, id';
      let params = [];

      if (category) {
        queryStr = 'SELECT * FROM faqs WHERE category = $1 ORDER BY id';
        params = [category];
      }

      const result = await db.query(queryStr, params);
      res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSystemSettings(req, res, next) {
    try {
      const result = await db.query('SELECT key, value FROM system_settings');
      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = row.value;
      });

      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTermsAndPrivacy(req, res, next) {
    res.status(200).json({
      success: true,
      data: {
        terms: "Welcome to ViewPay. By registering, you agree to our terms. Users are rewarded with a percentage of advertiser payouts. Falsification of ad watch logs, utilizing VPNs, macros, emulator-based view automation, or multi-account farming will result in permanent suspension and forfeiture of all accumulated rewards.",
        privacy: "We value your privacy. We collect your device identity to prevent fraudulent multiple accounts. We never sell your personal information or transaction history to third-party brokers."
      }
    });
  }

  static async cronResetBudgets(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      const cronSecret = process.env.CRON_SECRET;
      
      if (process.env.NODE_ENV === 'production' && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ success: false, message: 'Unauthorized cron trigger' });
      }

      const result = await db.query('UPDATE campaigns SET daily_spent = 0.00');
      res.status(200).json({
        success: true,
        message: 'Successfully reset daily spent limits for campaigns.',
        count: result.rowCount
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GeneralController;
