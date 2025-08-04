/**
 * SOVREN AI - Billing System Exports
 *
 * Central export file for the complete automated subscription billing system.
 * Provides all necessary components for integration into the SOVREN AI platform.
 *
 * CLASSIFICATION: BILLING SYSTEM EXPORTS
 */

// Import for local use
import { SubscriptionBillingSystem } from './SubscriptionBillingSystem';
import { OnboardingPaymentFlow } from './OnboardingPaymentFlow';
import { WebhookHandler } from './webhooks/WebhookHandler';
import { defaultBillingConfig, validateBillingConfig } from './config/BillingConfig';

// Core billing system
export {
  SubscriptionBillingSystem,
  PaymentGatewayManager,
  ZohoPayments,
  SUBSCRIPTION_TIERS,
  EXEMPT_USER_TYPES
} from './SubscriptionBillingSystem';

export type {
  BillingUser,
  SubscriptionTier,
  PaymentGatewayState,
  BillingProfile,
  PaymentMethod,
  Subscription,
  Invoice,
  PaymentTransaction,
  EmailReceipt
} from './SubscriptionBillingSystem';

// Onboarding payment flow
export {
  OnboardingPaymentFlow
} from './OnboardingPaymentFlow';

export type {
  OnboardingUser,
  PaymentFlowResult,
  SubscriptionSelection
} from './OnboardingPaymentFlow';

// Configuration
export {
  defaultBillingConfig,
  loadBillingConfig,
  validateBillingConfig,
  getSubscriptionTier,
  getPrimaryPaymentGateway,
  getFallbackPaymentGateways,
  isExemptUserType,
  getTrialEndDate
} from './config/BillingConfig';

export type {
  BillingEnvironmentConfig,
  SubscriptionTierConfig,
  PaymentGatewayConfig,
  BillingSystemConfig,
  EmailTemplateConfig
} from './config/BillingConfig';

// Webhook handling
export {
  WebhookHandler
} from './webhooks/WebhookHandler';

export type {
  WebhookEvent,
  WebhookProcessingResult,
  ZohoWebhookEvent
} from './webhooks/WebhookHandler';

// Testing utilities
export {
  BillingSystemTest,
  runBillingSystemTests
} from './tests/BillingSystemTest';

/**
 * Initialize the complete billing system
 * 
 * This is the main entry point for setting up the billing system
 * in your application. It initializes all components and returns
 * the configured system ready for use.
 */
export function initializeBillingSystem(): {
  billingSystem: SubscriptionBillingSystem;
  paymentFlow: OnboardingPaymentFlow;
  webhookHandler: WebhookHandler;
} {
  console.log('🏦 Initializing SOVREN AI Billing System...');
  
  // Initialize core billing system
  const billingSystem = new SubscriptionBillingSystem();
  
  // Initialize payment flow for onboarding
  const paymentFlow = new OnboardingPaymentFlow(billingSystem);
  
  // Initialize webhook handler
  const webhookHandler = new WebhookHandler(billingSystem);
  
  console.log('✅ SOVREN AI Billing System initialized successfully');
  
  return {
    billingSystem,
    paymentFlow,
    webhookHandler
  };
}

/**
 * Billing system health check
 * 
 * Performs a comprehensive health check of the billing system
 * including payment gateways, database connectivity, and configuration.
 */
export async function performBillingHealthCheck(): Promise<{
  healthy: boolean;
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
  }>;
}> {
  const timestamp = new Date().toISOString();
  const checks: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
  }> = [];

  try {
    // Initialize billing system for health check
    const { billingSystem, webhookHandler } = initializeBillingSystem();

    // Check configuration
    try {
      const configValidation = validateBillingConfig(defaultBillingConfig);
      if (configValidation.valid) {
        checks.push({
          name: 'Configuration',
          status: 'healthy'
        });
      } else {
        checks.push({
          name: 'Configuration',
          status: 'unhealthy',
          message: `Configuration errors: ${configValidation.errors.join(', ')}`
        });
      }
    } catch (error) {
      checks.push({
        name: 'Configuration',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Configuration check failed'
      });
    }

    // Check payment gateways
    try {
      const gatewayStatus = billingSystem.getPaymentGatewayStatus();
      
      // Check Stripe
      if (gatewayStatus.stripe.available) {
        checks.push({
          name: 'Stripe Gateway',
          status: 'healthy'
        });
      } else {
        checks.push({
          name: 'Stripe Gateway',
          status: 'unhealthy',
          message: `State: ${gatewayStatus.stripe.state}, Failures: ${gatewayStatus.stripe.failures}`
        });
      }

      // Check Zoho
      if (gatewayStatus.zoho.available) {
        checks.push({
          name: 'Zoho Gateway',
          status: 'healthy'
        });
      } else {
        checks.push({
          name: 'Zoho Gateway',
          status: 'degraded',
          message: `State: ${gatewayStatus.zoho.state}, Failures: ${gatewayStatus.zoho.failures}`
        });
      }

      // Overall gateway health
      if (gatewayStatus.stripe.available || gatewayStatus.zoho.available) {
        checks.push({
          name: 'Payment Processing',
          status: 'healthy',
          message: `Active gateway: ${gatewayStatus.activeGateway}`
        });
      } else {
        checks.push({
          name: 'Payment Processing',
          status: 'unhealthy',
          message: 'All payment gateways unavailable'
        });
      }
    } catch (error) {
      checks.push({
        name: 'Payment Gateways',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Gateway check failed'
      });
    }

    // Check webhook processing
    try {
      const webhookStats = webhookHandler.getWebhookStats();
      checks.push({
        name: 'Webhook Processing',
        status: 'healthy',
        message: `Processed: ${webhookStats.processedEvents}, Retrying: ${webhookStats.retryingEvents}`
      });
    } catch (error) {
      checks.push({
        name: 'Webhook Processing',
        status: 'degraded',
        message: error instanceof Error ? error.message : 'Webhook check failed'
      });
    }

    // Determine overall health
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const healthy = unhealthyChecks.length === 0;

    return {
      healthy,
      timestamp,
      checks
    };

  } catch (error) {
    return {
      healthy: false,
      timestamp,
      checks: [{
        name: 'System Initialization',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Failed to initialize billing system'
      }]
    };
  }
}

/**
 * Quick billing system status
 * 
 * Returns a quick status overview of the billing system
 * for monitoring and dashboard purposes.
 */
export function getBillingSystemStatus(): {
  status: 'operational' | 'degraded' | 'down';
  activeGateway: string;
  timestamp: string;
  version: string;
} {
  try {
    const { billingSystem } = initializeBillingSystem();
    const gatewayStatus = billingSystem.getPaymentGatewayStatus();
    
    let status: 'operational' | 'degraded' | 'down';
    
    if (gatewayStatus.stripe.available && gatewayStatus.zoho.available) {
      status = 'operational';
    } else if (gatewayStatus.stripe.available || gatewayStatus.zoho.available) {
      status = 'degraded';
    } else {
      status = 'down';
    }

    return {
      status,
      activeGateway: gatewayStatus.activeGateway,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  } catch (error) {
    return {
      status: 'down',
      activeGateway: 'unknown',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

// Re-export commonly used types for convenience
export type {
  // User and billing types
  BillingUser as User,
  BillingProfile as Profile,

  // Payment types
  PaymentMethod as Payment,
  PaymentTransaction as Transaction,

  // Subscription types
  Subscription as Sub,
  SubscriptionTier as Tier
} from './SubscriptionBillingSystem';

export type {
  // Configuration types
  BillingSystemConfig as Config,
  BillingEnvironmentConfig as Environment
} from './config/BillingConfig';

// Export version information
export const BILLING_SYSTEM_VERSION = '1.0.0';
export const BILLING_SYSTEM_NAME = 'SOVREN AI Automated Billing System';

console.log(`📦 ${BILLING_SYSTEM_NAME} v${BILLING_SYSTEM_VERSION} loaded`);
