-- SOVREN AI Complete Billing System Database Schema
-- Full lifecycle management with zero-touch operation

-- Create billing schema
CREATE SCHEMA IF NOT EXISTS billing;

-- User billing profiles
CREATE TABLE IF NOT EXISTS billing.user_profiles (
    user_id VARCHAR(255) PRIMARY KEY,
    user_type VARCHAR(50) DEFAULT 'standard', -- standard, beta, admin, it_analyst
    subscription_tier VARCHAR(50), -- sovren_proof ($497) or sovren_proof_plus ($797)
    billing_status VARCHAR(50) DEFAULT 'pending', -- pending, active, past_due, cancelled, exempt, trialing
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods (encrypted)
CREATE TABLE IF NOT EXISTS billing.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES billing.user_profiles(user_id),
    gateway VARCHAR(50), -- 'stripe' or 'zoho'
    stripe_customer_id VARCHAR(255),
    stripe_payment_method_id VARCHAR(255),
    zoho_customer_id VARCHAR(255),
    zoho_card_id VARCHAR(255),
    last_four VARCHAR(4),
    card_brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS billing.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES billing.user_profiles(user_id),
    gateway VARCHAR(50), -- 'stripe' or 'zoho'
    stripe_subscription_id VARCHAR(255),
    zoho_subscription_id VARCHAR(255),
    status VARCHAR(50), -- active, past_due, cancelled, trialing
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS billing.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE,
    user_id VARCHAR(255) REFERENCES billing.user_profiles(user_id),
    subscription_id UUID REFERENCES billing.subscriptions(id),
    gateway VARCHAR(50), -- 'stripe' or 'zoho'
    stripe_invoice_id VARCHAR(255),
    zoho_invoice_id VARCHAR(255),
    amount DECIMAL(10,2),
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2),
    status VARCHAR(50), -- draft, pending, paid, failed, void
    due_date DATE,
    paid_at TIMESTAMP,
    payment_method_id UUID REFERENCES billing.payment_methods(id),
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS billing.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES billing.invoices(id),
    stripe_payment_intent_id VARCHAR(255),
    zoho_payment_id VARCHAR(255),
    gateway VARCHAR(50), -- 'stripe' or 'zoho'
    amount DECIMAL(10,2),
    status VARCHAR(50), -- succeeded, pending, failed
    failure_reason TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email receipts tracking
CREATE TABLE IF NOT EXISTS billing.email_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES billing.invoices(id),
    user_id VARCHAR(255) REFERENCES billing.user_profiles(user_id),
    email_address VARCHAR(255),
    sent_at TIMESTAMP,
    status VARCHAR(50), -- sent, delivered, failed
    email_provider_id VARCHAR(255)
);

-- Gateway status tracking
CREATE TABLE IF NOT EXISTS billing.gateway_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway VARCHAR(50), -- 'stripe' or 'zoho'
    status VARCHAR(50), -- 'operational', 'degraded', 'down'
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time INTEGER, -- milliseconds
    error_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing events log
CREATE TABLE IF NOT EXISTS billing.events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    event_type VARCHAR(100), -- 'payment_succeeded', 'payment_failed', 'subscription_created', etc.
    event_data JSONB,
    gateway VARCHAR(50),
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_type ON billing.user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON billing.user_profiles(billing_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial ON billing.user_profiles(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON billing.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_gateway ON billing.payment_methods(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON billing.payment_methods(user_id, is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON billing.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON billing.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON billing.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON billing.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_zoho ON billing.subscriptions(zoho_subscription_id) WHERE zoho_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_user ON billing.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON billing.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON billing.invoices(due_date) WHERE status != 'paid';
CREATE INDEX IF NOT EXISTS idx_invoices_number ON billing.invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON billing.transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON billing.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON billing.transactions(gateway);

CREATE INDEX IF NOT EXISTS idx_email_receipts_user ON billing.email_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_receipts_status ON billing.email_receipts(status);

CREATE INDEX IF NOT EXISTS idx_gateway_status_gateway ON billing.gateway_status(gateway);
CREATE INDEX IF NOT EXISTS idx_gateway_status_check ON billing.gateway_status(last_check);

CREATE INDEX IF NOT EXISTS idx_events_log_user ON billing.events_log(user_id);
CREATE INDEX IF NOT EXISTS idx_events_log_type ON billing.events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_events_log_processed ON billing.events_log(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_events_log_created ON billing.events_log(created_at);

-- Views for common queries
CREATE OR REPLACE VIEW billing.active_subscriptions AS
SELECT 
    s.*,
    up.user_type,
    up.billing_status
FROM billing.subscriptions s
JOIN billing.user_profiles up ON s.user_id = up.user_id
WHERE s.status = 'active'
AND up.billing_status IN ('active', 'trialing');

CREATE OR REPLACE VIEW billing.overdue_invoices AS
SELECT 
    i.*,
    up.user_type,
    up.billing_status
FROM billing.invoices i
JOIN billing.user_profiles up ON i.user_id = up.user_id
WHERE i.status IN ('pending', 'failed')
AND i.due_date < CURRENT_DATE;

CREATE OR REPLACE VIEW billing.trial_ending_soon AS
SELECT 
    up.*,
    s.id as subscription_id,
    s.stripe_subscription_id,
    s.zoho_subscription_id
FROM billing.user_profiles up
LEFT JOIN billing.subscriptions s ON up.user_id = s.user_id AND s.status = 'trialing'
WHERE up.user_type = 'beta'
AND up.trial_ends_at IS NOT NULL
AND up.trial_ends_at <= CURRENT_TIMESTAMP + INTERVAL '7 days'
AND up.billing_status = 'trialing';

-- Functions for common operations
CREATE OR REPLACE FUNCTION billing.update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION billing.update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_user_profiles_timestamp
    BEFORE UPDATE ON billing.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION billing.update_user_profile_timestamp();

CREATE TRIGGER update_subscriptions_timestamp
    BEFORE UPDATE ON billing.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION billing.update_subscription_timestamp();

-- Insert default gateway status records
INSERT INTO billing.gateway_status (gateway, status, last_check, response_time, error_count, success_count)
VALUES 
    ('stripe', 'operational', CURRENT_TIMESTAMP, 0, 0, 0),
    ('zoho', 'operational', CURRENT_TIMESTAMP, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT USAGE ON SCHEMA billing TO sovren_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA billing TO sovren_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA billing TO sovren_app;

COMMENT ON SCHEMA billing IS 'SOVREN AI Complete Billing System - Automated subscription management with dual gateway support';
COMMENT ON TABLE billing.user_profiles IS 'User billing profiles with subscription tiers and status tracking';
COMMENT ON TABLE billing.payment_methods IS 'Encrypted payment method storage for both Stripe and Zoho';
COMMENT ON TABLE billing.subscriptions IS 'Active subscriptions with dual gateway support';
COMMENT ON TABLE billing.invoices IS 'Invoice records with PDF generation and email tracking';
COMMENT ON TABLE billing.transactions IS 'Payment transaction records for audit and reconciliation';
COMMENT ON TABLE billing.email_receipts IS 'Email receipt delivery tracking';
COMMENT ON TABLE billing.gateway_status IS 'Payment gateway health monitoring';
COMMENT ON TABLE billing.events_log IS 'Billing events log for webhook processing and audit';
