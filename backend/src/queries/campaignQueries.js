module.exports = {
  insertCampaign: `
    INSERT INTO campaigns (advertiser_id, name, budget, daily_budget, status, start_date, end_date, target_audience)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, name, budget, daily_budget, status, start_date, end_date, target_audience, created_at
  `,

  findCampaignById: `
    SELECT * FROM campaigns WHERE id = $1
  `,

  updateCampaignStatus: `
    UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *
  `,

  updateCampaignSpent: `
    UPDATE campaigns 
    SET spent = spent + $1, daily_spent = daily_spent + $1 
    WHERE id = $2 
    RETURNING spent, daily_spent, budget, daily_budget
  `,

  resetDailyCampaignSpent: `
    UPDATE campaigns SET daily_spent = 0.00
  `,

  insertAd: `
    INSERT INTO ads (campaign_id, title, description, ad_type, media_urls, action_url, duration_seconds, reward_amount, cost_per_view, cost_per_click, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, campaign_id, title, description, ad_type, media_urls, action_url, duration_seconds, reward_amount, cost_per_view, cost_per_click, status, created_at
  `,

  findAdById: `
    SELECT a.*, c.advertiser_id, c.status as campaign_status
    FROM ads a
    JOIN campaigns c ON a.campaign_id = c.id
    WHERE a.id = $1
  `,

  getAdsByCampaignId: `
    SELECT * FROM ads WHERE campaign_id = $1 ORDER BY created_at DESC
  `,

  // Complex query to get eligible ads for a user based on targeting (country, device)
  // and ensuring campaign is active, budgets are not exhausted
  getEligibleAdsForUser: `
    SELECT a.* 
    FROM ads a
    JOIN campaigns c ON a.campaign_id = c.id
    WHERE c.status = 'active'
      AND a.status = 'active'
      AND c.spent < c.budget
      AND c.daily_spent < c.daily_budget
      AND c.start_date <= CURRENT_TIMESTAMP
      AND c.end_date >= CURRENT_TIMESTAMP
      -- Targeting filters (if defined, check if user's country is within allowed list)
      AND (
        c.target_audience->'countries' IS NULL 
        OR c.target_audience->'countries' = '[]'::jsonb
        OR c.target_audience->'countries' ? $1
      )
      AND (
        c.target_audience->'devices' IS NULL 
        OR c.target_audience->'devices' = '[]'::jsonb
        OR c.target_audience->'devices' ? $2
      )
      -- Exclude ads this user has already watched in the last 24 hours (limit frequency)
      AND a.id NOT IN (
        SELECT ad_id 
        FROM ad_events 
        WHERE user_id = $3 
          AND event_type = 'view' 
          AND created_at >= NOW() - INTERVAL '24 hours'
      )
    ORDER BY a.reward_amount DESC
  `,

  insertAdEvent: `
    INSERT INTO ad_events (ad_id, user_id, event_type, ip_address, user_agent, device_type, country, reward_amount, cost_amount)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, created_at
  `,

  upsertCampaignStats: `
    INSERT INTO campaign_statistics (campaign_id, date, impressions, views, clicks, spent, conversions)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (campaign_id, date) DO UPDATE SET
      impressions = campaign_statistics.impressions + EXCLUDED.impressions,
      views = campaign_statistics.views + EXCLUDED.views,
      clicks = campaign_statistics.clicks + EXCLUDED.clicks,
      spent = campaign_statistics.spent + EXCLUDED.spent,
      conversions = campaign_statistics.conversions + EXCLUDED.conversions
  `,

  getCampaignDailyStats: `
    SELECT date, impressions, views, clicks, spent, conversions
    FROM campaign_statistics
    WHERE campaign_id = $1
    ORDER BY date ASC
  `,

  getAdvertiserPerformanceDashboard: `
    SELECT 
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(views), 0) as views,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(spent), 0) as spent
    FROM campaign_statistics s
    JOIN campaigns c ON s.campaign_id = c.id
    WHERE c.advertiser_id = $1
  `
};
