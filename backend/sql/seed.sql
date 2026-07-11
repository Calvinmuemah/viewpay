-- Seed script for ViewPay database

-- Insert roles
INSERT INTO roles (id, name, description) VALUES
(1, 'super_admin', 'Administrator with full access to the system'),
(2, 'support_agent', 'Agent with permissions to view audits and resolve tickets')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- Insert permissions
INSERT INTO permissions (name, description) VALUES
('manage_users', 'Can view, suspend, and edit users'),
('manage_advertisers', 'Can view and approve advertisers'),
('manage_campaigns', 'Can view and moderate campaigns and advertisements'),
('manage_payments', 'Can process advertiser deposits and verify invoice status'),
('manage_withdrawals', 'Can approve or reject withdrawal requests'),
('view_analytics', 'Can access dashboard and financial reports'),
('manage_system_settings', 'Can update platform fees and pricing ratios'),
('resolve_support_tickets', 'Can respond to and close support tickets')
ON CONFLICT (name) DO NOTHING;

-- Insert role permissions for super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- Insert admin user (password: Admin@PayView2026 hashed with bcrypt)
INSERT INTO admin_users (username, email, password_hash, role_id) VALUES
('admin', 'admin@viewpay.com', '$2b$10$7Z25Xk.56WJq3W9l0Qf1pOf/E4uUeH9H1U7V0Kq79yH1uS.b79nUq', 1) -- bcrypt password hash for 'Admin@PayView2026'
ON CONFLICT (username) DO NOTHING;

-- Seed system settings
INSERT INTO system_settings (key, value) VALUES
('pricing', '{
    "cost_per_view": 0.05,
    "cost_per_click": 0.10,
    "reward_percentage": 60.00,
    "platform_commission": 40.00,
    "min_withdrawal_limit": 10.00,
    "withdrawal_fee_percent": 2.5
}'::jsonb),
('referrals', '{
    "referrer_reward": 0.50,
    "referee_reward": 0.20,
    "required_views_for_payout": 5
}'::jsonb),
('gamification', '{
    "daily_rewards": [0.01, 0.02, 0.03, 0.04, 0.05, 0.08, 0.15],
    "spin_rewards": [
        {"type": "cash", "value": 0.01, "chance": 40},
        {"type": "cash", "value": 0.05, "chance": 30},
        {"type": "cash", "value": 0.10, "chance": 15},
        {"type": "cash", "value": 0.25, "chance": 10},
        {"type": "cash", "value": 1.00, "chance": 4},
        {"type": "cash", "value": 5.00, "chance": 1}
    ]
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed Achievements
INSERT INTO achievements (title, description, criteria_type, criteria_value, reward_amount) VALUES
('First Steps', 'Watch your first advertisement', 'watch_ads_count', 1, 0.05),
('Dedicated Watcher', 'Watch 100 advertisements', 'watch_ads_count', 100, 1.00),
('Super Earner', 'Accumulate $5.00 in rewards', 'earnings_milestone', 5, 0.50),
('Loyal User', 'Claim daily rewards for 7 consecutive days', 'consecutive_days', 7, 0.20)
ON CONFLICT (title) DO NOTHING;

-- Seed FAQs
INSERT INTO faqs (question, answer, category) VALUES
('What is ViewPay?', 'ViewPay is a rewarded advertising platform where you can earn real money by watching short advertisements and sponsored posts.', 'General'),
('How do I claim my rewards?', 'Once you finish watching an ad, the reward will automatically be credited to your wallet balance. You can view your transactions inside the Wallet tab.', 'Rewards'),
('What is the minimum withdrawal limit?', 'The minimum withdrawal limit is $10.00. Once you reach this, you can request a payout via M-Pesa, Bank Transfer, or PayPal.', 'Withdrawals'),
('How long does it take for withdrawals to process?', 'Withdrawals are typically reviewed and processed by our admin panel within 24 to 48 hours.', 'Withdrawals'),
('How does the referral program work?', 'Invite your friends using your referral code. Once they sign up and watch their first 5 ads, you will receive $0.50 and your friend will receive $0.20!', 'Referrals'),
('What is KYC verification?', 'KYC (Know Your Customer) requires uploading a national ID or Passport. We require KYC verification before processing withdrawals to prevent fraud.', 'Verification')
ON CONFLICT (id) DO NOTHING;
