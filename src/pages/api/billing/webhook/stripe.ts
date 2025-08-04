/**
 * SOVREN AI - Stripe Webhook Handler API Route
 * 
 * Handles incoming Stripe webhooks for automated billing events.
 * Provides secure webhook verification and event processing.
 * 
 * CLASSIFICATION: BILLING WEBHOOK API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { SubscriptionBillingSystem } from '../../../../lib/billing/SubscriptionBillingSystem';
import { WebhookHandler } from '../../../../lib/billing/webhooks/WebhookHandler';

// Disable body parsing for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize billing system and webhook handler
let billingSystem: SubscriptionBillingSystem;
let webhookHandler: WebhookHandler;

function initializeBillingSystem() {
  if (!billingSystem) {
    billingSystem = new SubscriptionBillingSystem();
    webhookHandler = new WebhookHandler(billingSystem);
    console.log('🏦 Billing system initialized for Stripe webhooks');
  }
}

// Helper function to read raw body from Next.js request
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
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
      message: 'Only POST requests are accepted for webhooks'
    });
  }

  try {
    // Initialize billing system
    initializeBillingSystem();

    // Get raw body and signature
    const buf = await getRawBody(req);
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      console.error('❌ Missing Stripe signature header');
      return res.status(400).json({
        error: 'Missing signature',
        message: 'Stripe-Signature header is required'
      });
    }

    console.log('🔗 Received Stripe webhook');

    // Process webhook
    const result = await webhookHandler.handleStripeWebhook(buf, signature);

    if (result.success) {
      console.log(`✅ Stripe webhook processed successfully: ${result.eventType} (${result.eventId})`);
      
      // Log successful processing
      if (result.userId) {
        console.log(`👤 Event processed for user: ${result.userId}`);
      }

      return res.status(200).json({
        success: true,
        eventId: result.eventId,
        eventType: result.eventType,
        action: result.action,
        message: 'Webhook processed successfully'
      });
    } else {
      console.error(`❌ Stripe webhook processing failed: ${result.error}`);
      
      // Return appropriate status code based on error type
      const statusCode = result.retryable ? 500 : 400;
      
      return res.status(statusCode).json({
        success: false,
        eventId: result.eventId,
        eventType: result.eventType,
        error: result.error,
        retryable: result.retryable,
        message: 'Webhook processing failed'
      });
    }

  } catch (error) {
    console.error('❌ Stripe webhook handler error:', error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing the webhook',
      retryable: true
    });
  }
}

/**
 * Health check endpoint for webhook monitoring
 */
export async function healthCheck(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    initializeBillingSystem();
    
    const stats = webhookHandler.getWebhookStats();
    const gatewayStatus = billingSystem.getPaymentGatewayStatus();

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webhook_stats: stats,
      gateway_status: gatewayStatus,
      stripe: {
        available: gatewayStatus.stripe.available,
        state: gatewayStatus.stripe.state
      }
    });

  } catch (error) {
    console.error('❌ Webhook health check failed:', error);
    
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
