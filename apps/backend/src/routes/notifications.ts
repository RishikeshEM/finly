/**
 * Notifications routes
 *
 * Endpoints:
 * - GET /api/v1/notifications (list user's notifications)
 * - PATCH /api/v1/notifications/:id/read (mark as read)
 *
 * Notification triggers (internal queue jobs, not HTTP endpoints) live in
 * notifications.service.ts and notification-dispatch.worker.ts.
 *
 * Latency targets (backend-spec §4.1):
 * - GET /notifications: p95 < 300ms
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { getNotifications, markNotificationRead } from '../services/notifications.service';

export const notificationsRouter = Router();
notificationsRouter.use(authMiddleware);

/**
 * GET /api/v1/notifications
 * List all notifications for the current user
 */
notificationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const readFilter = req.query.read !== undefined ? req.query.read === 'true' : undefined;

    const notifications = await getNotifications(userId, limit, offset, readFilter);
    res.status(200).json({ notifications, pagination: { limit, offset } });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a notification as read
 */
notificationsRouter.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    await markNotificationRead(userId, req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
