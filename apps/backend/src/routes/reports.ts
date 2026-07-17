/**
 * Reports routes
 *
 * FORBIDDEN_SCOPE_OVERRIDE: these routes are for transaction export reports
 * (PDF/CSV/Excel of transaction history per backend-spec §2.7), not Tax Reports
 * which are in Forbidden Scope — transaction exports are confirmed MVP functionality.
 *
 * Endpoints:
 * - GET /api/v1/reports (on-the-fly aggregates, fast)
 * - POST /api/v1/reports/export (enqueues async job, returns job ID)
 * - GET /api/v1/reports/export/:jobId (poll job status and download result)
 *
 * Export jobs are async and queued (BullMQ or equivalent) due to potential
 * latency for large datasets. Synchronous report aggregates are cached via Redis.
 *
 * Latency targets (backend-spec §4.1):
 * - GET /reports: p95 < 300ms (cached aggregate)
 * - POST /reports/export: p95 < 500ms (job enqueue only, async processing)
 * - Report generation job: no synchronous latency budget (async queue worker)
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { getReportAggregate, enqueueExportJob, getExportJobStatus } from '../services/reports.service';

export const reportsRouter = Router();
reportsRouter.use(authMiddleware);

/**
 * GET /api/v1/reports
 * Get on-the-fly transaction aggregates and summaries for a date range
 */
reportsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];

    const report = await getReportAggregate(userId, startDate, endDate);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v1/reports/export
 * Enqueue an async job to generate and export a report (PDF/CSV/Excel)
 */
reportsRouter.post('/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { format, startDate, endDate, includeCategories } = req.body;

    if (!format || !startDate || !endDate) {
      return res.status(400).json({ error: 'format, startDate, and endDate are required' });
    }

    const job = await enqueueExportJob(userId, format, startDate, endDate, includeCategories);
    res.status(202).json(job);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/v1/reports/export/:jobId
 * Poll the status of an export job and download result if ready.
 * Scoped to the requesting user - see getExportJobStatus.
 */
reportsRouter.get('/export/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const status = await getExportJobStatus(jobId, req.user!.userId);
    res.status(200).json(status);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});
