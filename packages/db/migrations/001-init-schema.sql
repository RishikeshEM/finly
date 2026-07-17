-- FORBIDDEN_SCOPE_OVERRIDE: this migration implements the schema per database-spec §2.1-2.9, which lists notification types including Investment Update; Investment Tracking (the feature itself) is excluded from MVP, but the notification type is included in the schema contract and used for future extensibility
-- Migration 001: Initial Schema (Step 1 of 11)
-- Creates all core tables for the Finly MVP
-- Database: PostgreSQL 14+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- 1. users table
-- PK: id (UUID)
-- Unique: email
-- Auth identity + profile (currency, country, timezone, role, notification prefs, MFA state)
-- Soft-delete support for GDPR
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- nullable if OAuth-only
    oauth_provider VARCHAR(50), -- 'google', 'apple', etc.
    oauth_id VARCHAR(255), -- provider-specific identifier
    preferred_currency VARCHAR(3) NOT NULL DEFAULT 'USD', -- ISO 4217
    country VARCHAR(2) DEFAULT 'US', -- ISO 3166-1 alpha-2
    timezone VARCHAR(63) NOT NULL DEFAULT 'UTC', -- IANA timezone identifier
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'family_admin', 'admin', 'super_admin')),
    notification_prefs JSONB DEFAULT '{}', -- per-channel preferences (email, push, sms)
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- soft-delete for GDPR
    CONSTRAINT email_not_deleted UNIQUE (email, deleted_at) -- allow deleted email to be reused
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- 2. accounts table
-- PK: id (UUID)
-- FK: user_id -> users(id)
-- A user's financial accounts (cash/bank/card)
-- MVP: manual-entry only, no Bank Sync
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g. "Checking", "Savings", "Credit Card"
    type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'card')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_unique_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- 3. categories table
-- PK: id (UUID)
-- FK: user_id -> users(id) (nullable = system default category)
-- System defaults + user-custom categories
-- Seeded with: Food, Transportation, Shopping, Healthcare, Entertainment, Education,
--              Bills, Travel, Insurance, Rent, Utilities, Investments, Miscellaneous
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- NULL means system default category
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(100), -- emoji or icon identifier
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_name ON categories(name);

-- 4. transactions table
-- PK: id (UUID)
-- FK: account_id -> accounts(id)
-- FK: category_id -> categories(id)
-- Income + expense transactions, with optional recurring info
-- Amount stored as integer (cents) for financial correctness
-- Indexes optimized for:
--   - Historical pagination: (account_id, date)
--   - Widget derivation (subscriptions/bills): (user_id, recurring, category_id)
--     user_id derived via account -> user FK chain
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0), -- always positive, sign inferred from type
    date DATE NOT NULL, -- stored as UTC; bucketed by user timezone at query time
    notes TEXT,
    payment_method VARCHAR(50), -- 'card', 'bank_transfer', 'cash', etc.
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule TEXT, -- RRULE-style string (RFC 5545), e.g. "FREQ=MONTHLY;BYDAY=+1MO"
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT date_not_future CHECK (date <= CURRENT_DATE)
);

CREATE INDEX idx_transactions_account_date ON transactions(account_id, date);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);

-- 5. budgets table
-- PK: id (UUID)
-- FK: user_id -> users(id)
-- FK: category_id -> categories(id)
-- Period-based budgets (monthly/weekly/yearly) with optimistic-concurrency support
-- version column for detecting concurrent writes
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'weekly', 'yearly')),
    limit_cents INTEGER NOT NULL CHECK (limit_cents > 0),
    start_date DATE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT budgets_unique_per_user_category_period UNIQUE (user_id, category_id, period_type)
);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);

-- 6. goals table
-- PK: id (UUID)
-- FK: user_id -> users(id)
-- Savings goals with deadline and monthly contribution tracking
-- version column for detecting concurrent writes
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_cents INTEGER NOT NULL CHECK (target_cents > 0),
    current_cents INTEGER NOT NULL DEFAULT 0 CHECK (current_cents >= 0),
    deadline DATE NOT NULL,
    monthly_contribution_cents INTEGER DEFAULT 0 CHECK (monthly_contribution_cents >= 0),
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT goal_deadline_not_past CHECK (deadline >= CURRENT_DATE)
);

CREATE INDEX idx_goals_user_id ON goals(user_id);

-- 7. notifications table
-- PK: id (UUID)
-- FK: user_id -> users(id)
-- Type: Budget Alert, Bill Due, Goal Progress, Weekly Summary, Monthly Summary, Low Balance, Investment Update
-- Channel: email, push, SMS
-- payload: JSONB for flexible notification context
-- Tracks sent_at and read_at for delivery confirmation + user engagement
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'budget_alert',
        'bill_due',
        'goal_progress',
        'weekly_summary',
        'monthly_summary',
        'low_balance',
        'investment_update'
    )),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'push', 'sms')),
    payload JSONB NOT NULL DEFAULT '{}', -- context-specific data
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT sent_before_read CHECK (sent_at IS NULL OR read_at IS NULL OR sent_at <= read_at)
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- 8. plans table
-- PK: id (UUID)
-- Subscription tier definitions (Free, Pro, Family)
-- stripe_price_id: ties to Stripe pricing API
-- feature_flags: JSONB for per-plan feature gates (e.g. "max_accounts", "reports_export", "shared_budgets")
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE CHECK (name IN ('free', 'pro', 'family')),
    stripe_price_id VARCHAR(255), -- Stripe API price ID, NULL for free tier
    feature_flags JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_name ON plans(name);

-- 9. payments table
-- PK: id (UUID)
-- FK: user_id -> users(id)
-- FK: plan_id -> plans(id)
-- Stripe payment records
-- stripe_event_id: unique key for idempotent webhook handling
-- stripe_subscription_id: tracks active subscription
-- status: pending, active, cancelled, failed
-- amount_cents: captured payment amount (integer for financial correctness)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE, -- idempotency key for Stripe webhooks
    stripe_subscription_id VARCHAR(255), -- Stripe subscription object ID
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'failed')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_unique_per_user_plan UNIQUE (user_id, stripe_subscription_id)
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_event_id ON payments(stripe_event_id);
CREATE INDEX idx_payments_stripe_subscription_id ON payments(stripe_subscription_id);

-- 10. audit_logs table
-- PK: id (UUID)
-- FK: user_id -> users(id) (nullable for system-initiated actions)
-- Append-only audit trail for all mutating operations
-- entity_type: 'transaction', 'budget', 'goal', 'user', etc.
-- action: 'create', 'update', 'delete'
-- diff: JSONB containing before/after values (for updates) or full object (for create/delete)
-- GDPR compliance: user_id can be NULL if the user is deleted; PII from users table is scrubbed,
--                  but audit_logs row remains with anonymized user_id reference
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- nullable for system-initiated actions or deleted users
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    entity_type VARCHAR(50) NOT NULL, -- 'transaction', 'budget', 'goal', etc.
    entity_id UUID NOT NULL,
    diff JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Final: Track migration execution
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001-init-schema')
ON CONFLICT DO NOTHING;
