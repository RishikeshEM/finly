// FORBIDDEN_SCOPE_OVERRIDE: Building Reports & Analytics page per spec; not building Tax Reports
'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useReportAggregate, useExportReport } from '@/hooks/use-reports';
import { useBudgets } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-transactions';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDate } from '@/lib/format';
import { CalendarIcon, DownloadIcon } from '@/components/icons';
import tokens from '../../../../../inputs/design/tokens.json';

const light = tokens.color.light;
const DONUT_COLORS = [light.secondary, light.primary, light.warning, light.accent, light.danger, light.textFaint];

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
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [exportError, setExportError] = useState('');

  const { data, isLoading } = useReportAggregate(appliedRange.startDate, appliedRange.endDate);
  const { data: budgetsData } = useBudgets();
  const { data: categories } = useCategories();
  const exportReport = useExportReport();

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

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

  const applyRange = () => {
    setAppliedRange({ startDate, endDate });
    setShowRangePicker(false);
  };

  const barChartData = useMemo(
    () => data?.dailyBreakdown.map((d) => ({ date: formatDate(d.date), expenses: d.expensesCents / 100 })) || [],
    [data]
  );
  const lineChartData = useMemo(
    () => data?.dailyBreakdown.map((d) => ({ date: formatDate(d.date), income: d.incomeCents / 100 })) || [],
    [data]
  );

  const categoryDonutData = useMemo(
    () =>
      (data?.byCategory || [])
        .filter((c) => c.expensesCents > 0)
        .sort((a, b) => b.expensesCents - a.expensesCents)
        .map((c, i) => ({ name: c.categoryName, value: c.expensesCents / 100, color: DONUT_COLORS[i % DONUT_COLORS.length] })),
    [data]
  );
  const categoryTotal = categoryDonutData.reduce((s, c) => s + c.value, 0);

  const budgetPerformance = useMemo(() => {
    if (!budgetsData) return [];
    const statusById = new Map(budgetsData.status.map((s) => [s.id, s]));
    return budgetsData.budgets.map((b) => {
      const status = statusById.get(b.id);
      const spent = status?.spent_cents || 0;
      const pct = b.limit_cents > 0 ? Math.round((spent / b.limit_cents) * 100) : 0;
      const barColor = status?.status === 'over_budget' ? light.danger : status?.status === 'near_limit' ? light.warning : light.primary;
      return { name: categoryNameById.get(b.category_id) || 'Unknown', percent: pct, barColor };
    });
  }, [budgetsData, categoryNameById]);

  return (
    <div className="space-y-5">
      {/* Date Range + Export Row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <button
            onClick={() => setShowRangePicker((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark text-[13px] font-semibold"
            style={{ height: '40px', padding: '0 14px' }}
          >
            <CalendarIcon size={16} />
            {formatDate(appliedRange.startDate)} – {formatDate(appliedRange.endDate)}
          </button>
          {showRangePicker && (
            <Card className="absolute z-20 mt-2 flex items-end gap-3" style={{ width: 'max-content' }}>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-text-muted-light dark:text-text-muted-dark">Start</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-text-muted-light dark:text-text-muted-dark">End</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={today()} />
              </div>
              <button onClick={applyRange} className="rounded-lg bg-secondary text-white text-sm font-semibold px-4" style={{ height: '48px' }}>
                Apply
              </button>
            </Card>
          )}
        </div>

        <div className="flex gap-2.5">
          {(['pdf', 'csv', 'excel'] as const).map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={exportReport.isPending}
              className="flex items-center gap-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark text-[13px] font-semibold hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark disabled:opacity-50 transition-colors"
              style={{ height: '40px', padding: '0 14px' }}
            >
              <DownloadIcon size={16} />
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {exportReport.isPending && <Card className="text-sm text-text-muted-light dark:text-text-muted-dark">Preparing your export…</Card>}
      {exportError && <Card className="text-sm text-danger">{exportError}</Card>}

      {isLoading ? (
        <Card className="h-64 animate-pulse" />
      ) : !data ? (
        <Card>
          <EmptyState icon="📊" title="Couldn't load report data" />
        </Card>
      ) : (
        <>
          <Card>
            <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-4.5">Monthly Spending</h3>
            {barChartData.length === 0 ? (
              <EmptyState icon="📊" title="No spending in this range" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={light.border} />
                  <XAxis dataKey="date" fontSize={12} stroke={light.textFaint} />
                  <YAxis fontSize={12} stroke={light.textFaint} />
                  <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
                  <Bar dataKey="expenses" fill={light.secondary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid gap-5" style={{ gridTemplateColumns: '7fr 5fr' }}>
            <Card>
              <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-4.5">Income Trend</h3>
              {lineChartData.length === 0 ? (
                <EmptyState icon="📈" title="No income in this range" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={light.border} />
                    <XAxis dataKey="date" fontSize={12} stroke={light.textFaint} />
                    <YAxis fontSize={12} stroke={light.textFaint} />
                    <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
                    <Line type="monotone" dataKey="income" stroke={light.accent} strokeWidth={2.5} dot={{ r: 3.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-4">Category Breakdown</h3>
              {categoryDonutData.length === 0 ? (
                <EmptyState icon="🍩" title="No categorized spending in this range" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0" style={{ width: 120, height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryDonutData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={60} strokeWidth={0}>
                          {categoryDonutData.map((c, i) => (
                            <Cell key={i} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {categoryDonutData.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2 text-text-muted-light dark:text-text-muted-dark min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="truncate">{c.name}</span>
                        </div>
                        <span className="font-semibold text-text-light dark:text-text-dark flex-shrink-0 pl-2">
                          {categoryTotal > 0 ? Math.round((c.value / categoryTotal) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: '7fr 5fr' }}>
            <Card>
              <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-4.5">Budget Performance</h3>
              {budgetPerformance.length === 0 ? (
                <EmptyState icon="🎯" title="No budgets to compare yet" />
              ) : (
                <div className="flex flex-col gap-4">
                  {budgetPerformance.map((b) => (
                    <div key={b.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-text-light dark:text-text-dark">{b.name}</span>
                        <span className="text-[13px] font-semibold" style={{ color: b.barColor }}>
                          {b.percent}%
                        </span>
                      </div>
                      <div className="w-full bg-card-alt-light dark:bg-card-alt-dark rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(b.percent, 100)}%`, backgroundColor: b.barColor }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="flex flex-col justify-center gap-4">
              <div className="text-center">
                <p className="text-[13px] text-text-muted-light dark:text-text-muted-dark mb-1">Total Income</p>
                <p className="text-xl font-bold text-primary">{formatCents(data.totalIncomeCents, currency)}</p>
              </div>
              <div className="text-center">
                <p className="text-[13px] text-text-muted-light dark:text-text-muted-dark mb-1">Total Expenses</p>
                <p className="text-xl font-bold text-danger">{formatCents(data.totalExpensesCents, currency)}</p>
              </div>
              <div className="text-center">
                <p className="text-[13px] text-text-muted-light dark:text-text-muted-dark mb-1">Net Flow</p>
                <p className={`text-xl font-bold ${data.netFlowCents >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {formatCents(data.netFlowCents, currency)}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
