/**
 * SOVREN AI - Billing System Configuration
 * 
 * Centralized configuration for the billing system including
 * payment gateways, subscription tiers, and environment settings.
 * 
 * CLASSIFICATION: BILLING CONFIGURATION
 */

export interface BillingEnvironmentConfig {
  // Stripe Configuration
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  stripePriceProof: string;
  stripePriceProofPlus: string;

  // Zoho Configuration
  zohoApiKey: string;
  zohoSigningKey: string;
  zohoOrgId?: string;
  zohoPlanProof: string;
  zohoPlanProofPlus: string;

  // Email Configuration
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword?: string;
  billingEmail: string;

  // Database Configuration
  databaseUrl: string;
  redisUrl: string;

  // Application Configuration
  appUrl: string;
  environment: 'development' | 'staging' | 'production';
}

export interface SubscriptionTierConfig {
  id: string;
  name: string;
  description: string;
  amount: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  stripePriceId: string;
  zohoPlanCode: string;
  features: string[];
  limits: Record<string, number>;
  popular?: boolean;
  enterprise?: boolean;
}

export interface PaymentGatewayConfig {
  name: string;
  enabled: boolean;
  priority: number; // 1 = primary, 2 = secondary, etc.
  failureThreshold: number;
  timeoutSeconds: number;
  retryAttempts: number;
  circuitBreakerEnabled: boolean;
}

export interface BillingSystemConfig {
  environment: BillingEnvironmentConfig;
  subscriptionTiers: SubscriptionTierConfig[];
  paymentGateways: PaymentGatewayConfig[];
  exemptUserTypes: string[];
  trialDays: number;
  gracePeriodDays: number;
  maxRetryAttempts: number;
  webhookRetryDelay: number;
  invoiceRetentionDays: number;
  emailTemplates: EmailTemplateConfig;
}

export interface EmailTemplateConfig {
  paymentSucceeded: {
    subject: string;
    template: string;
  };
  paymentFailed: {
    subject: string;
    template: string;
  };
  trialEnding: {
    subject: string;
    template: string;
  };
  subscriptionCancelled: {
    subject: string;
    template: string;
  };
  invoiceGenerated: {
    subject: string;
    template: string;
  };
}

/**
 * Load billing configuration from environment variables
 */
export function loadBillingConfig(): BillingSystemConfig {
  // Load environment variables
  const environment: BillingEnvironmentConfig = {
    // Stripe
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceProof: process.env.STRIPE_PRICE_PROOF || '',
    stripePriceProofPlus: process.env.STRIPE_PRICE_PROOF_PLUS || '',

    // Zoho
    zohoApiKey: process.env.ZOHO_API_KEY || '',
    zohoSigningKey: process.env.ZOHO_SIGNING_KEY || '',
    zohoOrgId: process.env.ZOHO_ORG_ID,
    zohoPlanProof: process.env.ZOHO_PLAN_PROOF || '',
    zohoPlanProofPlus: process.env.ZOHO_PLAN_PROOF_PLUS || '',

    // Email
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    billingEmail: process.env.BILLING_EMAIL || 'billing@sovrenai.app',

    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/sovren',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // Application
    appUrl: process.env.APP_URL || 'https://sovrenai.app',
    environment: (process.env.NODE_ENV as any) || 'development'
  };

  // Subscription tiers
  const subscriptionTiers: SubscriptionTierConfig[] = [
    {
      id: 'sovren_proof',
      name: 'SOVREN Proof',
      description: 'Perfect for small to medium businesses getting started with AI-powered business intelligence',
      amount: 49700, // $497.00
      currency: 'USD',
      interval: 'month',
      stripePriceId: environment.stripePriceProof,
      zohoPlanCode: environment.zohoPlanProof,
      features: [
        '1,000 documents per month',
        'AI-powered analysis and insights',
        'PDF export and sharing',
        'Email support',
        'Basic integrations',
        'Standard Shadow Board (4 executives)'
      ],
      limits: {
        documents: 1000,
        integrations: 5,
        executives: 4,
        apiCalls: 10000
      },
      popular: true
    },
    {
      id: 'sovren_proof_plus',
      name: 'SOVREN Proof+',
      description: 'Advanced features for growing businesses and enterprises requiring maximum capability',
      amount: 79700, // $797.00
      currency: 'USD',
      interval: 'month',
      stripePriceId: environment.stripePriceProofPlus,
      zohoPlanCode: environment.zohoPlanProofPlus,
      features: [
        'Unlimited documents',
        'Advanced AI models and custom training',
        'Full API access',
        'Priority support (24/7)',
        'All integrations included',
        'Complete Shadow Board (8 executives)',
        'Custom reporting and analytics',
        'White-label options'
      ],
      limits: {
        documents: -1, // unlimited
        integrations: -1, // unlimited
        executives: 8,
        apiCalls: -1 // unlimited
      },
      enterprise: true
    }
  ];

  // Payment gateway configuration
  const paymentGateways: PaymentGatewayConfig[] = [
    {
      name: 'stripe',
      enabled: true,
      priority: 1, // Primary gateway
      failureThreshold: 3,
      timeoutSeconds: 300, // 5 minutes
      retryAttempts: 3,
      circuitBreakerEnabled: true
    },
    {
      name: 'zoho',
      enabled: true,
      priority: 2, // Fallback gateway
      failureThreshold: 3,
      timeoutSeconds: 300,
      retryAttempts: 3,
      circuitBreakerEnabled: true
    }
  ];

  // Email templates
  const emailTemplates: EmailTemplateConfig = {
    paymentSucceeded: {
      subject: 'SOVREN AI - Payment Receipt {{invoice_number}}',
      template: 'payment_succeeded'
    },
    paymentFailed: {
      subject: 'SOVREN AI - Payment Failed',
      template: 'payment_failed'
    },
    trialEnding: {
      subject: 'SOVREN AI - Your trial ends in {{days_remaining}} days',
      template: 'trial_ending'
    },
    subscriptionCancelled: {
      subject: 'SOVREN AI - Subscription Cancelled',
      template: 'subscription_cancelled'
    },
    invoiceGenerated: {
      subject: 'SOVREN AI - New Invoice {{invoice_number}}',
      template: 'invoice_generated'
    }
  };

  return {
    environment,
    subscriptionTiers,
    paymentGateways,
    exemptUserTypes: ['admin', 'it_analyst'],
    trialDays: 30,
    gracePeriodDays: 7,
    maxRetryAttempts: 3,
    webhookRetryDelay: 5000, // 5 seconds
    invoiceRetentionDays: 2555, // 7 years
    emailTemplates
  };
}

/**
 * Validate billing configuration
 */
export function validateBillingConfig(config: BillingSystemConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required Stripe configuration
  if (!config.environment.stripeSecretKey) {
    errors.push('STRIPE_SECRET_KEY is required');
  }
  if (!config.environment.stripePublishableKey) {
    errors.push('STRIPE_PUBLISHABLE_KEY is required');
  }
  if (!config.environment.stripeWebhookSecret) {
    warnings.push('STRIPE_WEBHOOK_SECRET is recommended for webhook security');
  }

  // Check Stripe price IDs
  if (!config.environment.stripePriceProof) {
    errors.push('STRIPE_PRICE_PROOF is required');
  }
  if (!config.environment.stripePriceProofPlus) {
    errors.push('STRIPE_PRICE_PROOF_PLUS is required');
  }

  // Check Zoho configuration (optional but recommended for failover)
  if (!config.environment.zohoApiKey) {
    warnings.push('ZOHO_API_KEY is recommended for payment failover');
  }
  if (!config.environment.zohoSigningKey) {
    warnings.push('ZOHO_SIGNING_KEY is recommended for webhook security');
  }

  // Check database configuration
  if (!config.environment.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  // Check email configuration
  if (!config.environment.billingEmail) {
    warnings.push('BILLING_EMAIL should be configured for receipt sending');
  }

  // Validate subscription tiers
  for (const tier of config.subscriptionTiers) {
    if (!tier.stripePriceId) {
      errors.push(`Stripe price ID missing for tier: ${tier.id}`);
    }
    if (tier.amount <= 0) {
      errors.push(`Invalid amount for tier: ${tier.id}`);
    }
  }

  // Check environment-specific requirements
  if (config.environment.environment === 'production') {
    if (config.environment.stripeSecretKey.startsWith('sk_test_')) {
      errors.push('Production environment should use live Stripe keys');
    }
    if (!config.environment.smtpUser || !config.environment.smtpPassword) {
      warnings.push('SMTP credentials should be configured for production email sending');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get subscription tier by ID
 */
export function getSubscriptionTier(config: BillingSystemConfig, tierId: string): SubscriptionTierConfig | null {
  return config.subscriptionTiers.find(tier => tier.id === tierId) || null;
}

/**
 * Get primary payment gateway
 */
export function getPrimaryPaymentGateway(config: BillingSystemConfig): PaymentGatewayConfig | null {
  return config.paymentGateways
    .filter(gateway => gateway.enabled)
    .sort((a, b) => a.priority - b.priority)[0] || null;
}

/**
 * Get fallback payment gateways
 */
export function getFallbackPaymentGateways(config: BillingSystemConfig): PaymentGatewayConfig[] {
  return config.paymentGateways
    .filter(gateway => gateway.enabled && gateway.priority > 1)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Check if user type is exempt from payment
 */
export function isExemptUserType(config: BillingSystemConfig, userType: string): boolean {
  return config.exemptUserTypes.includes(userType);
}

/**
 * Get trial end date for new user
 */
export function getTrialEndDate(config: BillingSystemConfig): Date {
  const now = new Date();
  return new Date(now.getTime() + config.trialDays * 24 * 60 * 60 * 1000);
}

// Export default configuration
export const defaultBillingConfig = loadBillingConfig();
