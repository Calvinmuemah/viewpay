module.exports = {
  findUserByEmail: `
    SELECT * FROM users WHERE email = $1
  `,

  findUserById: `
    SELECT id, name, email, is_verified, kyc_status, balance, pending_earnings, referral_code, referred_by_id, status, failed_login_attempts, locked_until, created_at 
    FROM users 
    WHERE id = $1
  `,

  findUserByReferralCode: `
    SELECT id, name FROM users WHERE referral_code = $1
  `,

  insertUser: `
    INSERT INTO users (name, email, password_hash, referral_code, referred_by_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, referral_code, created_at
  `,

  verifyUserEmail: `
    UPDATE users SET is_verified = TRUE WHERE email = $1 RETURNING id, is_verified
  `,

  updateFailedAttempts: `
    UPDATE users 
    SET failed_login_attempts = $1, locked_until = $2 
    WHERE id = $3
  `,

  resetFailedAttempts: `
    UPDATE users 
    SET failed_login_attempts = 0, locked_until = NULL 
    WHERE id = $1
  `,

  updateUserPassword: `
    UPDATE users SET password_hash = $1 WHERE email = $2
  `,

  updateUserBalance: `
    UPDATE users 
    SET balance = balance + $1, pending_earnings = pending_earnings + $2 
    WHERE id = $3
    RETURNING balance, pending_earnings
  `,

  insertKycVerification: `
    INSERT INTO kyc_verifications (user_id, document_type, document_number, document_front_url, document_back_url, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING id, status, created_at
  `,

  updateUserKycStatus: `
    UPDATE users SET kyc_status = $1 WHERE id = $2
  `,

  getKycByUser: `
    SELECT * FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
  `,

  getDailyRewardClaimedToday: `
    SELECT * FROM daily_rewards_logs 
    WHERE user_id = $1 AND claimed_at >= CURRENT_DATE
  `,

  getLastClaimedDay: `
    SELECT day_number, claimed_at FROM daily_rewards_logs 
    WHERE user_id = $1 
    ORDER BY claimed_at DESC LIMIT 1
  `,

  insertDailyRewardLog: `
    INSERT INTO daily_rewards_logs (user_id, day_number, reward_amount)
    VALUES ($1, $2, $3)
    RETURNING id, day_number, reward_amount, claimed_at
  `,

  insertSpinRewardLog: `
    INSERT INTO spin_rewards_logs (user_id, reward_type, reward_value)
    VALUES ($1, $2, $3)
    RETURNING id, reward_type, reward_value, claimed_at
  `,

  insertReferralRecord: `
    INSERT INTO referrals (referrer_id, referee_id, reward_earned, status)
    VALUES ($1, $2, $3, 'pending')
    RETURNING id
  `,

  updateReferralStatus: `
    UPDATE referrals 
    SET status = 'active', reward_earned = $1 
    WHERE referee_id = $2 AND status = 'pending'
    RETURNING id, referrer_id, referee_id
  `,

  getLeaderboard: `
    SELECT id, name, balance, 
      (SELECT COUNT(*) FROM ad_events WHERE user_id = users.id AND event_type = 'view') as total_views
    FROM users 
    WHERE status = 'active'
    ORDER BY balance DESC 
    LIMIT 20
  `,

  getUserAchievements: `
    SELECT a.id, a.title, a.description, a.reward_amount, ua.unlocked_at
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = $1
    ORDER BY ua.unlocked_at DESC
  `,

  getUnearnedAchievements: `
    SELECT a.id, a.title, a.description, a.criteria_type, a.criteria_value, a.reward_amount
    FROM achievements a
    WHERE a.id NOT IN (
      SELECT achievement_id FROM user_achievements WHERE user_id = $1
    )
  `,

  insertUserAchievement: `
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, achievement_id) DO NOTHING
  `
};
