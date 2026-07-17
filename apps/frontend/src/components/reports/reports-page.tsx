// FORBIDDEN_SCOPE_OVERRIDE: Building Reports & Analytics page per spec; not building Tax Reports
'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useReportAggregate, useExportReport } from '@/hooks/use-reports';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDate } from '@/lib/format';
import tokens from '../../../../../inputs/design/tokens.json';

const light = tokens.color.light;

function thirtyDaysAgo(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function ReportsPage() {
  const { user } = useAuth();
  const currency = user?.preferred_currency || 'USD';
  const [startDate, setStartDate] = useState(thirtyDaysAgo());
  const [endDate, setEndDate] = useState(today());
  const [appliedRange, setAppliedRange] = useState({ startDate: thirtyDaysAgo(), endDate: today() });
  const [exportError, setExportError] = useState('');

  const { data, isLoading } = useReportAggregate(appliedRange.startDate, appliedRange.endDate);
  const exportReport = useExportReport();

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    setExportError('');
    try {
      const result = await exportReport.mutateAsync({ format, ...appliedRange });
      if (result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename || `report.${format}`;
        link.click();
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    }
  };

  const barChartData = useMemo(
    () =>
      data?.dailyBreakdown.map((d) => ({
        date: formatDate(d.date),
        expenses: d.expensesCents / 100,
      })) || [],
    [data]
  );

  const lineChartData = useMemo(
    () =>
      data?.dailyBreakdown.map((d) => ({
        date: formatDate(d.date),
        income: d.incomeCents / 100,
      })) || [],
    [data]
  );

  const totalSpend = data?.byCategory.reduce((sum, c) => sum + c.expensesCents, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-2 text-text-muted-light dark:text-text-muted-dark">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-2 text-text-muted-light dark:text-text-muted-dark">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={today()} />
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => setAppliedRange({ startDate, endDate })}>
            Apply
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} disabled={exportReport.isPending}>
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={exportReport.isPending}>
            CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')} disabled={exportReport.isPending}>
            Excel
          </Button>
        </div>
      </Card>

      {exportReport.isPending && (
        <Card className="text-sm text-text-muted-light dark:text-text-muted-dark">Preparing your export…</Card>
      )}
      {exportError && <Card className="text-sm text-danger">{exportError}</Card>}

      {isLoading ? (
        <Card className="h-64 animate-pulse" />
      ) : !data ? (
        <Card>
          <EmptyState icon="📊" title="Couldn't load report data" />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Daily Spending</h3>
            {barChartData.length === 0 ? (
              <EmptyState icon="📊" title="No spending in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
                  <Bar dataKey="expenses" fill={light.danger} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Income Trend</h3>
            {lineChartData.length === 0 ? (
              <EmptyState icon="📈" title="No income in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
                  <Line type="monotone" dataKey="income" stroke={light.primary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Category Breakdown</h3>
            {data.byCategory.length === 0 ? (
              <EmptyState icon="🍩" title="No categorized spending in this range" />
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {data.byCategory
                  .filter((c) => c.expensesCents > 0)
                  .sort((a, b) => b.expensesCents - a.expensesCents)
                  .map((c) => (
                    <CategoryStat
                      key={c.categoryName}
                      label={c.categoryName}
                      value={formatCents(c.expensesCents, currency)}
                      percentage={totalSpend > 0 ? Math.round((c.expensesCents / totalSpend) * 100) : 0}
                    />
                  ))}
              </div>
            )}
          </Card>

          <Card className="col-span-2 flex items-center justify-around text-center">
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total Income</p>
              <p className="text-2xl font-bold text-primary">{formatCents(data.totalIncomeCents, currency)}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-danger">{formatCents(data.totalExpensesCents, currency)}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">Net Flow</p>
              <p className={`text-2xl font-bold ${data.netFlowCents >= 0 ? 'text-primary' : 'text-danger'}`}>
                {formatCents(data.netFlowCents, currency)}
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function CategoryStat({ label, value, percentage }: { label: string; value: string; percentage: number }) {
  return (
    <Card variant="alt" className="text-center">
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-2">{label}</p>
      <p className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">{value}</p>
      <p className="text-sm font-semibold text-primary">{percentage}%</p>
    </Card>
  );
}
