const db = require('../config/db');
const campaignQueries = require('../queries/campaignQueries');
const advertiserQueries = require('../queries/advertiserQueries');
const walletQueries = require('../queries/walletQueries');
const userQueries = require('../queries/userQueries');
const UserService = require('./userService');

class CampaignService {
  /**
   * Create a new advertisement campaign
   */
  static async createCampaign(advertiserId, name, budget, dailyBudget, startDate, endDate, targetAudience, adsList) {
    if (parseFloat(dailyBudget) > parseFloat(budget)) {
      const err = new Error('Daily budget cannot exceed total budget');
      err.statusCode = 400;
      throw err;
    }

    return await db.transaction(async (client) => {
      // 1. Get advertiser wallet and check balance
      const walletRes = await client.query(walletQueries.findWalletByAdvertiserId, [advertiserId]);
      if (walletRes.rowCount === 0) {
        const err = new Error('Advertiser wallet not found');
        err.statusCode = 404;
        throw err;
      }

      const wallet = walletRes.rows[0];
      const totalBudget = parseFloat(budget);

      if (parseFloat(wallet.balance) < totalBudget) {
        const err = new Error('Insufficient wallet balance to fund campaign');
        err.statusCode = 400;
        throw err;
      }

      // 2. Debit Advertiser Balance (lock budget funds)
      await client.query(walletQueries.updateWalletBalance, [-totalBudget, 0.00, wallet.id]);

      // 3. Create Campaign
      const campaignRes = await client.query(campaignQueries.insertCampaign, [
        advertiserId,
        name,
        totalBudget,
        parseFloat(dailyBudget),
        'active', // Start active by default
        new Date(startDate),
        new Date(endDate),
        JSON.stringify(targetAudience)
      ]);

      const campaign = campaignRes.rows[0];

      // 4. Create Campaign Ads
      const ads = [];
      for (const adData of adsList) {
        const adRes = await client.query(campaignQueries.insertAd, [
          campaign.id,
          adData.title,
          adData.description || null,
          adData.adType, // image, video, rewarded_video, banner, carousel, native, sponsored_post
          adData.mediaUrls,
          adData.actionUrl || null,
          adData.durationSeconds || 15,
          adData.rewardAmount,
          adData.costPerView,
          adData.costPerClick,
          'active'
        ]);
        ads.push(adRes.rows[0]);
      }

      // 5. Create Ledger Transaction
      await client.query(walletQueries.insertTransaction, [
        wallet.id,
        -totalBudget,
        'campaign_payment',
        `Campaign '${name}' budget locked`,
        'completed',
        campaign.id
      ]);

      return {
        campaign,
        ads
      };
    });
  }

  /**
   * Fetch eligible ads targeting the current user
   */
  static async getEligibleAds(userId, ipCountry, userDevice) {
    const res = await db.query(campaignQueries.getEligibleAdsForUser, [
      ipCountry || 'US',
      userDevice || 'mobile',
      userId
    ]);
    return res.rows;
  }

  /**
   * Log an ad event: impression, view, click
   */
  static async recordAdEvent(adId, userId, eventType, deviceDetails = {}) {
    return await db.transaction(async (client) => {
      // 1. Get Ad & Campaign information
      const adRes = await client.query(campaignQueries.findAdById, [adId]);
      if (adRes.rowCount === 0) {
        const err = new Error('Ad not found');
        err.statusCode = 404;
        throw err;
      }

      const ad = adRes.rows[0];
      if (ad.campaign_status !== 'active') {
        const err = new Error('Campaign is not active');
        err.statusCode = 400;
        throw err;
      }

      // Ensure user hasn't already done this in last 24h (views frequency rule)
      if (userId && eventType === 'view') {
        const checkRes = await client.query(
          "SELECT id FROM ad_events WHERE user_id = $1 AND ad_id = $2 AND event_type = 'view' AND created_at >= NOW() - INTERVAL '24 hours'",
          [userId, adId]
        );
        if (checkRes.rowCount > 0) {
          const err = new Error('Ad reward limit reached for today');
          err.statusCode = 400;
          throw err;
        }
      }

      const costAmount = eventType === 'view' ? parseFloat(ad.cost_per_view) : eventType === 'click' ? parseFloat(ad.cost_per_click) : 0.00;
      const rewardAmount = eventType === 'view' ? parseFloat(ad.reward_amount) : 0.00;

      // 2. Insert event record
      const eventRes = await client.query(campaignQueries.insertAdEvent, [
        adId,
        userId || null,
        eventType,
        deviceDetails.ipAddress || 'unknown',
        deviceDetails.userAgent || 'unknown',
        deviceDetails.deviceType || 'mobile',
        deviceDetails.country || 'US',
        rewardAmount,
        costAmount
      ]);

      // 3. Update Campaign Spent stats
      if (costAmount > 0) {
        const campaignUpdate = await client.query(campaignQueries.updateCampaignSpent, [costAmount, ad.campaign_id]);
        const { spent, daily_spent, budget, daily_budget } = campaignUpdate.rows[0];

        // Check budget limits to auto-pause
        if (parseFloat(spent) >= parseFloat(budget) || parseFloat(daily_spent) >= parseFloat(daily_budget)) {
          await client.query(campaignQueries.updateCampaignStatus, ['completed', ad.campaign_id]);
        }
      }

      // 4. Update Daily Campaign Stats
      const today = new Date().toISOString().split('T')[0];
      await client.query(campaignQueries.upsertCampaignStats, [
        ad.campaign_id,
        today,
        eventType === 'impression' ? 1 : 0,
        eventType === 'view' ? 1 : 0,
        eventType === 'click' ? 1 : 0,
        costAmount,
        0 // conversions placeholder
      ]);

      // 5. User rewards allocation
      if (userId && eventType === 'view' && rewardAmount > 0) {
        const userWalletRes = await client.query(walletQueries.findWalletByUserId, [userId]);
        const userWallet = userWalletRes.rows[0];

        // Update User wallet
        await client.query(walletQueries.updateWalletBalance, [rewardAmount, 0.00, userWallet.id]);

        // Insert User wallet ledger
        await client.query(walletQueries.insertTransaction, [
          userWallet.id,
          rewardAmount,
          'reward',
          `Rewarded view for ad: ${ad.title}`,
          'completed',
          ad.id
        ]);

        // Check referral milestones
        await this.checkReferralPayout(userId, client);

        // Check Achievements
        await UserService.checkAndTriggerAchievements(userId, client);
      }

      return eventRes.rows[0];
    });
  }

  /**
   * Helper to credit Referrers when a referred user watches 5 ads
   */
  static async checkReferralPayout(refereeId, client) {
    // Check if referee is active in a pending referral schema
    const refRes = await client.query('SELECT * FROM referrals WHERE referee_id = $1 AND status = \'pending\'', [refereeId]);
    if (refRes.rowCount === 0) return;

    const referral = refRes.rows[0];

    // Check referee watch count
    const watchCountRes = await client.query(
      'SELECT COUNT(*) FROM ad_events WHERE user_id = $1 AND event_type = \'view\'',
      [refereeId]
    );
    const watchCount = parseInt(watchCountRes.rows[0].count);

    // Fetch system configurations
    const systemRes = await client.query('SELECT value FROM system_settings WHERE key = \'referrals\'');
    const config = systemRes.rows[0].value;

    if (watchCount >= config.required_views_for_payout) {
      // 1. Credit Referrer Wallet
      const referrerWalletRes = await client.query(walletQueries.findWalletByUserId, [referral.referrer_id]);
      const referrerWallet = referrerWalletRes.rows[0];
      await client.query(walletQueries.updateWalletBalance, [config.referrer_reward, 0.00, referrerWallet.id]);

      // Log referrer wallet ledger
      await client.query(walletQueries.insertTransaction, [
        referrerWallet.id,
        config.referrer_reward,
        'referral_bonus',
        `Referral bonus reward for inviting user`,
        'completed',
        refereeId
      ]);

      // Notify Referrer
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'reward')`,
        [referral.referrer_id, 'Referral Bonus Received!', `Your friend signed up and viewed their first ${config.required_views_for_payout} ads. You earned $${config.referrer_reward}!`]
      );

      // 2. Credit Referee Wallet
      const refereeWalletRes = await client.query(walletQueries.findWalletByUserId, [refereeId]);
      const refereeWallet = refereeWalletRes.rows[0];
      await client.query(walletQueries.updateWalletBalance, [config.referee_reward, 0.00, refereeWallet.id]);

      // Log referee ledger
      await client.query(walletQueries.insertTransaction, [
        refereeWallet.id,
        config.referee_reward,
        'referral_bonus',
        `Referred sign up bonus reward`,
        'completed',
        referral.referrer_id
      ]);

      // Notify Referee
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'reward')`,
        [refereeId, 'Referral Bonus Unlocked!', `You earned a sign up reward of $${config.referee_reward} for joining through a friend's code.`]
      );

      // 3. Update referral record to active
      await client.query(userQueries.updateReferralStatus, [config.referrer_reward, refereeId]);
    }
  }
}

module.exports = CampaignService;
