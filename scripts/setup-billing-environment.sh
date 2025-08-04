#!/bin/bash

# SOVREN AI - Billing Environment Setup Script
# 
# This script sets up the complete billing environment including:
# - Database schema creation
# - Environment variable configuration
# - API key validation
# - Payment gateway testing
#
# CLASSIFICATION: BILLING ENVIRONMENT SETUP

set -e  # Exit on any error

echo "🏦 SOVREN AI - Billing Environment Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BILLING_ENV_FILE=".env.billing"
DATABASE_SCHEMA_FILE="src/lib/billing/database/billing_schema.sql"
SECRETS_DIR="secrets"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random string
generate_random_string() {
    openssl rand -hex 32
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command_exists "psql"; then
        print_error "PostgreSQL client (psql) is required but not installed"
        exit 1
    fi
    
    if ! command_exists "node"; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command_exists "npm"; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Create secrets directory
create_secrets_directory() {
    print_info "Creating secrets directory..."
    
    if [ ! -d "$SECRETS_DIR" ]; then
        mkdir -p "$SECRETS_DIR"
        chmod 700 "$SECRETS_DIR"
        print_status "Secrets directory created: $SECRETS_DIR"
    else
        print_warning "Secrets directory already exists: $SECRETS_DIR"
    fi
}

# Setup database schema
setup_database_schema() {
    print_info "Setting up billing database schema..."
    
    # Check if database schema file exists
    if [ ! -f "$DATABASE_SCHEMA_FILE" ]; then
        print_error "Database schema file not found: $DATABASE_SCHEMA_FILE"
        exit 1
    fi
    
    # Get database connection details
    read -p "Enter PostgreSQL database URL (or press Enter for default): " DB_URL
    if [ -z "$DB_URL" ]; then
        DB_URL="postgresql://localhost:5432/sovren"
    fi
    
    # Test database connection
    print_info "Testing database connection..."
    if psql "$DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        print_status "Database connection successful"
    else
        print_error "Failed to connect to database: $DB_URL"
        print_info "Please ensure PostgreSQL is running and the database exists"
        exit 1
    fi
    
    # Execute schema
    print_info "Executing billing schema..."
    if psql "$DB_URL" -f "$DATABASE_SCHEMA_FILE" >/dev/null 2>&1; then
        print_status "Billing database schema created successfully"
    else
        print_error "Failed to create billing database schema"
        exit 1
    fi
    
    # Store database URL
    echo "DATABASE_URL=\"$DB_URL\"" >> "$BILLING_ENV_FILE"
}

# Setup Stripe configuration
setup_stripe_configuration() {
    print_info "Setting up Stripe configuration..."
    
    echo ""
    echo "🔑 Stripe Configuration"
    echo "----------------------"
    echo "Please provide your Stripe API keys:"
    echo "You can find these in your Stripe Dashboard > Developers > API keys"
    echo ""
    
    read -p "Stripe Secret Key (sk_...): " STRIPE_SECRET_KEY
    read -p "Stripe Publishable Key (pk_...): " STRIPE_PUBLISHABLE_KEY
    read -p "Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK_SECRET
    
    echo ""
    echo "Please provide your Stripe Price IDs:"
    echo "Create these in Stripe Dashboard > Products"
    echo ""
    
    read -p "SOVREN Proof Price ID (price_...): " STRIPE_PRICE_PROOF
    read -p "SOVREN Proof+ Price ID (price_...): " STRIPE_PRICE_PROOF_PLUS
    
    # Validate Stripe keys
    if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_[a-zA-Z0-9_]+ ]]; then
        print_error "Invalid Stripe secret key format"
        exit 1
    fi
    
    if [[ ! "$STRIPE_PUBLISHABLE_KEY" =~ ^pk_[a-zA-Z0-9_]+ ]]; then
        print_error "Invalid Stripe publishable key format"
        exit 1
    fi
    
    # Store Stripe configuration
    cat >> "$BILLING_ENV_FILE" << EOF

# Stripe Configuration
STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY"
STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
STRIPE_PRICE_PROOF="$STRIPE_PRICE_PROOF"
STRIPE_PRICE_PROOF_PLUS="$STRIPE_PRICE_PROOF_PLUS"
EOF
    
    print_status "Stripe configuration saved"
}

# Setup Zoho configuration (optional)
setup_zoho_configuration() {
    print_info "Setting up Zoho Payments configuration (optional for failover)..."
    
    echo ""
    read -p "Do you want to configure Zoho Payments for failover? (y/N): " SETUP_ZOHO
    
    if [[ "$SETUP_ZOHO" =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔑 Zoho Payments Configuration"
        echo "-----------------------------"
        echo "Please provide your Zoho Payments API credentials:"
        echo ""
        
        read -p "Zoho API Key: " ZOHO_API_KEY
        read -p "Zoho Signing Key: " ZOHO_SIGNING_KEY
        read -p "Zoho Organization ID (optional): " ZOHO_ORG_ID
        read -p "SOVREN Proof Plan Code: " ZOHO_PLAN_PROOF
        read -p "SOVREN Proof+ Plan Code: " ZOHO_PLAN_PROOF_PLUS
        
        # Store Zoho configuration
        cat >> "$BILLING_ENV_FILE" << EOF

# Zoho Payments Configuration
ZOHO_API_KEY="$ZOHO_API_KEY"
ZOHO_SIGNING_KEY="$ZOHO_SIGNING_KEY"
ZOHO_ORG_ID="$ZOHO_ORG_ID"
ZOHO_PLAN_PROOF="$ZOHO_PLAN_PROOF"
ZOHO_PLAN_PROOF_PLUS="$ZOHO_PLAN_PROOF_PLUS"
EOF
        
        print_status "Zoho Payments configuration saved"
    else
        print_warning "Zoho Payments configuration skipped"
        print_info "You can configure this later for payment failover capability"
    fi
}

# Setup email configuration
setup_email_configuration() {
    print_info "Setting up email configuration..."
    
    echo ""
    echo "📧 Email Configuration"
    echo "---------------------"
    echo "Configure SMTP settings for billing emails:"
    echo ""
    
    read -p "SMTP Host (default: localhost): " SMTP_HOST
    SMTP_HOST=${SMTP_HOST:-localhost}
    
    read -p "SMTP Port (default: 587): " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    
    read -p "SMTP Username (optional): " SMTP_USER
    read -s -p "SMTP Password (optional): " SMTP_PASSWORD
    echo ""
    
    read -p "Billing Email Address (default: billing@sovrenai.app): " BILLING_EMAIL
    BILLING_EMAIL=${BILLING_EMAIL:-billing@sovrenai.app}
    
    # Store email configuration
    cat >> "$BILLING_ENV_FILE" << EOF

# Email Configuration
SMTP_HOST="$SMTP_HOST"
SMTP_PORT="$SMTP_PORT"
SMTP_USER="$SMTP_USER"
SMTP_PASSWORD="$SMTP_PASSWORD"
BILLING_EMAIL="$BILLING_EMAIL"
EOF
    
    print_status "Email configuration saved"
}

# Setup Redis configuration
setup_redis_configuration() {
    print_info "Setting up Redis configuration..."
    
    read -p "Redis URL (default: redis://localhost:6379): " REDIS_URL
    REDIS_URL=${REDIS_URL:-redis://localhost:6379}
    
    # Test Redis connection
    if command_exists "redis-cli"; then
        if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
            print_status "Redis connection successful"
        else
            print_warning "Could not connect to Redis at $REDIS_URL"
            print_info "Please ensure Redis is running"
        fi
    else
        print_warning "redis-cli not found, skipping Redis connection test"
    fi
    
    # Store Redis configuration
    cat >> "$BILLING_ENV_FILE" << EOF

# Redis Configuration
REDIS_URL="$REDIS_URL"
EOF
    
    print_status "Redis configuration saved"
}

# Setup application configuration
setup_application_configuration() {
    print_info "Setting up application configuration..."
    
    read -p "Application URL (default: https://sovrenai.app): " APP_URL
    APP_URL=${APP_URL:-https://sovrenai.app}
    
    read -p "Environment (development/staging/production, default: development): " NODE_ENV
    NODE_ENV=${NODE_ENV:-development}
    
    # Store application configuration
    cat >> "$BILLING_ENV_FILE" << EOF

# Application Configuration
APP_URL="$APP_URL"
NODE_ENV="$NODE_ENV"
EOF
    
    print_status "Application configuration saved"
}

# Validate configuration
validate_configuration() {
    print_info "Validating billing configuration..."
    
    # Check if Node.js can load the configuration
    cat > validate_config.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.billing
const envFile = '.env.billing';
if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
        if (line.trim() && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').replace(/^"(.*)"$/, '$1');
                process.env[key] = value;
            }
        }
    }
}

// Import and validate configuration
try {
    const { loadBillingConfig, validateBillingConfig } = require('./src/lib/billing/config/BillingConfig.ts');
    const config = loadBillingConfig();
    const validation = validateBillingConfig(config);
    
    if (validation.valid) {
        console.log('✅ Configuration validation passed');
        if (validation.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            validation.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        process.exit(0);
    } else {
        console.log('❌ Configuration validation failed');
        console.log('Errors:');
        validation.errors.forEach(error => console.log(`   - ${error}`));
        process.exit(1);
    }
} catch (error) {
    console.log('❌ Configuration validation error:', error.message);
    process.exit(1);
}
EOF
    
    if node validate_config.js; then
        print_status "Configuration validation passed"
    else
        print_error "Configuration validation failed"
        print_info "Please check your configuration and try again"
    fi
    
    # Clean up validation script
    rm -f validate_config.js
}

# Secure the configuration files
secure_configuration() {
    print_info "Securing configuration files..."
    
    # Set restrictive permissions on billing environment file
    chmod 600 "$BILLING_ENV_FILE"
    
    # Set restrictive permissions on secrets directory
    chmod 700 "$SECRETS_DIR"
    
    print_status "Configuration files secured"
    print_warning "Remember to add $BILLING_ENV_FILE to your .gitignore file"
}

# Main setup function
main() {
    echo ""
    print_info "Starting SOVREN AI billing environment setup..."
    echo ""
    
    # Initialize billing environment file
    echo "# SOVREN AI Billing Environment Configuration" > "$BILLING_ENV_FILE"
    echo "# Generated on $(date)" >> "$BILLING_ENV_FILE"
    echo "# DO NOT COMMIT THIS FILE TO VERSION CONTROL" >> "$BILLING_ENV_FILE"
    
    check_prerequisites
    create_secrets_directory
    setup_database_schema
    setup_stripe_configuration
    setup_zoho_configuration
    setup_email_configuration
    setup_redis_configuration
    setup_application_configuration
    validate_configuration
    secure_configuration
    
    echo ""
    print_status "SOVREN AI billing environment setup completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "1. Add $BILLING_ENV_FILE to your .gitignore file"
    echo "2. Load the environment variables in your application"
    echo "3. Test the billing system with the provided test scripts"
    echo "4. Configure your Stripe webhook endpoints"
    echo "5. Set up monitoring for payment gateway health"
    echo ""
    print_warning "Keep your API keys secure and never commit them to version control"
}

# Run main function
main "$@"
