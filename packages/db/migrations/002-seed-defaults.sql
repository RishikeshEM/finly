-- FORBIDDEN_SCOPE_OVERRIDE: this seed file inserts default categories per database-spec §2.2's seeding spec ("Food, Transportation, Shopping, Healthcare, Entertainment, Education, Bills, Travel, Insurance, Rent, Utilities, Investments, Miscellaneous"), and default plan tiers (Free, Pro, Family); the "Investments" category is a data entry category for user transactions, not the Investment Tracking feature which is excluded from MVP
-- Migration 002: Seed Default Categories and Plans
-- Inserts system default categories (user_id=NULL) and subscription plans
-- These are shared across all users and cannot be deleted

-- Seed default categories (user_id=NULL for system defaults)
-- Per database-spec §2.2: Food, Transportation, Shopping, Healthcare, Entertainment, Education,
-- Bills, Travel, Insurance, Rent, Utilities, Investments, Miscellaneous
INSERT INTO categories (user_id, name, icon) VALUES
    (NULL, 'Food', '🍔'),
    (NULL, 'Transportation', '🚗'),
    (NULL, 'Shopping', '🛍️'),
    (NULL, 'Healthcare', '⚕️'),
    (NULL, 'Entertainment', '🎬'),
    (NULL, 'Education', '🎓'),
    (NULL, 'Bills', '📄'),
    (NULL, 'Travel', '✈️'),
    (NULL, 'Insurance', '🛡️'),
    (NULL, 'Rent', '🏠'),
    (NULL, 'Utilities', '💡'),
    (NULL, 'Investments', '📈'),
    (NULL, 'Miscellaneous', '📌')
ON CONFLICT DO NOTHING;

-- Seed subscription plans per database-spec §2.7
-- Free plan: no stripe_price_id (NULL)
-- Pro and Family: stripe_price_id set to placeholder (to be updated via environment or manual Stripe integration)
INSERT INTO plans (name, stripe_price_id, feature_flags) VALUES
    ('free', NULL, '{"max_accounts": 2, "reports_export": false, "shared_budgets": false, "advanced_analytics": false}'::jsonb),
    ('pro', 'price_pro_placeholder', '{"max_accounts": 10, "reports_export": true, "shared_budgets": false, "advanced_analytics": true}'::jsonb),
    ('family', 'price_family_placeholder', '{"max_accounts": 50, "reports_export": true, "shared_budgets": true, "advanced_analytics": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- Track migration execution
INSERT INTO schema_migrations (version) VALUES ('002-seed-defaults')
ON CONFLICT DO NOTHING;
