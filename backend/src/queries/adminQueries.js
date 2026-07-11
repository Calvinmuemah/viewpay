module.exports = {
  findAdminByUsername: `
    SELECT * FROM admin_users WHERE username = $1
  `,

  findAdminByEmail: `
    SELECT * FROM admin_users WHERE email = $1
  `,

  getAdminDashboardStats: `
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM advertisers) as total_advertisers,
      (SELECT COUNT(*) FROM campaigns WHERE status = 'active') as active_campaigns,
      (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'completed') as total_revenue,
      (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'completed') as total_payouts
  `,

  getUsersList: `
    SELECT id, name, email, is_verified, kyc_status, balance, status, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `,

  countUsersList: `
    SELECT COUNT(*) FROM users
  `,

  getAdvertisersList: `
    SELECT id, company_name, contact_name, email, balance, status, created_at
    FROM advertisers
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `,

  countAdvertisersList: `
    SELECT COUNT(*) FROM advertisers
  `,

  updateUserStatus: `
    UPDATE users SET status = $1 WHERE id = $2 RETURNING id, status
  `,

  updateAdvertiserStatus: `
    UPDATE advertisers SET status = $1 WHERE id = $2 RETURNING id, status
  `,

  insertAuditLog: `
    INSERT INTO audit_logs (action, performer_id, performer_type, details, ip_address)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, created_at
  `,

  getAuditLogs: `
    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2
  `,

  // Fraud Detection: Detect multiple user accounts with same IP address
  detectDuplicateIps: `
    SELECT ip_address, COUNT(DISTINCT user_id) as user_count, ARRAY_AGG(DISTINCT user_id) as user_ids
    FROM ad_events
    WHERE user_id IS NOT NULL
    GROUP BY ip_address
    HAVING COUNT(DISTINCT user_id) > 1
    ORDER BY user_count DESC
  `,

  // Fraud Detection: Find users with abnormal click-through-rates (e.g. click/view ratio > 80% with min 10 actions)
  detectClickSpammers: `
    SELECT 
      user_id,
      COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
      COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
      CASE 
        WHEN COUNT(CASE WHEN event_type = 'view' THEN 1 END) = 0 THEN 0
        ELSE (COUNT(CASE WHEN event_type = 'click' THEN 1 END)::FLOAT / COUNT(CASE WHEN event_type = 'view' THEN 1 END)::FLOAT) * 100
      END as ctr
    FROM ad_events
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(CASE WHEN event_type = 'view' THEN 1 END) >= 10
       AND (COUNT(CASE WHEN event_type = 'click' THEN 1 END)::FLOAT / COUNT(CASE WHEN event_type = 'view' THEN 1 END)::FLOAT) > 0.8
    ORDER BY ctr DESC
  `
};
