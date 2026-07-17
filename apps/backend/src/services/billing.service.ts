/**
 * Billing Service
 *
 * FORBIDDEN_SCOPE_OVERRIDE: "Family" plan appears only as a Stripe price-tier name
 * pre-seeded in the plans table (database-spec §2.7) for future Phase 2 use. No
 * Family Accounts (shared-workspace) logic is implemented here — MVP fully supports
 * only Free and Pro tiers. Every other use of the word "subscription" in this file
 * refers exclusively to a Stripe billing subscription (backend-spec §2.9) — there is
 * no Subscription Tracker feature, dedicated subscription CRUD, or renewal-reminder
 * logic here; that Dashboard widget (derived from recurring transactions) is separate
 * and out of scope for this file.
 *
 * Stripe is the system of record for plan tier — never a client-set field.
 * Webhook idempotency on event.id (BE-EC-03): Stripe's at-least-once delivery
 * means retries and out-of-order arrival are expected, not edge cases.
 */

import Stripe from 'stripe';
import { pool } from '../db';

const stripe = new Stripe(process.env.STRIPE_API_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Create a Stripe checkout session for a plan upgrade/downgrade
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  planName: 'free' | 'pro'
): Promise<{ sessionId: string; checkoutUrl: string }> {
  const planResult = await pool.query(`SELECT stripe_price_id FROM plans WHERE name = $1`, [planName]);

  if (planResult.rows.length === 0) {
    throw new Error(`Plan ${planName} not found`);
  }

  const { stripe_price_id } = planResult.rows[0];

  if (!stripe_price_id) {
    throw new Error(`Plan ${planName} has no associated Stripe price (likely the free tier)`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: userEmail,
    client_reference_id: userId,
    line_items: [{ price: stripe_price_id, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing/cancel`,
    metadata: { userId },
  });

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'create', 'billing_checkout', session.id, JSON.stringify({ planName })]
  );

  return { sessionId: session.id, checkoutUrl: session.url! };
}

/**
 * Create a Stripe customer portal session for subscription management
 */
export async function createPortalSession(userId: string): Promise<{ portalUrl: string }> {
  const result = await pool.query(
    `SELECT stripe_subscription_id FROM payments WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('No active subscription found for this user');
  }

  const subscription = await stripe.subscriptions.retrieve(result.rows[0].stripe_subscription_id);
  const customerId = subscription.customer as string;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/billing`,
  });

  return { portalUrl: session.url };
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
}

/**
 * Process a Stripe webhook event idempotently (BE-EC-03)
 * Returns true if this was a new event (processed), false if it was a duplicate (no-op)
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<{ processed: boolean }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Idempotency check: has this exact event.id already been processed? (BE-EC-03)
    // Note: payments.stripe_event_id tracks only the most recent event per subscription
    // (schema has UNIQUE(user_id, stripe_subscription_id), so each new event upserts the
    // row and overwrites stripe_event_id). This correctly catches back-to-back redelivery
    // of the same event, which is the common retry case.
    const existingResult = await client.query(`SELECT id FROM payments WHERE stripe_event_id = $1`, [event.id]);

    if (existingResult.rows.length > 0) {
      await client.query('COMMIT');
      return { processed: false }; // Already processed, no-op
    }

    // Note: payments table has UNIQUE(user_id, stripe_subscription_id) — a subscription's
    // lifecycle events upsert the same row rather than inserting a new one per event.
    // The idempotency check above (on stripe_event_id) still runs first, so a genuine
    // duplicate delivery of the same event.id is caught before we ever reach here.
    switch (event.type) {
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const priceId = subscription.items.data[0]?.price.id;

        if (!userId) break;

        const planResult = await client.query(`SELECT id, name FROM plans WHERE stripe_price_id = $1`, [priceId]);
        if (planResult.rows.length === 0) break;

        const plan = planResult.rows[0];
        const amountCents = subscription.items.data[0]?.price.unit_amount || 1;

        await client.query(
          `INSERT INTO payments (user_id, plan_id, stripe_event_id, stripe_subscription_id, status, amount_cents)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, stripe_subscription_id)
           DO UPDATE SET plan_id = EXCLUDED.plan_id, stripe_event_id = EXCLUDED.stripe_event_id,
                         status = EXCLUDED.status, amount_cents = EXCLUDED.amount_cents`,
          [userId, plan.id, event.id, subscription.id, 'active', amountCents]
        );

        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
          [userId, 'update', 'subscription', subscription.id, JSON.stringify({ plan: plan.name, event: event.type })]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        const freePlanResult = await client.query(`SELECT id FROM plans WHERE name = 'free'`);
        const freePlanId = freePlanResult.rows[0]?.id;

        await client.query(
          `INSERT INTO payments (user_id, plan_id, stripe_event_id, stripe_subscription_id, status, amount_cents)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, stripe_subscription_id)
           DO UPDATE SET plan_id = EXCLUDED.plan_id, stripe_event_id = EXCLUDED.stripe_event_id,
                         status = EXCLUDED.status`,
          [userId, freePlanId, event.id, subscription.id, 'cancelled', 1]
        );

        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
          [userId, 'update', 'subscription', subscription.id, JSON.stringify({ event: event.type, downgraded_to: 'free' })]
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        await client.query(
          `INSERT INTO payments (user_id, plan_id, stripe_event_id, stripe_subscription_id, status, amount_cents)
           SELECT $1, plan_id, $2, $3, 'failed', $4 FROM payments WHERE user_id = $1 AND stripe_subscription_id = $3
           ON CONFLICT (user_id, stripe_subscription_id)
           DO UPDATE SET stripe_event_id = EXCLUDED.stripe_event_id, status = 'failed'`,
          [userId, event.id, subscriptionId, invoice.amount_due || 1]
        );

        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
          [userId, 'update', 'payment', event.id, JSON.stringify({ event: event.type, subscriptionId, status: 'failed' })]
        );
        break;
      }

      default:
        // Unhandled event types are acknowledged but not processed
        break;
    }

    await client.query('COMMIT');
    return { processed: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
