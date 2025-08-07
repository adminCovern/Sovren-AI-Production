-- Phone Number Allocation Tables
-- Manages unique phone number assignments per user with geographic area code matching

-- User phone allocations table
CREATE TABLE user_phone_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_tier VARCHAR(20) NOT NULL CHECK (subscription_tier IN ('sovren_proof', 'sovren_proof_plus')),
    geography VARCHAR(255) NOT NULL,
    area_code VARCHAR(3) NOT NULL,
    
    -- SOVREN AI main number (always present)
    sovren_ai_number VARCHAR(20) NOT NULL UNIQUE,
    
    -- Executive phone numbers (based on subscription tier)
    cfo_number VARCHAR(20) UNIQUE,
    cmo_number VARCHAR(20) UNIQUE,
    clo_number VARCHAR(20) UNIQUE,
    cto_number VARCHAR(20) UNIQUE,
    coo_number VARCHAR(20) UNIQUE,  -- Proof+ only
    chro_number VARCHAR(20) UNIQUE, -- Proof+ only
    cso_number VARCHAR(20) UNIQUE,  -- Proof+ only
    cio_number VARCHAR(20) UNIQUE,  -- Proof+ only
    
    -- Skyetel integration data
    skyetel_order_ids TEXT[], -- Array of Skyetel order IDs
    monthly_rate DECIMAL(10,2) NOT NULL,
    provisioned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure one allocation per user
    UNIQUE(user_id)
);

-- Phone number usage tracking
CREATE TABLE phone_number_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    phone_number VARCHAR(20) NOT NULL,
    executive_role VARCHAR(10), -- 'sovren-ai', 'cfo', 'cmo', etc.
    
    -- Usage metrics
    total_calls INTEGER NOT NULL DEFAULT 0,
    total_minutes INTEGER NOT NULL DEFAULT 0,
    last_call_at TIMESTAMP,
    
    -- Monthly usage tracking
    current_month_calls INTEGER NOT NULL DEFAULT 0,
    current_month_minutes INTEGER NOT NULL DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, phone_number)
);

-- Area code availability tracking
CREATE TABLE area_code_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_code VARCHAR(3) NOT NULL,
    state VARCHAR(2) NOT NULL,
    region VARCHAR(100) NOT NULL,
    major_cities TEXT[], -- Array of major cities
    timezone VARCHAR(50) NOT NULL,
    
    -- Availability tracking
    total_numbers_available INTEGER NOT NULL DEFAULT 0,
    numbers_in_use INTEGER NOT NULL DEFAULT 0,
    last_inventory_check TIMESTAMP,
    
    -- Priority for assignment
    priority INTEGER NOT NULL DEFAULT 1,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(area_code)
);

-- Skyetel order tracking
CREATE TABLE skyetel_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    skyetel_order_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- Order details
    phone_numbers TEXT[] NOT NULL, -- Array of purchased numbers
    area_code VARCHAR(3) NOT NULL,
    order_status VARCHAR(20) NOT NULL CHECK (order_status IN ('pending', 'completed', 'failed', 'cancelled')),
    
    -- Financial tracking
    setup_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    monthly_rate DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    
    -- Skyetel response data
    skyetel_response JSONB,
    
    -- Timestamps
    ordered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Call routing rules per user
CREATE TABLE user_call_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    executive_role VARCHAR(10) NOT NULL,
    
    -- Routing configuration
    auto_answer BOOLEAN NOT NULL DEFAULT false,
    max_concurrent_calls INTEGER NOT NULL DEFAULT 3,
    working_hours JSONB, -- Store working hours configuration
    
    -- Call handling preferences
    record_calls BOOLEAN NOT NULL DEFAULT true,
    transcribe_calls BOOLEAN NOT NULL DEFAULT true,
    voicemail_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, phone_number)
);

-- Indexes for performance
CREATE INDEX idx_user_phone_allocations_user_id ON user_phone_allocations(user_id);
CREATE INDEX idx_user_phone_allocations_area_code ON user_phone_allocations(area_code);
CREATE INDEX idx_user_phone_allocations_status ON user_phone_allocations(status);

CREATE INDEX idx_phone_number_usage_user_id ON phone_number_usage(user_id);
CREATE INDEX idx_phone_number_usage_phone_number ON phone_number_usage(phone_number);
CREATE INDEX idx_phone_number_usage_last_call ON phone_number_usage(last_call_at);

CREATE INDEX idx_area_code_inventory_area_code ON area_code_inventory(area_code);
CREATE INDEX idx_area_code_inventory_state ON area_code_inventory(state);
CREATE INDEX idx_area_code_inventory_priority ON area_code_inventory(priority);

CREATE INDEX idx_skyetel_orders_user_id ON skyetel_orders(user_id);
CREATE INDEX idx_skyetel_orders_status ON skyetel_orders(order_status);
CREATE INDEX idx_skyetel_orders_skyetel_id ON skyetel_orders(skyetel_order_id);

CREATE INDEX idx_user_call_routing_user_id ON user_call_routing(user_id);
CREATE INDEX idx_user_call_routing_phone_number ON user_call_routing(phone_number);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_phone_allocations_updated_at 
    BEFORE UPDATE ON user_phone_allocations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_number_usage_updated_at 
    BEFORE UPDATE ON phone_number_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_area_code_inventory_updated_at 
    BEFORE UPDATE ON area_code_inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skyetel_orders_updated_at 
    BEFORE UPDATE ON skyetel_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_call_routing_updated_at 
    BEFORE UPDATE ON user_call_routing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
