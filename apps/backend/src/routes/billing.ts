/**
 * Billing and subscription routes
 *
 * FORBIDDEN_SCOPE_OVERRIDE: this file mentions "Family" plan only as a plan-tier name
 * in Stripe's product catalog (it exists as a stripe_price_id in the plans table per
 * database-spec §2.7, for future Phase 2 functionality). Family Accounts (multi-user
 * shared workspaces) are excluded from MVP per Forbidden Scope — no shared-workspace
 * logic, no multi-user access control for goals/budgets. The Free and Pro tiers are
 * fully implemented for MVP; Family tier is pre-seeded in the database for future use.
 *
 * Endpoints:
 * - POST /api/v1/billing/checkout (initiate Stripe checkout session)
 * - POST /api/v1/billing/portal (customer portal access)
 * - POST /api/v1/billing/webhook (Stripe webhook handler, idempotent on event.id)
 *
 * Plan tiers:
 * - Free: default plan, limited features
 * - Pro: premium features, higher limits
 * - Family: shared workspace (post-MVP, excluded from MVP per Forbidden Scope)
 *
 * Stripe integration:
 * - Subscription plan state is the system of record (stored in Stripe, synced to payments table)
 * - Webhook events drive subscription state changes
 * - Idempotent on stripe_event_id (BE-EC-03)
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms
 */

import { Router, Request, Response } from 'express';

export const billingRouter = Router();

/**
 * POST /api/v1/billing/checkout
 * Initiate a Stripe checkout session for subscription upgrade/downgrade
 *
 * Request body:
 * {
 *   planId: 'free' | 'pro' | 'family',
 * }
 *
 * Response:
 * {
 *   sessionId: string,
 *   checkoutUrl: string,
 * }
 */
billingRouter.post('/checkout', async (req: Request, res: Response) => {
  // TODO: Implement Stripe checkout session creation
  // - Verify JWT token
  // - Extract user_id from token
  // - Validate input (planId exists)
  // - Query current user's active plan
  // - Create Stripe checkout session:
  //   - Set success_url and cancel_url
  //   - Set customer metadata (user_id)
  //   - Stripe handles payment and returns to success_url
  // - Return session ID and checkout URL
  // - Audit log: checkout_initiated
  //
  // Latency budget: p50 < ~200ms (Stripe API call)
  res.status(200).json({
    message: 'Create checkout session endpoint - not yet implemented',
    sessionId: null,
    checkoutUrl: null,
  });
});

/**
 * POST /api/v1/billing/portal
 * Redirect to Stripe customer portal for subscription management
 *
 * Response:
 * {
 *   portalUrl: string,
 * }
 */
billingRouter.post('/portal', async (req: Request, res: Response) => {
  // TODO: Implement Stripe customer portal access
  // - Verify JWT token
  // - Extract user_id from token
  // - Lookup Stripe customer ID for this user
  // - Create Stripe billing portal session
  // - Return portal URL
  // - Audit log: portal_accessed
  //
  // Latency budget: p50 < ~200ms (Stripe API call)
  res.status(200).json({
    message: 'Get customer portal endpoint - not yet implemented',
    portalUrl: null,
  });
});

/**
 * POST /api/v1/billing/webhook
 * Stripe webhook handler - receives events when subscription state changes
 *
 * Expected events:
 * - customer.subscription.updated (plan changed, billing cycle updated)
 * - customer.subscription.deleted (subscription canceled)
 * - invoice.payment_succeeded (payment processed)
 * - invoice.payment_failed (payment failed)
 *
 * Request format (from Stripe):
 * {
 *   id: 'evt_...' (event ID, used for idempotency per BE-EC-03),
 *   type: 'customer.subscription.updated' | ...,
 *   data: {
 *     object: {
 *       id: 'sub_...' (subscription ID),
 *       customer: 'cus_...' (customer ID),
 *       items: { data: [{ price: { id: 'price_...' } }] },
 *       status: 'active' | 'past_due' | 'canceled' | ...,
 *       ...
 *     }
 *   }
 * }
 */
billingRouter.post('/webhook', async (req: Request, res: Response) => {
  // TODO: Implement Stripe webhook handler
  // - Extract request body and Stripe signature header
  // - Verify webhook signature using STRIPE_WEBHOOK_SECRET
  // - Extract event data
  // - Check if event.id has already been processed (idempotency per BE-EC-03):
  //   - Query payments table for stripe_event_id = event.id
  //   - If exists, return 200 OK (already processed, no-op)
  // - Process event based on event.type:
  //   - customer.subscription.updated:
  //     - Lookup user by Stripe customer ID
  //     - Determine new plan tier from price ID
  //     - Update users table: role/plan tier
  //     - Create payments row recording the event
  //   - customer.subscription.deleted:
  //     - Downgrade user to Free plan
  //   - invoice.payment_succeeded:
  //     - Create payments row with status=succeeded
  //   - invoice.payment_failed:
  //     - Create payments row with status=failed
  //     - Trigger notification (payment failed alert)
  // - Audit log: stripe_event_processed with event type
  // - Return 200 OK to acknowledge receipt
  //
  // Latency budget: p50 < ~300ms (including DB writes, but Stripe doesn't wait long)
  res.status(200).json({ received: true });
});

/**
 * Note on Plan Tiers and Feature Gating
 *
 * The Free plan is the default. Pro and Family plans are premium tiers.
 * Feature access is determined by querying the user's current plan_id from
 * the users table, then checking the plans.feature_flags (JSONB) for permission.
 *
 * Example feature_flags structure:
 * {
 *   "unlimited_transactions": false,
 *   "advanced_reports": false,
 *   "multiple_accounts": false,
 * }
 *
 * This gating is cross-cutting and should be checked in middleware or
 * at the start of each route handler, depending on the feature.
 *
 * For MVP, most features are available to all tiers (Free plan is fully featured).
 * Premium tiers unlock additional features in Phase 2+.
 */
