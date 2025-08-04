/**
 * SOVREN AI - User Billing Status API Route
 * 
 * Provides billing status information for users including subscription details,
 * payment history, and trial information.
 * 
 * CLASSIFICATION: BILLING STATUS API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { SubscriptionBillingSystem } from '../../../../../lib/billing/SubscriptionBillingSystem';
import { OnboardingPaymentFlow } from '../../../../../lib/billing/OnboardingPaymentFlow';

// Initialize billing system
let billingSystem: SubscriptionBillingSystem;
let paymentFlow: OnboardingPaymentFlow;

function initializeBillingSystem() {
  if (!billingSystem) {
    billingSystem = new SubscriptionBillingSystem();
    paymentFlow = new OnboardingPaymentFlow(billingSystem);
    console.log('🏦 Billing system initialized for status queries');
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID',
      message: 'User ID is required and must be a string'
    });
  }

  try {
    // Initialize billing system
    initializeBillingSystem();

    switch (req.method) {
      case 'GET':
        return await handleGetUserStatus(req, res, userId);
      case 'POST':
        return await handleUpdateUserStatus(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          error: 'Method not allowed',
          message: 'Only GET and POST requests are accepted'
        });
    }

  } catch (error) {
    console.error(`❌ Error handling billing status for user ${userId}:`, error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching billing status'
    });
  }
}

/**
 * Get user billing status
 */
async function handleGetUserStatus(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    console.log(`📊 Fetching billing status for user: ${userId}`);

    // Get payment status
    const paymentStatus = await paymentFlow.getUserPaymentStatus(userId);
    
    // Get billing profile
    const billingProfile = billingSystem.getBillingProfile(userId);
    
    // Get subscriptions
    const subscriptions = billingSystem.getUserSubscriptions(userId);
    
    // Get billing history
    const billingHistory = await paymentFlow.getBillingHistory(userId);
    
    // Get payment gateway status
    const gatewayStatus = billingSystem.getPaymentGatewayStatus();

    const response = {
      success: true,
      userId,
      timestamp: new Date().toISOString(),
      paymentStatus,
      billingProfile: billingProfile ? {
        userType: billingProfile.userType,
        subscriptionTier: billingProfile.subscriptionTier,
        billingStatus: billingProfile.billingStatus,
        trialEndsAt: billingProfile.trialEndsAt,
        createdAt: billingProfile.createdAt,
        updatedAt: billingProfile.updatedAt
      } : null,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        amount: sub.amount,
        currency: sub.currency,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        gateway: sub.gateway,
        createdAt: sub.createdAt
      })),
      billingHistory: {
        invoices: billingHistory.invoices.slice(0, 10), // Last 10 invoices
        transactions: billingHistory.transactions.slice(0, 10), // Last 10 transactions
        subscriptions: billingHistory.subscriptions
      },
      gatewayStatus: {
        activeGateway: gatewayStatus.activeGateway,
        stripe: {
          available: gatewayStatus.stripe.available,
          state: gatewayStatus.stripe.state
        },
        zoho: {
          available: gatewayStatus.zoho.available,
          state: gatewayStatus.zoho.state
        }
      }
    };

    console.log(`✅ Billing status retrieved for user: ${userId}`);
    return res.status(200).json(response);

  } catch (error) {
    console.error(`❌ Error fetching billing status for user ${userId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch billing status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update user billing status (for admin operations)
 */
async function handleUpdateUserStatus(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { action, ...params } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Missing action',
        message: 'Action parameter is required'
      });
    }

    console.log(`🔧 Updating billing status for user: ${userId}, action: ${action}`);

    let result: any;

    switch (action) {
      case 'cancel_subscription':
        result = await paymentFlow.cancelSubscription(userId, params.reason);
        break;

      case 'update_payment_method':
        if (!params.paymentMethodId) {
          return res.status(400).json({
            success: false,
            error: 'Missing payment method ID'
          });
        }
        result = await paymentFlow.updatePaymentMethod(userId, params.paymentMethodId);
        break;

      case 'send_payment_reminder':
        result = await paymentFlow.sendPaymentReminder(userId);
        break;

      case 'handle_trial_conversion':
        result = await paymentFlow.handleTrialConversion(userId);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: `Action '${action}' is not supported`
        });
    }

    if (result.success) {
      console.log(`✅ Billing status updated for user: ${userId}, action: ${action}`);
      return res.status(200).json({
        success: true,
        action,
        message: result.message,
        ...result
      });
    } else {
      console.error(`❌ Failed to update billing status for user: ${userId}, action: ${action}`, result.error);
      return res.status(400).json({
        success: false,
        action,
        error: result.error,
        message: result.message
      });
    }

  } catch (error) {
    console.error(`❌ Error updating billing status for user ${userId}:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update billing status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
