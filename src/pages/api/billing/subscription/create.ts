/**
 * SOVREN AI - Create Subscription API Route
 * 
 * Handles subscription creation during onboarding with automatic failover
 * between Stripe and Zoho payment gateways.
 * 
 * CLASSIFICATION: BILLING SUBSCRIPTION API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { SubscriptionBillingSystem } from '../../../../lib/billing/SubscriptionBillingSystem';
import { OnboardingPaymentFlow } from '../../../../lib/billing/OnboardingPaymentFlow';
import { defaultBillingConfig, validateBillingConfig } from '../../../../lib/billing/config/BillingConfig';

// Initialize billing system
let billingSystem: SubscriptionBillingSystem;
let paymentFlow: OnboardingPaymentFlow;

function initializeBillingSystem() {
  if (!billingSystem) {
    // Validate configuration
    const configValidation = validateBillingConfig(defaultBillingConfig);
    if (!configValidation.valid) {
      throw new Error(`Billing configuration invalid: ${configValidation.errors.join(', ')}`);
    }

    billingSystem = new SubscriptionBillingSystem();
    paymentFlow = new OnboardingPaymentFlow(billingSystem);
    console.log('🏦 Billing system initialized for subscription creation');
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    // Initialize billing system
    initializeBillingSystem();

    // Validate request body
    const { userId, paymentMethodId, subscriptionTier, userInfo } = req.body;

    if (!userId || !paymentMethodId || !subscriptionTier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId, paymentMethodId, and subscriptionTier are required'
      });
    }

    if (!['sovren_proof', 'sovren_proof_plus'].includes(subscriptionTier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription tier',
        message: 'subscriptionTier must be either sovren_proof or sovren_proof_plus'
      });
    }

    console.log(`💳 Creating subscription for user: ${userId}, tier: ${subscriptionTier}`);

    // Process payment and create subscription
    const result = await paymentFlow.completePaymentAndOnboarding(
      userId,
      paymentMethodId,
      subscriptionTier
    );

    if (result.success) {
      console.log(`✅ Subscription created successfully for user: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Subscription created successfully',
        subscriptionActive: result.subscriptionActive,
        accessGranted: result.accessGranted,
        features: result.features,
        nextStep: result.nextStep
      });
    } else {
      console.error(`❌ Subscription creation failed for user: ${userId}`, result.error);
      
      return res.status(400).json({
        success: false,
        error: result.error,
        message: 'Subscription creation failed',
        retry: result.retry,
        nextStep: result.nextStep
      });
    }

  } catch (error) {
    console.error('❌ Subscription creation error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while creating the subscription'
    });
  }
}

/**
 * Get subscription tiers endpoint
 */
export async function getSubscriptionTiers(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tiers = defaultBillingConfig.subscriptionTiers.map(tier => ({
      id: tier.id,
      name: tier.name,
      description: tier.description,
      amount: tier.amount,
      currency: tier.currency,
      interval: tier.interval,
      features: tier.features,
      limits: tier.limits,
      popular: tier.popular,
      enterprise: tier.enterprise
    }));

    return res.status(200).json({
      success: true,
      tiers
    });

  } catch (error) {
    console.error('❌ Error fetching subscription tiers:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription tiers'
    });
  }
}
