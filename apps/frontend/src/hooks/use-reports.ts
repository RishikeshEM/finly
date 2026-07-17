'use client';

// FORBIDDEN_SCOPE_OVERRIDE: this hook fetches transaction export reports
// (PDF/CSV/Excel of transaction history per backend-spec §2.7), not Tax Reports.

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ReportAggregate {
  period: { startDate: string; endDate: string };
  totalIncomeCents: number;
  totalExpensesCents: number;
  netFlowCents: number;
  byCategory: Array<{ categoryName: string; incomeCents: number; expensesCents: number; netCents: number }>;
  dailyBreakdown: Array<{ date: string; incomeCents: number; expensesCents: number; netCents: number }>;
}

export function useReportAggregate(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', { startDate, endDate }],
    queryFn: async () => {
      const res = await apiClient.get<ReportAggregate>('/reports', { params: { startDate, endDate } });
      return res.data;
    },
    enabled: !!startDate && !!endDate,
  });
}

interface ExportJobResult {
  jobId: string;
  status: string;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export function useExportReport() {
  return useMutation({
    mutationFn: async ({
      format,
      startDate,
      endDate,
    }: {
      format: 'pdf' | 'csv' | 'excel';
      startDate: string;
      endDate: string;
    }) => {
      const enqueueRes = await apiClient.post<{ jobId: string }>('/reports/export', { format, startDate, endDate });
      const jobId = enqueueRes.data.jobId;

      // Poll until the async export job completes (backend-spec §2.7: no
      // synchronous export given the endpoint's latency budget).
      const maxAttempts = 20;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusRes = await apiClient.get<ExportJobResult>(`/reports/export/${jobId}`);

        if (statusRes.data.status === 'completed') {
          return statusRes.data;
        }
        if (statusRes.data.status === 'failed') {
          throw new Error(statusRes.data.error || 'Export failed');
        }
      }

      throw new Error('Export is taking longer than expected. Please try again shortly.');
    },
  });
}
