-- ViewPay Database Schema
-- Database: PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(20) DEFAULT 'unsubmitted', -- unsubmitted, pending, approved, rejected
    balance NUMERIC(15, 4) DEFAULT 0.0000,
    pending_earnings NUMERIC(15, 4) DEFAULT 0.0000,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referred_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_token TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, locked
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Advertisers Table
CREATE TABLE IF NOT EXISTS advertisers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, locked
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    advertiser_id UUID UNIQUE REFERENCES advertisers(id) ON DELETE CASCADE,
    balance NUMERIC(15, 4) DEFAULT 0.0000,
    pending_balance NUMERIC(15, 4) DEFAULT 0.0000,
    currency VARCHAR(3) DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wallet_owner CHECK (
        (user_id IS NOT NULL AND advertiser_id IS NULL) OR 
        (user_id IS NULL AND advertiser_id IS NOT NULL)
    )
);

-- 8. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    budget NUMERIC(15, 2) NOT NULL,
    daily_budget NUMERIC(15, 2) NOT NULL,
    spent NUMERIC(15, 2) DEFAULT 0.00,
    daily_spent NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, paused, completed, rejected
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    target_audience JSONB DEFAULT '{}'::jsonb, -- {countries: ['KE', 'US'], age_range: [18, 45], genders: ['M', 'F']}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Ads Table
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    ad_type VARCHAR(20) NOT NULL, -- image, video, rewarded_video, banner, carousel, native, sponsored_post
    media_urls TEXT[] NOT NULL, -- URLs for images, videos or carousel slides
    action_url TEXT, -- website to visit when clicked
    duration_seconds INT DEFAULT 15,
    reward_amount NUMERIC(15, 4) DEFAULT 0.0000,
    cost_per_view NUMERIC(15, 4) DEFAULT 0.0000,
    cost_per_click NUMERIC(15, 4) DEFAULT 0.0000,
    status VARCHAR(20) DEFAULT 'active', -- active, paused, archieved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Deposits Table
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- mpesa, stripe, paypal, manual
    transaction_reference VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
    deposit_id UUID REFERENCES deposits(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL,
    tax NUMERIC(15, 2) NOT NULL,
    total NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'paid', -- paid, void, unpaid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Withdrawals Table
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 4) NOT NULL,
    fee NUMERIC(15, 4) DEFAULT 0.0000,
    net_amount NUMERIC(15, 4) NOT NULL,
    payment_method VARCHAR(20) NOT NULL, -- mpesa, bank, paypal
    payment_details JSONB NOT NULL, -- {bank_account: '...', phone_number: '...', paypal_email: '...'}
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, completed
    admin_notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC(15, 4) NOT NULL, -- positive for credit, negative for debit
    tx_type VARCHAR(30) NOT NULL, -- deposit, reward, withdrawal, refund, fee, referral_bonus, daily_checkin, spin_reward, campaign_payment
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed
    reference_id UUID, -- References deposits(id), withdrawals(id), ads(id) etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL, -- verify_email, reset_password
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Sessions & Device Tracking
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_session_owner CHECK (
        (user_id IS NOT NULL AND advertiser_id IS NULL) OR 
        (user_id IS NULL AND advertiser_id IS NOT NULL)
    )
);

-- 16. Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referee_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    reward_earned NUMERIC(15, 4) DEFAULT 0.0000,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active (after user watches 1st ad)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    criteria_type VARCHAR(30) NOT NULL, -- watch_ads_count, earnings_milestone, consecutive_days
    criteria_value INT NOT NULL,
    reward_amount NUMERIC(15, 4) DEFAULT 0.0000
);

-- 18. User Achievements Table
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INT REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id)
);

-- 19. Daily Rewards Log
CREATE TABLE IF NOT EXISTS daily_rewards_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_number INT NOT NULL, -- 1 to 7
    reward_amount NUMERIC(15, 4) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Spin Rewards Log
CREATE TABLE IF NOT EXISTS spin_rewards_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reward_type VARCHAR(20) NOT NULL, -- currency, points, ticket
    reward_value NUMERIC(15, 4) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 21. Ad Events (Analytics)
CREATE TABLE IF NOT EXISTS ad_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(20) NOT NULL, -- impression, view, click
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_type VARCHAR(20), -- mobile, tablet, desktop, unknown
    country VARCHAR(3), -- ISO country code (e.g. KE, US)
    reward_amount NUMERIC(15, 4) DEFAULT 0.0000,
    cost_amount NUMERIC(15, 4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. Campaign Statistics (Daily Aggregations)
CREATE TABLE IF NOT EXISTS campaign_statistics (
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INT DEFAULT 0,
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    spent NUMERIC(15, 2) DEFAULT 0.00,
    conversions INT DEFAULT 0,
    PRIMARY KEY (campaign_id, date)
);

-- 23. KYC Verifications Table
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL, -- national_id, passport, driving_license
    document_number VARCHAR(50) NOT NULL,
    document_front_url TEXT NOT NULL,
    document_back_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 24. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    advertiser_id UUID REFERENCES advertisers(id) ON DELETE SET NULL,
    subject VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, pending_user, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 25. Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- user, advertiser, admin
    sender_id UUID NOT NULL, -- User, Advertiser, or Admin ID
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 26. FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 27. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    performer_id UUID NOT NULL,
    performer_type VARCHAR(20) NOT NULL, -- user, advertiser, admin
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 28. System Settings / Pricing Configuration
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 29. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL, -- info, reward, withdrawal, campaign, alert
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_notification_owner CHECK (
        (user_id IS NOT NULL AND advertiser_id IS NULL) OR 
        (user_id IS NULL AND advertiser_id IS NOT NULL) OR
        (user_id IS NULL AND advertiser_id IS NULL) -- Global notifications
    )
);

-- 30. Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00, -- for advertisers deposit or campaign creation
    bonus_amount NUMERIC(15, 4) DEFAULT 0.0000, -- for user reward
    type VARCHAR(20) NOT NULL, -- user_bonus, advertiser_discount
    max_uses INT DEFAULT 1,
    used_count INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 31. User Promo Uses Table
CREATE TABLE IF NOT EXISTS user_promo_uses (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    promo_id INT REFERENCES promo_codes(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, promo_id)
);


-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_advertisers_email ON advertisers(email);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ads_campaign ON ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON ad_events(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_user ON ad_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_type_created ON ad_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_deposits_advertiser ON deposits(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaign_statistics_campaign_date ON campaign_statistics(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);


-- VIEWS FOR CONVENIENCE & ANALYTICS

-- 1. View to display overall campaign performance details
CREATE OR REPLACE VIEW view_campaign_performance AS
SELECT 
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.advertiser_id,
    c.budget,
    c.daily_budget,
    c.spent,
    c.status AS campaign_status,
    COALESCE(SUM(s.impressions), 0) AS total_impressions,
    COALESCE(SUM(s.views), 0) AS total_views,
    COALESCE(SUM(s.clicks), 0) AS total_clicks,
    COALESCE(SUM(s.spent), 0) AS total_spent_calculated,
    COALESCE(SUM(s.conversions), 0) AS total_conversions,
    CASE 
        WHEN COALESCE(SUM(s.impressions), 0) = 0 THEN 0.00
        ELSE ROUND((COALESCE(SUM(s.clicks), 0)::NUMERIC / COALESCE(SUM(s.impressions), 0)) * 100, 2)
    END AS ctr
FROM campaigns c
LEFT JOIN campaign_statistics s ON c.id = s.campaign_id
GROUP BY c.id, c.name, c.advertiser_id, c.budget, c.daily_budget, c.spent, c.status;

-- 2. View to display user summary for dashboard
CREATE OR REPLACE VIEW view_user_dashboard_summary AS
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    u.balance,
    u.pending_earnings,
    (SELECT COUNT(*) FROM ad_events e WHERE e.user_id = u.id AND e.event_type = 'view') AS total_ads_watched,
    (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions t WHERE t.wallet_id = w.id AND t.tx_type = 'referral_bonus') AS referral_earnings,
    (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions t WHERE t.wallet_id = w.id AND t.tx_type = 'daily_checkin') AS daily_checkin_earnings,
    (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions t WHERE t.wallet_id = w.id AND t.tx_type = 'spin_reward') AS spin_reward_earnings,
    u.created_at
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id;
