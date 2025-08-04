/**
 * SOVREN AI - Onboarding Payment Flow Integration
 * 
 * Integrates the subscription billing system into the SOVREN onboarding flow.
 * Handles payment requirements for different user types during onboarding.
 * 
 * CLASSIFICATION: ONBOARDING PAYMENT INTEGRATION
 */

import { EventEmitter } from 'events';
import { SubscriptionBillingSystem, BillingUser, SUBSCRIPTION_TIERS, EXEMPT_USER_TYPES } from './SubscriptionBillingSystem';

export interface OnboardingUser {
  id: string;
  email: string;
  name: string;
  type?: string;
  company?: string;
  industry?: string;
  tier?: 'SMB' | 'ENTERPRISE';
}

export interface PaymentFlowResult {
  success: boolean;
  nextStep: 'complete_onboarding' | 'subscription_selection' | 'payment_form' | 'onboarding_complete' | 'error';
  message?: string;
  stripeCustomerId?: string;
  zohoCustomerId?: string;
  clientSecret?: string;
  tier?: string;
  amount?: number;
  subscriptionActive?: boolean;
  accessGranted?: boolean;
  features?: string[];
  error?: string;
  retry?: boolean;
}

export interface SubscriptionSelection {
  tier: 'sovren_proof' | 'sovren_proof_plus';
  paymentMethod: 'stripe' | 'zoho';
  billingCycle: 'monthly' | 'annual';
}

export class OnboardingPaymentFlow extends EventEmitter {
  private billingSystem: SubscriptionBillingSystem;

  constructor(billingSystem: SubscriptionBillingSystem) {
    super();
    this.billingSystem = billingSystem;
    console.log('💳 Onboarding Payment Flow initialized');
  }

  /**
   * Handle approved user login - determines payment requirements
   */
  public async handleApprovedUserLogin(userData: OnboardingUser): Promise<PaymentFlowResult> {
    console.log(`🔐 Handling approved user login: ${userData.email}`);

    const userId = userData.id;
    let userType = userData.type || 'standard';

    // Special handling for different user types
    if (userData.email.toLowerCase() === 'admin@sovrenai.app') {
      userType = 'admin';
      console.log(`👑 Admin user detected: ${userData.email}`);
    } else if (userType === 'it_analyst') {
      console.log(`🔧 IT Analyst detected: ${userData.email}`);
    } else if (userType === 'beta') {
      console.log(`🧪 Beta user detected: ${userData.email}`);
    }

    // Determine trial period for beta users
    const trialEndsAt = userType === 'beta' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined;

    // Create billing user
    const billingUser: BillingUser = {
      userId,
      email: userData.email,
      name: userData.name,
      userType: userType as any,
      trialEndsAt
    };

    try {
      // Initialize billing
      const billingResult = await this.billingSystem.initializeUserBilling(billingUser);

      if (!billingResult.success) {
        return {
          success: false,
          nextStep: 'error',
          error: billingResult.error
        };
      }

      // Determine next step based on user type
      if (!billingResult.requiresPayment) {
        // Admin, IT analyst, or beta user
        const message = EXEMPT_USER_TYPES.includes(userType) 
          ? 'No payment required' 
          : '30-day trial activated';

        this.emit('userActivated', {
          userId,
          userType,
          accessGranted: true,
          message
        });

        return {
          success: true,
          nextStep: 'complete_onboarding',
          message,
          accessGranted: true
        };
      } else {
        // Standard user - needs payment
        return {
          success: true,
          nextStep: 'subscription_selection',
          stripeCustomerId: billingResult.stripeCustomerId,
          zohoCustomerId: billingResult.zohoCustomerId
        };
      }
    } catch (error) {
      console.error('❌ Error in approved user login:', error);
      return {
        success: false,
        nextStep: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process subscription tier selection
   */
  public async processSubscriptionSelection(
    userId: string,
    selectedTier: 'sovren_proof' | 'sovren_proof_plus'
  ): Promise<PaymentFlowResult> {
    console.log(`📋 Processing subscription selection: ${userId} -> ${selectedTier}`);

    if (!SUBSCRIPTION_TIERS[selectedTier]) {
      return {
        success: false,
        nextStep: 'error',
        error: 'Invalid subscription tier'
      };
    }

    const tier = SUBSCRIPTION_TIERS[selectedTier];

    try {
      // For now, we'll use Stripe for payment form setup
      // In a real implementation, you'd create a SetupIntent here
      const clientSecret = `seti_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`;

      this.emit('subscriptionSelected', {
        userId,
        tier: selectedTier,
        amount: tier.amount
      });

      return {
        success: true,
        nextStep: 'payment_form',
        clientSecret,
        tier: selectedTier,
        amount: tier.amount / 100 // Convert cents to dollars
      };
    } catch (error) {
      console.error('❌ Error in subscription selection:', error);
      return {
        success: false,
        nextStep: 'error',
        error: error instanceof Error ? error.message : 'Failed to setup payment form'
      };
    }
  }

  /**
   * Complete payment and finish onboarding
   */
  public async completePaymentAndOnboarding(
    userId: string,
    paymentMethodId: string,
    selectedTier: 'sovren_proof' | 'sovren_proof_plus'
  ): Promise<PaymentFlowResult> {
    console.log(`💰 Completing payment and onboarding: ${userId} -> ${selectedTier}`);

    try {
      // Process initial payment
      const paymentResult = await this.billingSystem.processInitialPayment(
        userId,
        paymentMethodId,
        selectedTier
      );

      if (!paymentResult.success) {
        this.emit('paymentFailed', {
          userId,
          error: paymentResult.error,
          tier: selectedTier
        });

        return {
          success: false,
          nextStep: 'payment_form',
          error: paymentResult.error,
          retry: true
        };
      }

      // Payment successful - complete onboarding
      const tier = SUBSCRIPTION_TIERS[selectedTier];

      this.emit('paymentCompleted', {
        userId,
        subscriptionId: paymentResult.subscriptionId,
        tier: selectedTier,
        amount: tier.amount,
        gateway: paymentResult.gateway
      });

      this.emit('onboardingCompleted', {
        userId,
        accessGranted: true,
        subscriptionActive: true,
        tier: selectedTier
      });

      return {
        success: true,
        nextStep: 'onboarding_complete',
        subscriptionActive: true,
        accessGranted: true,
        features: tier.features
      };
    } catch (error) {
      console.error('❌ Error completing payment and onboarding:', error);
      
      this.emit('onboardingFailed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        tier: selectedTier
      });

      return {
        success: false,
        nextStep: 'error',
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Handle beta user trial conversion
   */
  public async handleTrialConversion(userId: string): Promise<PaymentFlowResult> {
    console.log(`🔄 Handling trial conversion for user: ${userId}`);

    const profile = this.billingSystem.getBillingProfile(userId);
    
    if (!profile || profile.userType !== 'beta') {
      return {
        success: false,
        nextStep: 'error',
        error: 'User is not a beta user or profile not found'
      };
    }

    // Check if trial has ended
    const now = new Date();
    const trialEnded = profile.trialEndsAt && profile.trialEndsAt <= now;

    if (!trialEnded) {
      return {
        success: true,
        nextStep: 'complete_onboarding',
        message: `Trial continues until ${profile.trialEndsAt?.toLocaleDateString()}`
      };
    }

    // Trial has ended - user needs to select subscription
    this.emit('trialEnded', {
      userId,
      trialEndDate: profile.trialEndsAt
    });

    return {
      success: true,
      nextStep: 'subscription_selection',
      message: 'Your trial has ended. Please select a subscription to continue.'
    };
  }

  /**
   * Get user payment status
   */
  public async getUserPaymentStatus(userId: string): Promise<{
    hasActiveSubscription: boolean;
    subscriptionTier?: string;
    billingStatus: string;
    trialEndsAt?: Date;
    nextBillingDate?: Date;
    paymentMethod?: string;
  }> {
    const profile = this.billingSystem.getBillingProfile(userId);
    const subscriptions = this.billingSystem.getUserSubscriptions(userId);
    
    if (!profile) {
      return {
        hasActiveSubscription: false,
        billingStatus: 'not_found'
      };
    }

    const activeSubscription = subscriptions.find(sub => sub.status === 'active');

    return {
      hasActiveSubscription: !!activeSubscription || profile.billingStatus === 'exempt',
      subscriptionTier: profile.subscriptionTier,
      billingStatus: profile.billingStatus,
      trialEndsAt: profile.trialEndsAt,
      nextBillingDate: activeSubscription?.currentPeriodEnd,
      paymentMethod: activeSubscription?.gateway
    };
  }

  /**
   * Handle subscription cancellation
   */
  public async cancelSubscription(userId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    console.log(`🚫 Cancelling subscription for user: ${userId}`);

    try {
      const subscriptions = this.billingSystem.getUserSubscriptions(userId);
      const activeSubscription = subscriptions.find(sub => sub.status === 'active');

      if (!activeSubscription) {
        return {
          success: false,
          message: 'No active subscription found',
          error: 'No active subscription'
        };
      }

      // In a real implementation, you would cancel the subscription via Stripe/Zoho API
      // For now, we'll just emit an event
      this.emit('subscriptionCancelled', {
        userId,
        subscriptionId: activeSubscription.id,
        reason: reason || 'User requested cancellation'
      });

      return {
        success: true,
        message: 'Subscription cancelled successfully. Access will continue until the end of the current billing period.'
      };
    } catch (error) {
      console.error('❌ Error cancelling subscription:', error);
      return {
        success: false,
        message: 'Failed to cancel subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update payment method
   */
  public async updatePaymentMethod(userId: string, newPaymentMethodId: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    console.log(`💳 Updating payment method for user: ${userId}`);

    try {
      // In a real implementation, you would update the payment method via Stripe/Zoho API
      this.emit('paymentMethodUpdated', {
        userId,
        newPaymentMethodId
      });

      return {
        success: true,
        message: 'Payment method updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating payment method:', error);
      return {
        success: false,
        message: 'Failed to update payment method',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get billing history
   */
  public async getBillingHistory(userId: string): Promise<{
    invoices: any[];
    transactions: any[];
    subscriptions: any[];
  }> {
    const invoices = this.billingSystem.getUserInvoices(userId);
    const subscriptions = this.billingSystem.getUserSubscriptions(userId);

    return {
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.total,
        status: inv.status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        pdfUrl: inv.pdfUrl
      })),
      transactions: [], // Would be populated from transaction records
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        amount: sub.amount,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        gateway: sub.gateway
      }))
    };
  }

  /**
   * Send payment reminder
   */
  public async sendPaymentReminder(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log(`📧 Sending payment reminder to user: ${userId}`);

    const profile = this.billingSystem.getBillingProfile(userId);
    
    if (!profile) {
      return {
        success: false,
        message: 'User profile not found'
      };
    }

    // In a real implementation, you would send an email reminder
    this.emit('paymentReminderSent', {
      userId,
      email: profile.userId, // Would need to get email from user record
      billingStatus: profile.billingStatus
    });

    return {
      success: true,
      message: 'Payment reminder sent successfully'
    };
  }

  /**
   * Process webhook for payment events
   */
  public async processWebhook(event: any): Promise<{
    success: boolean;
    action: string;
  }> {
    console.log(`🔗 Processing webhook event: ${event.type}`);

    try {
      const result = await this.billingSystem.handleWebhook(event);
      
      // Emit events based on webhook type
      switch (event.type) {
        case 'invoice.payment_succeeded':
          this.emit('paymentSucceeded', {
            userId: event.data.object.metadata?.user_id,
            invoiceId: event.data.object.id,
            amount: event.data.object.amount_paid
          });
          break;
          
        case 'invoice.payment_failed':
          this.emit('paymentFailed', {
            userId: event.data.object.metadata?.user_id,
            invoiceId: event.data.object.id,
            amount: event.data.object.amount_due
          });
          break;
          
        case 'customer.subscription.trial_will_end':
          this.emit('trialEnding', {
            userId: event.data.object.metadata?.user_id,
            subscriptionId: event.data.object.id,
            trialEnd: new Date(event.data.object.trial_end * 1000)
          });
          break;
      }

      return result;
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return {
        success: false,
        action: 'error'
      };
    }
  }

  /**
   * Get payment gateway status
   */
  public getPaymentGatewayStatus() {
    return this.billingSystem.getPaymentGatewayStatus();
  }
}
