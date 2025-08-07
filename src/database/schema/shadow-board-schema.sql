-- SOVREN-AI Shadow Board Production Database Schema
-- IMMEDIATE DEPLOYMENT - NO PLACEHOLDERS
-- Generated: Multi-Agent Deployment Sprint

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'sovren_proof',
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('sovren_proof', 'sovren_proof_plus')),
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'inactive', 'suspended', 'cancelled'))
);

-- Executive Profiles
CREATE TABLE executive_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    executive_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    personality_profile JSONB NOT NULL DEFAULT '{}',
    voice_characteristics JSONB NOT NULL DEFAULT '{}',
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, executive_id),
    CONSTRAINT valid_executive_role CHECK (role IN ('cfo', 'cmo', 'cto', 'clo', 'coo', 'chro', 'cso'))
);

-- Voice Synthesis Cache
CREATE TABLE voice_synthesis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    executive_id VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    audio_data BYTEA,
    audio_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    INDEX idx_voice_cache_key (cache_key),
    INDEX idx_voice_cache_user (user_id),
    INDEX idx_voice_cache_expires (expires_at)
);

-- Executive Coordination Sessions
CREATE TABLE coordination_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_executives TEXT[] NOT NULL,
    conversation_context JSONB NOT NULL DEFAULT '{}',
    coordination_state JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_session_status CHECK (status IN ('active', 'paused', 'ended', 'error'))
);

-- Executive Interactions
CREATE TABLE executive_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    executive_id VARCHAR(100) NOT NULL,
    session_id UUID REFERENCES coordination_sessions(id),
    interaction_type VARCHAR(50) NOT NULL,
    request_data JSONB NOT NULL DEFAULT '{}',
    response_data JSONB NOT NULL DEFAULT '{}',
    performance_metrics JSONB NOT NULL DEFAULT '{}',
    satisfaction_score DECIMAL(3,2),
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_interactions_user (user_id),
    INDEX idx_interactions_executive (executive_id),
    INDEX idx_interactions_created (created_at),
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('voice', 'text', 'coordination', 'decision'))
);

-- Phone Call Sessions
CREATE TABLE phone_call_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    executive_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    caller_number VARCHAR(50),
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'connecting',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    conversation_data JSONB NOT NULL DEFAULT '{}',
    voice_metrics JSONB NOT NULL DEFAULT '{}',
    
    INDEX idx_calls_user (user_id),
    INDEX idx_calls_status (status),
    INDEX idx_calls_start_time (start_time),
    CONSTRAINT valid_call_direction CHECK (direction IN ('inbound', 'outbound')),
    CONSTRAINT valid_call_status CHECK (status IN ('connecting', 'ringing', 'answered', 'ended', 'failed'))
);

-- Performance Metrics
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    executive_id VARCHAR(100),
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_metrics_user (user_id),
    INDEX idx_metrics_executive (executive_id),
    INDEX idx_metrics_type (metric_type),
    INDEX idx_metrics_recorded (recorded_at)
);

-- User Satisfaction Tracking
CREATE TABLE user_satisfaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    executive_id VARCHAR(100),
    interaction_id UUID REFERENCES executive_interactions(id),
    satisfaction_score DECIMAL(3,2) NOT NULL,
    feedback_text TEXT,
    improvement_areas TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_satisfaction_user (user_id),
    INDEX idx_satisfaction_executive (executive_id),
    INDEX idx_satisfaction_score (satisfaction_score),
    CONSTRAINT valid_satisfaction_score CHECK (satisfaction_score >= 0 AND satisfaction_score <= 1)
);

-- System Health Monitoring
CREATE TABLE system_health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component_name VARCHAR(100) NOT NULL,
    health_status VARCHAR(50) NOT NULL,
    health_score DECIMAL(3,2) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    alerts JSONB NOT NULL DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_health_component (component_name),
    INDEX idx_health_status (health_status),
    INDEX idx_health_recorded (recorded_at),
    CONSTRAINT valid_health_status CHECK (health_status IN ('healthy', 'warning', 'critical', 'down'))
);

-- B200 GPU Utilization
CREATE TABLE b200_utilization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gpu_id INTEGER NOT NULL,
    user_id UUID REFERENCES users(id),
    executive_id VARCHAR(100),
    utilization_percent DECIMAL(5,2) NOT NULL,
    memory_used_gb DECIMAL(8,2) NOT NULL,
    temperature_celsius DECIMAL(5,2) NOT NULL,
    power_consumption_watts DECIMAL(8,2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_b200_gpu (gpu_id),
    INDEX idx_b200_user (user_id),
    INDEX idx_b200_recorded (recorded_at)
);

-- Subscription and Billing
CREATE TABLE subscription_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    usage_limit INTEGER,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, usage_type, billing_period_start),
    INDEX idx_usage_user (user_id),
    INDEX idx_usage_period (billing_period_start, billing_period_end)
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_status);
CREATE INDEX idx_executive_profiles_user_role ON executive_profiles(user_id, role);
CREATE INDEX idx_coordination_sessions_user_status ON coordination_sessions(user_id, status);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_executive_profiles_updated_at BEFORE UPDATE ON executive_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coordination_sessions_updated_at BEFORE UPDATE ON coordination_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_usage_updated_at BEFORE UPDATE ON subscription_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your deployment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sovren_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sovren_app;
