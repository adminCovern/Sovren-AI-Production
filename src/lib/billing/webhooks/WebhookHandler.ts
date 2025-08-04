/**
 * SOVREN AI - Billing Webhook Handler
 * 
 * Handles incoming webhooks from Stripe and Zoho for automated billing events.
 * Provides secure webhook verification and event processing.
 * 
 * CLASSIFICATION: WEBHOOK PROCESSING SYSTEM
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { SubscriptionBillingSystem } from '../SubscriptionBillingSystem';
import { defaultBillingConfig } from '../config/BillingConfig';

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string;
    idempotency_key?: string;
  };
}

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  eventType: string;
  action: string;
  userId?: string;
  error?: string;
  retryable?: boolean;
}

export interface ZohoWebhookEvent {
  event_id: string;
  event_type: string;
  event_time: string;
  data: any;
  organization_id: string;
}

export class WebhookHandler extends EventEmitter {
  private billingSystem: SubscriptionBillingSystem;
  private processedEvents: Set<string> = new Set();
  private eventRetryCount: Map<string, number> = new Map();
  private maxRetryAttempts = 3;

  constructor(billingSystem: SubscriptionBillingSystem) {
    super();
    this.billingSystem = billingSystem;
    console.log('🔗 Webhook Handler initialized');
  }

  /**
   * Handle Stripe webhook
   */
  public async handleStripeWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<WebhookProcessingResult> {
    console.log('🔗 Processing Stripe webhook');

    try {
      // Verify webhook signature
      const event = this.verifyStripeWebhook(payload, signature);
      
      // Check for duplicate events
      if (this.processedEvents.has(event.id)) {
        console.log(`⚠️ Duplicate Stripe event ignored: ${event.id}`);
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          action: 'duplicate_ignored'
        };
      }

      // Process the event
      const result = await this.processStripeEvent(event);
      
      // Mark as processed if successful
      if (result.success) {
        this.processedEvents.add(event.id);
        this.eventRetryCount.delete(event.id);
      } else if (result.retryable) {
        // Handle retryable errors
        const retryCount = this.eventRetryCount.get(event.id) || 0;
        if (retryCount < this.maxRetryAttempts) {
          this.eventRetryCount.set(event.id, retryCount + 1);
          console.log(`🔄 Retrying Stripe event ${event.id} (attempt ${retryCount + 1})`);
          
          // Schedule retry (in a real implementation, you'd use a queue)
          setTimeout(() => {
            this.processStripeEvent(event);
          }, 5000 * Math.pow(2, retryCount)); // Exponential backoff
        } else {
          console.error(`❌ Max retries exceeded for Stripe event: ${event.id}`);
          this.emit('webhookMaxRetriesExceeded', { event, error: result.error });
        }
      }

      return result;

    } catch (error) {
      console.error('❌ Stripe webhook processing failed:', error);
      return {
        success: false,
        eventId: 'unknown',
        eventType: 'unknown',
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: false
      };
    }
  }

  /**
   * Handle Zoho webhook
   */
  public async handleZohoWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<WebhookProcessingResult> {
    console.log('🔗 Processing Zoho webhook');

    try {
      // Verify webhook signature
      const event = this.verifyZohoWebhook(payload, signature);
      
      // Check for duplicate events
      if (this.processedEvents.has(event.event_id)) {
        console.log(`⚠️ Duplicate Zoho event ignored: ${event.event_id}`);
        return {
          success: true,
          eventId: event.event_id,
          eventType: event.event_type,
          action: 'duplicate_ignored'
        };
      }

      // Process the event
      const result = await this.processZohoEvent(event);
      
      // Mark as processed if successful
      if (result.success) {
        this.processedEvents.add(event.event_id);
        this.eventRetryCount.delete(event.event_id);
      }

      return result;

    } catch (error) {
      console.error('❌ Zoho webhook processing failed:', error);
      return {
        success: false,
        eventId: 'unknown',
        eventType: 'unknown',
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: false
      };
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  private verifyStripeWebhook(payload: string | Buffer, signature: string): WebhookEvent {
    const webhookSecret = defaultBillingConfig.environment.stripeWebhookSecret;
    
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    // Parse signature header
    const elements = signature.split(',');
    const signatureElements: Record<string, string> = {};
    
    for (const element of elements) {
      const [key, value] = element.split('=');
      signatureElements[key] = value;
    }

    const timestamp = signatureElements.t;
    const signatures = [signatureElements.v1];

    if (!timestamp || !signatures[0]) {
      throw new Error('Invalid Stripe signature format');
    }

    // Check timestamp (prevent replay attacks)
    const timestampNumber = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const tolerance = 300; // 5 minutes

    if (Math.abs(currentTime - timestampNumber) > tolerance) {
      throw new Error('Stripe webhook timestamp too old');
    }

    // Verify signature
    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    const signatureValid = signatures.some(signature => 
      crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    );

    if (!signatureValid) {
      throw new Error('Invalid Stripe webhook signature');
    }

    // Parse and return event
    try {
      return JSON.parse(payloadString);
    } catch (error) {
      throw new Error('Invalid Stripe webhook payload JSON');
    }
  }

  /**
   * Verify Zoho webhook signature
   */
  private verifyZohoWebhook(payload: string | Buffer, signature: string): ZohoWebhookEvent {
    const signingKey = defaultBillingConfig.environment.zohoSigningKey;
    
    if (!signingKey) {
      throw new Error('Zoho signing key not configured');
    }

    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
    
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', signingKey)
      .update(payloadString)
      .digest('hex');

    // Verify signature
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      throw new Error('Invalid Zoho webhook signature');
    }

    // Parse and return event
    try {
      return JSON.parse(payloadString);
    } catch (error) {
      throw new Error('Invalid Zoho webhook payload JSON');
    }
  }

  /**
   * Process Stripe event
   */
  private async processStripeEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    console.log(`📨 Processing Stripe event: ${event.type} (${event.id})`);

    try {
      let result: any;
      let userId: string | undefined;

      switch (event.type) {
        case 'invoice.payment_succeeded':
          result = await this.handleStripePaymentSucceeded(event.data.object);
          userId = event.data.object.metadata?.user_id;
          break;

        case 'invoice.payment_failed':
          result = await this.handleStripePaymentFailed(event.data.object);
          userId = event.data.object.metadata?.user_id;
          break;

        case 'customer.subscription.created':
          result = await this.handleStripeSubscriptionCreated(event.data.object);
          userId = event.data.object.metadata?.user_id;
          break;

        case 'customer.subscription.updated':
          result = await this.handleStripeSubscriptionUpdated(event.data.object);
          userId = event.data.object.metadata?.user_id;
          break;

        case 'customer.subscription.deleted':
          result = await this.handleStripeSubscriptionDeleted(event.data.object);
          userId = event.data.object.metadata?.user_id;
          break;

        case 'customer.subscription.trial_will_end':
          result = await this.handleStripeTrialWillEnd(event.data.object);
          userId = event.data.object.metadata?.user_id;
          break;

        case 'payment_method.attached':
          result = await this.handleStripePaymentMethodAttached(event.data.object);
          break;

        default:
          console.log(`ℹ️ Unhandled Stripe event type: ${event.type}`);
          result = { success: true, action: 'ignored' };
      }

      this.emit('stripeEventProcessed', {
        eventId: event.id,
        eventType: event.type,
        userId,
        result
      });

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        action: result.action || 'processed',
        userId
      };

    } catch (error) {
      console.error(`❌ Error processing Stripe event ${event.id}:`, error);
      
      this.emit('stripeEventError', {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        eventId: event.id,
        eventType: event.type,
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Process Zoho event
   */
  private async processZohoEvent(event: ZohoWebhookEvent): Promise<WebhookProcessingResult> {
    console.log(`📨 Processing Zoho event: ${event.event_type} (${event.event_id})`);

    try {
      let result: any;
      let userId: string | undefined;

      switch (event.event_type) {
        case 'subscription_activation':
          result = await this.handleZohoSubscriptionActivation(event.data);
          userId = event.data.custom_fields?.user_id;
          break;

        case 'payment_success':
          result = await this.handleZohoPaymentSuccess(event.data);
          userId = event.data.custom_fields?.user_id;
          break;

        case 'payment_failure':
          result = await this.handleZohoPaymentFailure(event.data);
          userId = event.data.custom_fields?.user_id;
          break;

        case 'subscription_cancellation':
          result = await this.handleZohoSubscriptionCancellation(event.data);
          userId = event.data.custom_fields?.user_id;
          break;

        default:
          console.log(`ℹ️ Unhandled Zoho event type: ${event.event_type}`);
          result = { success: true, action: 'ignored' };
      }

      this.emit('zohoEventProcessed', {
        eventId: event.event_id,
        eventType: event.event_type,
        userId,
        result
      });

      return {
        success: true,
        eventId: event.event_id,
        eventType: event.event_type,
        action: result.action || 'processed',
        userId
      };

    } catch (error) {
      console.error(`❌ Error processing Zoho event ${event.event_id}:`, error);
      
      this.emit('zohoEventError', {
        eventId: event.event_id,
        eventType: event.event_type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        eventId: event.event_id,
        eventType: event.event_type,
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Stripe event handlers
   */
  private async handleStripePaymentSucceeded(invoice: any): Promise<{ action: string }> {
    console.log(`✅ Stripe payment succeeded: ${invoice.id}`);
    
    const result = await this.billingSystem.handleWebhook({
      type: 'invoice.payment_succeeded',
      data: { object: invoice }
    });

    return { action: 'payment_succeeded' };
  }

  private async handleStripePaymentFailed(invoice: any): Promise<{ action: string }> {
    console.log(`❌ Stripe payment failed: ${invoice.id}`);
    
    const result = await this.billingSystem.handleWebhook({
      type: 'invoice.payment_failed',
      data: { object: invoice }
    });

    return { action: 'payment_failed' };
  }

  private async handleStripeSubscriptionCreated(subscription: any): Promise<{ action: string }> {
    console.log(`🆕 Stripe subscription created: ${subscription.id}`);
    return { action: 'subscription_created' };
  }

  private async handleStripeSubscriptionUpdated(subscription: any): Promise<{ action: string }> {
    console.log(`🔄 Stripe subscription updated: ${subscription.id}`);
    return { action: 'subscription_updated' };
  }

  private async handleStripeSubscriptionDeleted(subscription: any): Promise<{ action: string }> {
    console.log(`🗑️ Stripe subscription deleted: ${subscription.id}`);
    return { action: 'subscription_deleted' };
  }

  private async handleStripeTrialWillEnd(subscription: any): Promise<{ action: string }> {
    console.log(`⏰ Stripe trial will end: ${subscription.id}`);
    
    const result = await this.billingSystem.handleWebhook({
      type: 'customer.subscription.trial_will_end',
      data: { object: subscription }
    });

    return { action: 'trial_will_end' };
  }

  private async handleStripePaymentMethodAttached(paymentMethod: any): Promise<{ action: string }> {
    console.log(`💳 Stripe payment method attached: ${paymentMethod.id}`);
    return { action: 'payment_method_attached' };
  }

  /**
   * Zoho event handlers
   */
  private async handleZohoSubscriptionActivation(data: any): Promise<{ action: string }> {
    console.log(`✅ Zoho subscription activated: ${data.subscription_id}`);
    return { action: 'subscription_activated' };
  }

  private async handleZohoPaymentSuccess(data: any): Promise<{ action: string }> {
    console.log(`✅ Zoho payment succeeded: ${data.payment_id}`);
    return { action: 'payment_succeeded' };
  }

  private async handleZohoPaymentFailure(data: any): Promise<{ action: string }> {
    console.log(`❌ Zoho payment failed: ${data.payment_id}`);
    return { action: 'payment_failed' };
  }

  private async handleZohoSubscriptionCancellation(data: any): Promise<{ action: string }> {
    console.log(`🚫 Zoho subscription cancelled: ${data.subscription_id}`);
    return { action: 'subscription_cancelled' };
  }

  /**
   * Utility methods
   */
  private isRetryableError(error: any): boolean {
    // Determine if an error is retryable
    if (error instanceof Error) {
      const retryableMessages = [
        'timeout',
        'network',
        'connection',
        'temporary',
        'rate limit'
      ];
      
      const message = error.message.toLowerCase();
      return retryableMessages.some(keyword => message.includes(keyword));
    }
    
    return false;
  }

  /**
   * Get webhook processing statistics
   */
  public getWebhookStats(): {
    processedEvents: number;
    retryingEvents: number;
    maxRetryAttempts: number;
  } {
    return {
      processedEvents: this.processedEvents.size,
      retryingEvents: this.eventRetryCount.size,
      maxRetryAttempts: this.maxRetryAttempts
    };
  }

  /**
   * Clear processed events cache (for memory management)
   */
  public clearProcessedEventsCache(): void {
    this.processedEvents.clear();
    console.log('🧹 Webhook processed events cache cleared');
  }
}
