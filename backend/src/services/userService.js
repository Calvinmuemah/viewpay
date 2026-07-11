const db = require('../config/db');
const userQueries = require('../queries/userQueries');
const walletQueries = require('../queries/walletQueries');

class UserService {
  /**
   * Get user profile details including wallet balances
   */
  static async getUserProfile(userId) {
    const userRes = await db.query(userQueries.findUserById, [userId]);
    if (userRes.rowCount === 0) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const user = userRes.rows[0];
    const walletRes = await db.query(walletQueries.findWalletByUserId, [userId]);
    const wallet = walletRes.rows[0] || { balance: 0.0, pending_balance: 0.0 };

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      kycStatus: user.kyc_status,
      referralCode: user.referral_code,
      status: user.status,
      createdAt: user.created_at,
      balance: parseFloat(wallet.balance),
      pendingEarnings: parseFloat(wallet.pending_balance)
    };
  }

  /**
   * Submit KYC verification files
   */
  static async submitKyc(userId, documentType, documentNumber, documentFrontUrl, documentBackUrl) {
    return await db.transaction(async (client) => {
      // Update User Kyc Status to pending
      await client.query(userQueries.updateUserKycStatus, ['pending', userId]);

      // Insert KYC document records
      const kycRes = await client.query(userQueries.insertKycVerification, [
        userId,
        documentType,
        documentNumber,
        documentFrontUrl,
        documentBackUrl || null
      ]);

      return kycRes.rows[0];
    });
  }

  /**
   * Get Daily reward configuration and user checkin status
   */
  static async getDailyRewardsStatus(userId) {
    // Fetch daily checkin settings
    const systemRes = await db.query("SELECT value FROM system_settings WHERE key = 'gamification'");
    const config = systemRes.rows[0].value.daily_rewards;

    // Check if user claimed today
    const claimedTodayRes = await db.query(userQueries.getDailyRewardClaimedToday, [userId]);
    const isClaimedToday = claimedTodayRes.rowCount > 0;

    // Determine current streak day
    const lastClaimRes = await db.query(userQueries.getLastClaimedDay, [userId]);
    let currentStreakDay = 0;

    if (lastClaimRes.rowCount > 0) {
      const lastClaimDate = new Date(lastClaimRes.rows[0].claimed_at).toDateString();
      const todayDate = new Date().toDateString();
      const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      if (lastClaimDate === todayDate) {
        currentStreakDay = lastClaimRes.rows[0].day_number;
      } else if (lastClaimDate === yesterdayDate) {
        // Increment streak day (wrap around to 1 if day was 7)
        currentStreakDay = (lastClaimRes.rows[0].day_number % 7);
      } else {
        // Streak broken
        currentStreakDay = 0;
      }
    }

    return {
      dailyPayouts: config,
      claimedToday: isClaimedToday,
      currentStreakDay,
      nextRewardAmount: config[currentStreakDay] || config[0]
    };
  }

  /**
   * Claim Daily Check-In reward
   */
  static async claimDailyReward(userId) {
    const status = await this.getDailyRewardsStatus(userId);
    if (status.claimedToday) {
      const err = new Error('Daily check-in reward already claimed for today');
      err.statusCode = 400;
      throw err;
    }

    const nextDay = (status.currentStreakDay % 7) + 1;
    const rewardAmount = status.nextRewardAmount;

    return await db.transaction(async (client) => {
      // Insert log
      const logRes = await client.query(userQueries.insertDailyRewardLog, [userId, nextDay, rewardAmount]);

      // Update User balance and pending earnings
      const walletRes = await client.query(walletQueries.findWalletByUserId, [userId]);
      const wallet = walletRes.rows[0];

      await client.query(walletQueries.updateWalletBalance, [rewardAmount, 0.00, wallet.id]);

      // Create transaction log
      await client.query(walletQueries.insertTransaction, [
        wallet.id,
        rewardAmount,
        'daily_checkin',
        `Daily check-in reward Day ${nextDay}`,
        'completed',
        null
      ]);

      // Trigger achievement check
      await this.checkAndTriggerAchievements(userId, client);

      return logRes.rows[0];
    });
  }

  /**
   * Claim Spin Wheel Reward
   */
  static async claimSpinReward(userId) {
    // Check if user has spin chances - limit to once every 12 hours or just simple daily spin limit
    const lastSpinRes = await db.query(
      "SELECT claimed_at FROM spin_rewards_logs WHERE user_id = $1 AND claimed_at >= NOW() - INTERVAL '12 hours'",
      [userId]
    );

    if (lastSpinRes.rowCount > 0) {
      const err = new Error('You can only spin the wheel once every 12 hours');
      err.statusCode = 400;
      throw err;
    }

    const gamificationRes = await db.query("SELECT value FROM system_settings WHERE key = 'gamification'");
    const prizes = gamificationRes.rows[0].value.spin_rewards;

    // Pick a random reward based on probability chance weight
    const totalChance = prizes.reduce((acc, p) => acc + p.chance, 0);
    let rand = Math.floor(Math.random() * totalChance);
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      if (rand < prize.chance) {
        selectedPrize = prize;
        break;
      }
      rand -= prize.chance;
    }

    return await db.transaction(async (client) => {
      // Save spin reward log
      const spinRes = await client.query(userQueries.insertSpinRewardLog, [
        userId,
        selectedPrize.type,
        selectedPrize.value
      ]);

      // Credit wallet
      const walletRes = await client.query(walletQueries.findWalletByUserId, [userId]);
      const wallet = walletRes.rows[0];

      await client.query(walletQueries.updateWalletBalance, [selectedPrize.value, 0.00, wallet.id]);

      // Insert transaction record
      await client.query(walletQueries.insertTransaction, [
        wallet.id,
        selectedPrize.value,
        'spin_reward',
        'Lucky Spin Wheel prize reward',
        'completed',
        null
      ]);

      return {
        id: spinRes.rows[0].id,
        prizeType: selectedPrize.type,
        prizeValue: selectedPrize.value,
        claimedAt: spinRes.rows[0].claimed_at
      };
    });
  }

  /**
   * Get User Dashboard Analytics Summary
   */
  static async getDashboardSummary(userId) {
    const summaryRes = await db.query('SELECT * FROM view_user_dashboard_summary WHERE user_id = $1', [userId]);
    if (summaryRes.rowCount === 0) {
      const err = new Error('Dashboard summary not found');
      err.statusCode = 404;
      throw err;
    }
    return summaryRes.rows[0];
  }

  /**
   * Get Leaderboard of Top Earners
   */
  static async getLeaderboard() {
    const res = await db.query(userQueries.getLeaderboard);
    return res.rows;
  }

  /**
   * Get user achievements and progress on unearned ones
   */
  static async getAchievements(userId) {
    const earned = await db.query(userQueries.getUserAchievements, [userId]);
    const unearned = await db.query(userQueries.getUnearnedAchievements, [userId]);

    return {
      earned: earned.rows,
      unearned: unearned.rows
    };
  }

  /**
   * Helper to verify if user has qualified for any new achievements
   */
  static async checkAndTriggerAchievements(userId, client = db) {
    // 1. Fetch total ads watched by user
    const statsRes = await client.query(
      "SELECT COUNT(*) FROM ad_events WHERE user_id = $1 AND event_type = 'view'",
      [userId]
    );
    const adsWatched = parseInt(statsRes.rows[0].count);

    // 2. Fetch user wallet balance
    const walletRes = await client.query(walletQueries.findWalletByUserId, [userId]);
    const balance = parseFloat(walletRes.rows[0].balance);

    // 3. Fetch consecutive daily logins count
    const consecutiveRes = await client.query(
      "SELECT COUNT(DISTINCT day_number) FROM daily_rewards_logs WHERE user_id = $1 AND claimed_at >= NOW() - INTERVAL '7 days'",
      [userId]
    );
    const consecutiveCheckins = parseInt(consecutiveRes.rows[0].count);

    // Get unearned achievements
    const unearnedRes = await client.query(userQueries.getUnearnedAchievements, [userId]);

    for (const ach of unearnedRes.rows) {
      let qualified = false;
      if (ach.criteria_type === 'watch_ads_count' && adsWatched >= ach.criteria_value) {
        qualified = true;
      } else if (ach.criteria_type === 'earnings_milestone' && balance >= ach.criteria_value) {
        qualified = true;
      } else if (ach.criteria_type === 'consecutive_days' && consecutiveCheckins >= ach.criteria_value) {
        qualified = true;
      }

      if (qualified) {
        // Unlock achievement
        await client.query(userQueries.insertUserAchievement, [userId, ach.id]);

        // Credit achievement reward
        const wallet = walletRes.rows[0];
        await client.query(walletQueries.updateWalletBalance, [ach.reward_amount, 0.00, wallet.id]);

        // Transaction log
        await client.query(walletQueries.insertTransaction, [
          wallet.id,
          ach.reward_amount,
          'reward',
          `Achievement Unlocked: ${ach.title}`,
          'completed',
          null
        ]);

        // Create alert notification
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'reward')`,
          [userId, 'Achievement Unlocked!', `Congratulations! You unlocked the '${ach.title}' achievement and earned $${ach.reward_amount}.`]
        );
      }
    }
  }
}

module.exports = UserService;
