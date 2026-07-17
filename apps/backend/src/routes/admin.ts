/**
 * Admin panel routes
 *
 * FORBIDDEN_SCOPE_OVERRIDE: this file references "family_admin" role only as an RBAC
 * role definition that exists in the users table (per database-spec §2.1) and backend-spec §1,
 * for future use when Family Accounts are built. In MVP, family_admin is a role that can be
 * stored but has no active workspace to administer (per backend-spec §1 "no active workspace
 * in MVP since Family Accounts are excluded"). No shared-workspace logic or multi-user access
 * control is implemented — the role scaffolding exists structurally but is not active.
 *
 * Endpoints (Admin/Super Admin roles only):
 * - GET /api/v1/admin/users
 * - GET /api/v1/admin/subscriptions
 * - GET /api/v1/admin/revenue
 * - GET /api/v1/admin/audit-logs
 * - GET/POST /api/v1/admin/feature-flags (POST requires super_admin)
 *
 * RBAC across all four PRD roles (User, Family Admin, Admin, Super Admin).
 * Note: Admin panel UI is not in MVP (frontend-spec §2.10), but the API surface
 * exists for ops use and future UI.
 *
 * Latency targets (backend-spec §4.1):
 * - p50 < 120ms, p95 < 300ms, p99 < 800ms
 */

import { Router, Response } from 'express';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.middleware';
import {
  getUsers,
  getSubscriptionsSummary,
  getRevenueMetrics,
  getAuditLogs,
  getFeatureFlags,
  updateFeatureFlags,
} from '../services/admin.service';

export const adminRouter = Router();

// All admin routes require authentication + admin/super_admin role
adminRouter.use(authMiddleware);
adminRouter.use(requireRole(['admin', 'super_admin']));

/**
 * GET /api/v1/admin/users
 * List all users with account information and subscription status
 */
adminRouter.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, planId } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await getUsers(search as string, role as string, planId as string, limit, offset);
    res.status(200).json({ users, pagination: { limit, offset } });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/admin/subscriptions
 * List active subscriptions and plan distribution
 */
adminRouter.get('/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    const summary = await getSubscriptionsSummary();
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/admin/revenue
 * Revenue KPIs for business analytics
 */
adminRouter.get('/revenue', async (req: AuthRequest, res: Response) => {
  try {
    const revenue = await getRevenueMetrics();
    res.status(200).json(revenue);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/admin/audit-logs
 * Audit trail for compliance and security review
 */
adminRouter.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, action, userId, startDate, endDate } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const auditLogs = await getAuditLogs(
      entityType as string,
      action as string,
      userId as string,
      startDate as string,
      endDate as string,
      limit,
      offset
    );

    res.status(200).json({ auditLogs, pagination: { limit, offset } });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/admin/feature-flags
 * Get current feature flag state across all plan tiers
 */
adminRouter.get('/feature-flags', async (req: AuthRequest, res: Response) => {
  try {
    const featureFlags = await getFeatureFlags();
    res.status(200).json({ featureFlags });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v1/admin/feature-flags
 * Update feature flags for a plan tier (super_admin only - more restrictive than Admin)
 */
adminRouter.post('/feature-flags', requireRole(['super_admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { planId, flags } = req.body;

    if (!planId || !flags) {
      return res.status(400).json({ error: 'planId and flags are required' });
    }

    const updated = await updateFeatureFlags(req.user!.userId, planId, flags);
    res.status(200).json(updated);
  } catch (error) {
    res.status(error instanceof Error && error.message === 'Plan not found' ? 404 : 400).json({ error: (error as Error).message });
  }
});
