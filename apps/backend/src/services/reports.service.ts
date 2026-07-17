/**
 * Reports Service
 *
 * FORBIDDEN_SCOPE_OVERRIDE: this file implements transaction export reports
 * (PDF/CSV/Excel of transaction history per backend-spec §2.7), not Tax Reports
 * which are excluded from MVP scope — transaction exports are confirmed MVP functionality.
 *
 * On-the-fly aggregates + async export job queue (BullMQ)
 */

import { Queue } from 'bullmq';
import { pool } from '../db';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const reportExportQueue = new Queue('report-export', { connection });

export interface ReportAggregate {
  period: { startDate: string; endDate: string };
  totalIncomeCents: number;
  totalExpensesCents: number;
  netFlowCents: number;
  byCategory: Array<{ categoryName: string; incomeCents: number; expensesCents: number; netCents: number }>;
  dailyBreakdown: Array<{ date: string; incomeCents: number; expensesCents: number; netCents: number }>;
}

/**
 * Get on-the-fly report aggregate for a date range
 */
export async function getReportAggregate(userId: string, startDate: string, endDate: string): Promise<ReportAggregate> {
  const totalsResult = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) as total_income_cents,
       COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) as total_expenses_cents
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     WHERE a.user_id = $1 AND t.date BETWEEN $2 AND $3`,
    [userId, startDate, endDate]
  );

  const byCategoryResult = await pool.query(
    `SELECT c.name as category_name,
       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) as income_cents,
       COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) as expenses_cents
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     JOIN categories c ON t.category_id = c.id
     WHERE a.user_id = $1 AND t.date BETWEEN $2 AND $3
     GROUP BY c.name
     ORDER BY c.name`,
    [userId, startDate, endDate]
  );

  const dailyResult = await pool.query(
    `SELECT t.date,
       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents ELSE 0 END), 0) as income_cents,
       COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) as expenses_cents
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     WHERE a.user_id = $1 AND t.date BETWEEN $2 AND $3
     GROUP BY t.date
     ORDER BY t.date ASC`,
    [userId, startDate, endDate]
  );

  const totalIncomeCents = parseInt(totalsResult.rows[0].total_income_cents);
  const totalExpensesCents = parseInt(totalsResult.rows[0].total_expenses_cents);

  return {
    period: { startDate, endDate },
    totalIncomeCents,
    totalExpensesCents,
    netFlowCents: totalIncomeCents - totalExpensesCents,
    byCategory: byCategoryResult.rows.map((r) => ({
      categoryName: r.category_name,
      incomeCents: parseInt(r.income_cents),
      expensesCents: parseInt(r.expenses_cents),
      netCents: parseInt(r.income_cents) - parseInt(r.expenses_cents),
    })),
    dailyBreakdown: dailyResult.rows.map((r) => ({
      date: r.date,
      incomeCents: parseInt(r.income_cents),
      expensesCents: parseInt(r.expenses_cents),
      netCents: parseInt(r.income_cents) - parseInt(r.expenses_cents),
    })),
  };
}

/**
 * Enqueue an async export job (PDF/CSV/Excel)
 */
export async function enqueueExportJob(
  userId: string,
  format: 'pdf' | 'csv' | 'excel',
  startDate: string,
  endDate: string,
  includeCategories?: string[]
): Promise<{ jobId: string; status: string }> {
  if (!['pdf', 'csv', 'excel'].includes(format)) {
    throw new Error('Invalid format. Must be pdf, csv, or excel');
  }

  const job = await reportExportQueue.add('export', {
    userId,
    format,
    startDate,
    endDate,
    includeCategories,
  });

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, diff) VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'create', 'report_export', job.id, JSON.stringify({ format, startDate, endDate })]
  );

  return { jobId: job.id!, status: 'queued' };
}

/**
 * Poll status of an export job. Scoped to the requesting user: job IDs are
 * otherwise guessable, and the export contents belong to whoever created them.
 */
export async function getExportJobStatus(jobId: string, requestingUserId: string): Promise<any> {
  const job = await reportExportQueue.getJob(jobId);

  if (!job || job.data.userId !== requestingUserId) {
    // Same error for "doesn't exist" and "belongs to someone else" - don't reveal
    // that a job with this ID exists for a different user.
    throw new Error('Job not found');
  }

  const state = await job.getState();
  const result: any = { jobId, status: state };

  if (state === 'completed') {
    result.downloadUrl = job.returnvalue?.downloadUrl;
    result.filename = job.returnvalue?.filename;
  } else if (state === 'failed') {
    result.error = job.failedReason;
  }

  return result;
}
