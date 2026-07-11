const CampaignService = require('../services/campaignService');
const PaymentService = require('../services/paymentService');
const db = require('../config/db');
const { uploadToCloudinary } = require('../middlewares/uploadMiddleware');

class CampaignController {
  static async createCampaign(req, res, next) {
    try {
      const { name, budget, dailyBudget, startDate, endDate, targetAudience, ads } = req.body;
      
      if (!name || !budget || !dailyBudget || !startDate || !endDate || !ads || !ads.length) {
        return res.status(400).json({ success: false, message: 'Missing required campaign parameters' });
      }

      const result = await CampaignService.createCampaign(
        req.advertiser.id,
        name,
        budget,
        dailyBudget,
        startDate,
        endDate,
        targetAudience || {},
        ads
      );

      res.status(201).json({
        success: true,
        message: 'Campaign created and funded successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdvertiserCampaigns(req, res, next) {
    try {
      const result = await db.query('SELECT * FROM campaigns WHERE advertiser_id = $1 ORDER BY created_at DESC', [req.advertiser.id]);
      res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdvertiserAnalytics(req, res, next) {
    try {
      const dashboardRes = await db.query(
        `SELECT 
          COALESCE(SUM(s.impressions), 0)::INT as impressions,
          COALESCE(SUM(s.views), 0)::INT as views,
          COALESCE(SUM(s.clicks), 0)::INT as clicks,
          COALESCE(SUM(s.spent), 0.00)::FLOAT as spent
         FROM campaign_statistics s
         JOIN campaigns c ON s.campaign_id = c.id
         WHERE c.advertiser_id = $1`,
        [req.advertiser.id]
      );

      const dailyRes = await db.query(
        `SELECT s.date, 
          COALESCE(SUM(s.impressions), 0)::INT as impressions,
          COALESCE(SUM(s.views), 0)::INT as views,
          COALESCE(SUM(s.clicks), 0)::INT as clicks,
          COALESCE(SUM(s.spent), 0.00)::FLOAT as spent
         FROM campaign_statistics s
         JOIN campaigns c ON s.campaign_id = c.id
         WHERE c.advertiser_id = $1
         GROUP BY s.date
         ORDER BY s.date ASC
         LIMIT 30`,
        [req.advertiser.id]
      );

      res.status(200).json({
        success: true,
        data: {
          summary: dashboardRes.rows[0],
          daily: dailyRes.rows
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEligibleAds(req, res, next) {
    try {
      const country = req.query.country || 'US';
      const device = req.query.device || 'mobile';

      const ads = await CampaignService.getEligibleAds(req.user.id, country, device);
      res.status(200).json({
        success: true,
        data: ads
      });
    } catch (error) {
      next(error);
    }
  }

  static async logAdEvent(req, res, next) {
    try {
      const { adId, eventType } = req.body;
      if (!adId || !eventType) {
        return res.status(400).json({ success: false, message: 'adId and eventType are required' });
      }

      const deviceDetails = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceType: req.query.device || 'mobile',
        country: req.query.country || 'US'
      };

      const result = await CampaignService.recordAdEvent(
        adId,
        req.user ? req.user.id : null,
        eventType,
        deviceDetails
      );

      res.status(200).json({
        success: true,
        message: `Ad ${eventType} logged successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async depositFunds(req, res, next) {
    try {
      const { amount, paymentMethod, transactionReference } = req.body;
      if (!amount || !paymentMethod || !transactionReference) {
        return res.status(400).json({ success: false, message: 'amount, paymentMethod and transactionReference are required' });
      }

      const deposit = await PaymentService.depositFunds(
        req.advertiser.id,
        amount,
        paymentMethod,
        transactionReference
      );

      res.status(200).json({
        success: true,
        message: 'Funds deposited successfully',
        data: deposit
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadMediaAsset(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      
      const uploadResult = await uploadToCloudinary(req.file);
      res.status(200).json({
        success: true,
        message: 'Ad media uploaded to Cloudinary successfully',
        data: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          resourceType: uploadResult.resource_type,
          format: uploadResult.format
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBillingHistory(req, res, next) {
    try {
      const deposits = await db.query('SELECT * FROM deposits WHERE advertiser_id = $1 ORDER BY created_at DESC', [req.advertiser.id]);
      const invoices = await db.query('SELECT * FROM invoices WHERE advertiser_id = $1 ORDER BY created_at DESC', [req.advertiser.id]);
      
      res.status(200).json({
        success: true,
        data: {
          deposits: deposits.rows,
          invoices: invoices.rows
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CampaignController;
