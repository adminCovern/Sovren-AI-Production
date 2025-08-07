import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDatabaseManager } from '@/database/connection';
import { withAuth } from '@/middleware/authentication';

/**
 * Stripe Payment Integration API
 * IMMEDIATE DEPLOYMENT - Complete payment processing
 * NO PLACEHOLDERS - Full production implementation
 */

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Subscription price IDs
const PRICE_IDS = {
  sovren_proof: process.env.STRIPE_PRICE_ID_PROOF!,
  sovren_proof_plus: process.env.STRIPE_PRICE_ID_PROOF_PLUS!
};

/**
 * POST /api/payments/stripe - Create subscription
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { priceId, paymentMethodId, subscriptionTier } = body;

    // Validate subscription tier
    if (!['sovren_proof', 'sovren_proof_plus'].includes(subscriptionTier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Validate price ID matches tier
    if (priceId !== PRICE_IDS[subscriptionTier as keyof typeof PRICE_IDS]) {
      return NextResponse.json(
        { error: 'Price ID does not match subscription tier' },
        { status: 400 }
      );
    }

    const db = getDatabaseManager();

    // Check if user already has an active subscription
    const existingSubscription = await db.query(
      'SELECT subscription_status FROM users WHERE id = $1',
      [user.id]
    );

    if (existingSubscription.rows[0]?.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    
    const existingCustomer = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (existingCustomer.data.length > 0) {
      customerId = existingCustomer.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
          subscriptionTier
        }
      });
      customerId = customer.id;
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user.id,
        subscriptionTier
      }
    });

    // Update user in database
    await db.query(`
      UPDATE users 
      SET subscription_tier = $1, subscription_status = $2, updated_at = NOW()
      WHERE id = $3
    `, [subscriptionTier, 'active', user.id]);

    // Create subscription usage record
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await db.query(`
      INSERT INTO subscription_usage (
        user_id, usage_type, usage_count, usage_limit, 
        billing_period_start, billing_period_end
      ) VALUES 
        ($1, 'voice_synthesis', 0, $2, $3, $4),
        ($1, 'executive_interactions', 0, $5, $3, $4),
        ($1, 'coordination_sessions', 0, $6, $3, $4)
    `, [
      user.id,
      subscriptionTier === 'sovren_proof_plus' ? 10000 : 1000, // Voice synthesis limit
      subscriptionTier === 'sovren_proof_plus' ? 5000 : 500,   // Interactions limit
      subscriptionTier === 'sovren_proof_plus' ? 100 : 10,     // Coordination limit
      periodStart,
      periodEnd
    ]);

    // Log the subscription creation
    await db.query(`
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, new_values
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      user.id,
      'subscription_created',
      'subscription',
      subscription.id,
      JSON.stringify({ subscriptionTier, priceId, customerId })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        subscriptionTier,
        currentPeriodEnd: (subscription as any).current_period_end
      }
    });

  } catch (error) {
    console.error('❌ Stripe subscription creation error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/payments/stripe - Get subscription status
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const db = getDatabaseManager();

    // Get user's current subscription info
    const userResult = await db.query(
      'SELECT subscription_tier, subscription_status FROM users WHERE id = $1',
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userResult.rows[0];

    // Get usage data for current billing period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usageResult = await db.query(`
      SELECT usage_type, usage_count, usage_limit
      FROM subscription_usage
      WHERE user_id = $1 
        AND billing_period_start = $2 
        AND billing_period_end = $3
    `, [user.id, periodStart, periodEnd]);

    const usage = usageResult.rows.reduce((acc, row) => {
      acc[row.usage_type] = {
        used: row.usage_count,
        limit: row.usage_limit,
        remaining: row.usage_limit - row.usage_count
      };
      return acc;
    }, {});

    // Get Stripe subscription if active
    let stripeSubscription = null;
    if (userData.subscription_status === 'active') {
      try {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1
        });

        if (customers.data.length > 0) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: 'active',
            limit: 1
          });

          if (subscriptions.data.length > 0) {
            stripeSubscription = subscriptions.data[0];
          }
        }
      } catch (stripeError) {
        console.warn('⚠️ Failed to fetch Stripe subscription:', stripeError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptionTier: userData.subscription_tier,
        subscriptionStatus: userData.subscription_status,
        usage,
        stripeSubscription: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodStart: (stripeSubscription as any).current_period_start,
          currentPeriodEnd: (stripeSubscription as any).current_period_end,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Get subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/payments/stripe - Update subscription
 */
export const PUT = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { action, subscriptionTier } = body;

    if (!['upgrade', 'downgrade', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const db = getDatabaseManager();

    // Get Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 404 }
      );
    }

    const customer = customers.data[0];

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const subscription = subscriptions.data[0];

    if (action === 'cancel') {
      // Cancel subscription at period end
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true
      });

      // Log cancellation
      await db.query(`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, new_values
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        user.id,
        'subscription_cancelled',
        'subscription',
        subscription.id,
        JSON.stringify({ cancelAtPeriodEnd: true })
      ]);

      return NextResponse.json({
        success: true,
        data: {
          message: 'Subscription will be cancelled at the end of the current period',
          cancelAtPeriodEnd: true
        }
      });

    } else {
      // Upgrade or downgrade
      const newPriceId = PRICE_IDS[subscriptionTier as keyof typeof PRICE_IDS];
      
      if (!newPriceId) {
        return NextResponse.json(
          { error: 'Invalid subscription tier' },
          { status: 400 }
        );
      }

      // Update subscription
      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'always_invoice'
      });

      // Update user in database
      await db.query(`
        UPDATE users 
        SET subscription_tier = $1, updated_at = NOW()
        WHERE id = $2
      `, [subscriptionTier, user.id]);

      // Log the change
      await db.query(`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, new_values
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        user.id,
        `subscription_${action}`,
        'subscription',
        subscription.id,
        JSON.stringify({ newTier: subscriptionTier, newPriceId })
      ]);

      return NextResponse.json({
        success: true,
        data: {
          subscriptionId: updatedSubscription.id,
          newTier: subscriptionTier,
          status: updatedSubscription.status
        }
      });
    }

  } catch (error) {
    console.error('❌ Stripe subscription update error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
});
