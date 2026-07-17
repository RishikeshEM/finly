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
 * Stripe is the system of record for plan tier — never a client-set field.
 * Webhook idempotent on event.id (BE-EC-03).
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { createCheckoutSession, createPortalSession, verifyWebhookSignature, processWebhookEvent } from '../services/billing.service';

export const billingRouter = Router();

/**
 * POST /api/v1/billing/checkout
 * Initiate a Stripe checkout session for subscription upgrade/downgrade
 */
billingRouter.post('/checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;
    const { planId } = req.body;

    if (!planId || !['free', 'pro'].includes(planId)) {
      return res.status(400).json({ error: 'planId must be free or pro' });
    }

    const session = await createCheckoutSession(userId, userEmail, planId);
    res.status(200).json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v1/billing/portal
 * Redirect to Stripe customer portal for subscription management
 */
billingRouter.post('/portal', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const portal = await createPortalSession(userId);
    res.status(200).json(portal);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v1/billing/webhook
 * Stripe webhook handler - receives events when subscription state changes.
 * Idempotent on event.id (BE-EC-03) - retries and out-of-order arrival are expected.
 *
 * Note: this endpoint must receive the RAW request body (not JSON-parsed) for
 * signature verification. The app's express.json() middleware must exclude this
 * route, or use express.raw({ type: 'application/json' }) specifically for it.
 */
billingRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const event = verifyWebhookSignature(req.body, signature);
    const result = await processWebhookEvent(event);

    res.status(200).json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('Webhook processing failed:', (error as Error).message);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});
