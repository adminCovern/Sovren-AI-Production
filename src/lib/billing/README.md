# SOVREN AI - Complete Automated Subscription Billing System

## Overview

The SOVREN AI billing system provides complete automation for subscription management with zero-touch operation. It includes automatic failover between Stripe and Zoho Payments, comprehensive user type handling, and full lifecycle management.

## Features

### ✅ Automated Subscription Management
- Initial payment during onboarding
- Monthly recurring billing with automatic retry
- Invoice generation and PDF creation
- Email receipts and notifications
- Payment reconciliation and audit trails

### ✅ User Type Handling
- **Standard Users**: $497 or $797/month, immediate payment required
- **Beta Users**: 30-day free trial, then auto-charged
- **Admin User**: `admin@sovrenai.app` (Brian Geary) - Full access, no payment
- **IT Analysts**: Full access, no payment required

### ✅ Automatic Failover System
- **Primary Gateway**: Stripe (always attempted first)
- **Fallback Gateway**: Zoho Payments (automatic failover)
- **Circuit Breaker**: Opens after 3 failures, recovers automatically
- **99.99% Availability**: Intelligent failover ensures payment processing

### ✅ Zero-Touch Operation
- Webhook-driven automation
- Self-healing on failures
- Automatic retry with exponential backoff
- Complete audit trail and monitoring

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Onboarding    │───▶│  Billing System  │───▶│  Payment Gateway│
│     Flow        │    │                  │    │   (Stripe/Zoho) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Database       │
                       │   (PostgreSQL)   │
                       └──────────────────┘
```

## Installation & Setup

### 1. Database Setup

Execute the billing schema:

```bash
psql your_database_url -f src/lib/billing/database/billing_schema.sql
```

### 2. Environment Configuration

Create a `.env.billing` file with the following variables:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_PROOF="price_..."
STRIPE_PRICE_PROOF_PLUS="price_..."

# Zoho Payments Configuration (Optional - for failover)
ZOHO_API_KEY="your_zoho_api_key"
ZOHO_SIGNING_KEY="your_zoho_signing_key"
ZOHO_ORG_ID="your_org_id"
ZOHO_PLAN_PROOF="your_plan_code"
ZOHO_PLAN_PROOF_PLUS="your_plan_code"

# Email Configuration
SMTP_HOST="your_smtp_host"
SMTP_PORT="587"
SMTP_USER="your_smtp_user"
SMTP_PASSWORD="your_smtp_password"
BILLING_EMAIL="billing@sovrenai.app"

# Database & Redis
DATABASE_URL="postgresql://localhost:5432/sovren"
REDIS_URL="redis://localhost:6379"

# Application
APP_URL="https://sovrenai.app"
NODE_ENV="production"
```

### 3. Webhook Configuration

Configure webhooks in your payment providers:

**Stripe Webhooks** (Dashboard > Developers > Webhooks):
- Endpoint: `https://your-domain.com/api/billing/webhook/stripe`
- Events: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.*`

**Zoho Webhooks** (if using failover):
- Endpoint: `https://your-domain.com/api/billing/webhook/zoho`
- Events: `subscription_activation`, `payment_success`, `payment_failure`

## Integration with Onboarding

The billing system is fully integrated into the SOVREN onboarding flow:

### 1. User Registration
```typescript
import { OnboardingOrchestrator } from '../lib/onboarding/OnboardingOrchestrator';

const orchestrator = new OnboardingOrchestrator();

// Start onboarding - billing is automatically handled
const session = await orchestrator.startCompleteOnboarding(registrationData);
```

### 2. Payment Processing
```typescript
// Process subscription selection
const result = await orchestrator.processSubscriptionSelection(
  sessionId,
  'sovren_proof_plus'
);

// Complete payment
const paymentResult = await orchestrator.completePayment(
  sessionId,
  paymentMethodId,
  'sovren_proof_plus'
);
```

### 3. User Type Handling

The system automatically detects and handles different user types:

```typescript
// Admin user (hardcoded email)
if (email === 'admin@sovrenai.app') {
  // Automatically grants full access, no payment required
}

// IT Analyst
if (userType === 'it_analyst') {
  // Full access, no payment required
}

// Beta user
if (userType === 'beta') {
  // 30-day trial, then auto-charged
}

// Standard user
// Immediate payment required
```

## API Endpoints

### Subscription Management
- `POST /api/billing/subscription/create` - Create new subscription
- `GET /api/billing/subscription/tiers` - Get available subscription tiers

### User Status
- `GET /api/billing/user/[userId]/status` - Get user billing status
- `POST /api/billing/user/[userId]/status` - Update user billing status

### Webhooks
- `POST /api/billing/webhook/stripe` - Stripe webhook handler
- `POST /api/billing/webhook/zoho` - Zoho webhook handler

## Subscription Tiers

### SOVREN Proof - $497/month
- 1,000 documents per month
- AI-powered analysis and insights
- PDF export and sharing
- Email support
- Basic integrations
- Standard Shadow Board (4 executives)

### SOVREN Proof+ - $797/month
- Unlimited documents
- Advanced AI models and custom training
- Full API access
- Priority support (24/7)
- All integrations included
- Complete Shadow Board (8 executives)
- Custom reporting and analytics
- White-label options

## Payment Gateway Failover

The system implements intelligent failover between payment gateways:

### Circuit Breaker Pattern
1. **Closed State**: Normal operation, all requests go to primary gateway (Stripe)
2. **Open State**: After 3 failures, circuit opens and requests go to fallback (Zoho)
3. **Half-Open State**: After 5 minutes, system tests primary gateway recovery

### Monitoring
```typescript
// Get current gateway status
const status = billingSystem.getPaymentGatewayStatus();
console.log(`Active Gateway: ${status.activeGateway}`);
console.log(`Stripe Available: ${status.stripe.available}`);
console.log(`Zoho Available: ${status.zoho.available}`);
```

## Error Handling & Monitoring

### Webhook Processing
- Automatic retry with exponential backoff
- Duplicate event detection
- Comprehensive error logging
- Circuit breaker for gateway failures

### Payment Failures
- Automatic retry attempts (3x)
- Grace period for past-due accounts
- Email notifications to users
- Admin alerts for critical failures

### Monitoring Endpoints
- `GET /api/billing/webhook/stripe/health` - Stripe webhook health
- `GET /api/billing/webhook/zoho/health` - Zoho webhook health

## Security

### Webhook Verification
- Stripe signature verification using webhook secrets
- Zoho HMAC signature verification
- Timestamp validation to prevent replay attacks

### Data Protection
- Payment method data encrypted at rest
- PCI DSS compliance through Stripe/Zoho
- Secure API key management
- Audit trails for all transactions

## Testing

### Test Admin User
```typescript
const testAdmin = {
  id: 'test_admin_001',
  email: 'admin@sovrenai.app',
  name: 'Brian Geary',
  type: 'standard'  // Will be overridden to 'admin'
};

const result = await onboardingFlow.handleApprovedUserLogin(testAdmin);
// Should return: { nextStep: 'complete_onboarding', message: 'No payment required' }
```

### Test Failover
```typescript
// Simulate Stripe failure
billingSystem.gatewayManager.recordFailure('stripe', new Error('Test failure'));
billingSystem.gatewayManager.recordFailure('stripe', new Error('Test failure'));
billingSystem.gatewayManager.recordFailure('stripe', new Error('Test failure'));

// Next payment should automatically use Zoho
const result = await billingSystem.processInitialPayment(userId, paymentMethodId, tier);
// Should return: { gateway: 'zoho', success: true }
```

## Troubleshooting

### Common Issues

1. **Admin user not getting free access**
   - Verify email is exactly `admin@sovrenai.app`
   - Check user_type is set to 'admin'

2. **Gateway failover not working**
   - Check environment variables are set
   - Verify network connectivity to both gateways
   - Review circuit breaker status

3. **Invoices not being sent**
   - Verify SMTP configuration
   - Check email templates
   - Ensure billing@sovrenai.app is configured

4. **Beta users being charged immediately**
   - Verify trial_ends_at is set correctly
   - Check user_type is 'beta'
   - Ensure subscription created with trial period

## Support

For billing system support:
- Technical Issues: Check logs and monitoring endpoints
- Payment Gateway Issues: Verify API keys and webhook configuration
- Database Issues: Check PostgreSQL connection and schema
- Email Issues: Verify SMTP configuration

The billing system is designed for zero-touch operation once properly configured. All common scenarios are handled automatically with comprehensive error handling and monitoring.
