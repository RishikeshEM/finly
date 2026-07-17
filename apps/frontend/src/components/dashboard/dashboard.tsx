'use client';

import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDate, truncate } from '@/lib/format';
import { WalletIcon, TrendingIcon, CreditCardIcon, TargetIcon, SparkleIcon, ProgressRing } from '@/components/icons';
import tokens from '../../../../../inputs/design/tokens.json';

// Chart colors read from tokens.json (recharts needs real color strings for
// SVG fill/stroke, not Tailwind classes, so tokens are imported directly
// rather than hardcoded per design_token_guard's requirement).
const light = tokens.color.light;
const DONUT_COLORS = [light.secondary, light.primary, light.warning, light.accent, light.danger, light.textFaint];
const INCOME_COLOR = light.primary;
const EXPENSE_COLOR = light.danger;

// Tailwind's JIT compiler statically scans source for literal class names -
// a template literal like `bg-${color}-soft` is invisible to that scan and
// silently produces no CSS. This lookup keeps every class name literal.
const COLOR_CLASSES = {
  primary: { bg: 'bg-primary-soft', text: 'text-primary' },
  secondary: { bg: 'bg-secondary-soft', text: 'text-secondary' },
  accent: { bg: 'bg-accent-soft', text: 'text-accent' },
  warning: { bg: 'bg-warning-soft', text: 'text-warning' },
  danger: { bg: 'bg-danger-soft', text: 'text-danger' },
} as const;

type ColorName = keyof typeof COLOR_CLASSES;
const AVATAR_COLORS = Object.keys(COLOR_CLASSES) as ColorName[];

function initialsOf(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w[0]?.toUpperCase() || '').join('') || '?';
}

function avatarColorFor(seed: string): ColorName {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Dashboard() {
  const { user } = useAuth();
  const currency = user?.preferred_currency || 'USD';
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-5 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse" />
          ))}
        </div>
        <Card className="h-64 animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <EmptyState icon="⚠️" title="Couldn't load dashboard" description="Please try refreshing the page." />
      </Card>
    );
  }

  const { kpis, kpiDeltas, cashFlow, budgetsSummary, goalsSummary, recentTransactions, upcomingBills, subscriptions } = data;

  const hasAnyData =
    recentTransactions.length > 0 || budgetsSummary.topBudgets.length > 0 || goalsSummary.goals.length > 0;

  if (!hasAnyData) {
    // FE-EC-01: zero transactions/budgets/goals on first run
    return (
      <Card>
        <EmptyState
          icon="👋"
          title="Welcome to Finly!"
          description="Add your first transaction, budget, or savings goal to see your dashboard come to life."
        />
      </Card>
    );
  }

  const cashFlowChartData = cashFlow.labels.map((label, i) => ({
    date: formatDate(label),
    income: cashFlow.income[i] / 100,
    expenses: cashFlow.expenses[i] / 100,
  }));
  const cashFlowIncomeTotal = cashFlow.income.reduce((a, b) => a + b, 0);
  const cashFlowExpensesTotal = cashFlow.expenses.reduce((a, b) => a + b, 0);

  const categoryDonutData = budgetsSummary.topBudgets
    .filter((b) => b.spent > 0)
    .map((b, i) => ({ name: b.categoryName, value: b.spent / 100, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  const categoryTotal = categoryDonutData.reduce((s, c) => s + c.value, 0);

  const kpiDefs = [
    { key: 'totalBalance', label: 'Total Balance', value: kpis.totalBalance, delta: null, Icon: WalletIcon, color: 'secondary' },
    { key: 'monthlyIncome', label: 'Monthly Income', value: kpis.monthlyIncome, delta: kpiDeltas.monthlyIncome, Icon: TrendingIcon, color: 'primary' },
    { key: 'monthlyExpenses', label: 'Monthly Expenses', value: kpis.monthlyExpenses, delta: kpiDeltas.monthlyExpenses, Icon: CreditCardIcon, color: 'danger' },
    { key: 'savings', label: 'Savings', value: kpis.savings, delta: kpiDeltas.savings, Icon: TargetIcon, color: 'primary' },
    { key: 'netWorth', label: 'Net Worth', value: kpis.netWorth, delta: null, Icon: SparkleIcon, color: 'accent' },
  ] as const;

  return (
    <div className="space-y-5">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-5 gap-5">
        {kpiDefs.map((k) => (
          <KPICard key={k.key} label={k.label} value={formatCents(k.value, currency)} delta={k.delta} Icon={k.Icon} color={k.color} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '7fr 5fr' }}>
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-text-light dark:text-text-dark">Cash Flow</h3>
            {cashFlowChartData.length > 0 && (
              <div className="flex gap-4">
                <LegendItem color={light.primary} label="Income" value={formatCents(cashFlowIncomeTotal, currency)} />
                <LegendItem color={light.danger} label="Expenses" value={formatCents(cashFlowExpensesTotal, currency)} />
              </div>
            )}
          </div>
          {cashFlowChartData.length === 0 ? (
            <EmptyState icon="📈" title="No cash flow data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cashFlowChartData}>
                <XAxis dataKey="date" fontSize={12} stroke={light.textFaint} />
                <YAxis fontSize={12} stroke={light.textFaint} />
                <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
                <Area type="monotone" dataKey="income" stroke={INCOME_COLOR} strokeWidth={2.5} fill={INCOME_COLOR} fillOpacity={0.12} />
                <Area type="monotone" dataKey="expenses" stroke={EXPENSE_COLOR} strokeWidth={2.5} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-4">Expense Breakdown</h3>
          {categoryDonutData.length === 0 ? (
            <EmptyState icon="🍩" title="No spending yet" />
          ) : (
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0" style={{ width: 140, height: 140, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryDonutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} strokeWidth={0}>
                      {categoryDonutData.map((c, i) => (
                        <Cell key={i} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] text-text-muted-light dark:text-text-muted-dark">Total</span>
                  <span className="text-sm font-bold text-text-light dark:text-text-dark">{formatCents(categoryTotal * 100, currency)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                {categoryDonutData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
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

      {/* Budget Progress + Savings Goals */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '7fr 5fr' }}>
        <Card>
          <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-4">Budget Progress</h3>
          {budgetsSummary.topBudgets.length === 0 ? (
            <EmptyState icon="🎯" title="No budgets yet" description="Create a budget to track your spending." />
          ) : (
            <div className="flex flex-col gap-4">
              {budgetsSummary.topBudgets.map((b) => (
                <BudgetProgressBar key={b.categoryName} label={b.categoryName} spent={b.spent} limit={b.limit} status={b.status} currency={currency} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-base font-bold text-text-light dark:text-text-dark mb-4">Savings Goals</h3>
          {goalsSummary.goals.length === 0 ? (
            <EmptyState icon="🏦" title="No savings goals yet" />
          ) : (
            <div className="flex flex-col gap-4">
              {goalsSummary.goals.slice(0, 3).map((g) => (
                <div key={g.name} className="flex items-center gap-3.5">
                  <ProgressRing percent={g.progress} color={light.primary} bgColor={light.cardAlt} size={44} strokeWidth={5} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-light dark:text-text-dark truncate">{g.name}</div>
                    <div className="text-xs text-text-muted-light dark:text-text-muted-dark">
                      {formatCents(g.current, currency)} of {formatCents(g.target, currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Transactions + Upcoming Bills/Subscriptions */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '8fr 4fr' }}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-text-light dark:text-text-dark">Recent Transactions</h3>
          </div>
          {recentTransactions.length === 0 ? (
            <EmptyState icon="💳" title="No transactions yet" />
          ) : (
            <div className="flex flex-col">
              {recentTransactions.slice(0, 6).map((tx) => {
                const label = tx.notes || tx.category;
                const color = avatarColorFor(tx.id);
                return (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark last:border-b-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${COLOR_CLASSES[color].bg} ${COLOR_CLASSES[color].text}`}
                      >
                        {initialsOf(label)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-light dark:text-text-dark truncate" title={label}>
                          {truncate(label, 40)}
                        </div>
                        <div className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
                          {tx.category} · {formatDate(tx.date)}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold flex-shrink-0 pl-3 ${tx.type === 'income' ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCents(tx.amount, currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-3.5">Upcoming Bills</h3>
            {upcomingBills.length === 0 ? (
              <EmptyState icon="📄" title="No upcoming bills" />
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                {upcomingBills.slice(0, 4).map((bill, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text-light dark:text-text-dark truncate">{bill.category}</div>
                      <div className="text-xs text-text-muted-light dark:text-text-muted-dark">{formatDate(bill.date)}</div>
                    </div>
                    <div className="text-sm font-bold text-text-light dark:text-text-dark flex-shrink-0 pl-2">
                      {formatCents(bill.amount, currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-text-light dark:text-text-dark">Subscriptions</h3>
            </div>
            {subscriptions.length === 0 ? (
              <EmptyState icon="🔄" title="No active subscriptions" />
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                {subscriptions.slice(0, 4).map((sub, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-semibold text-sm min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="truncate">{sub.name}</span>
                    </div>
                    <span className="text-sm text-text-muted-light dark:text-text-muted-dark flex-shrink-0 pl-2">
                      {formatCents(sub.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-text-muted-light dark:text-text-muted-dark">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
      <span className="font-bold text-text-light dark:text-text-dark">{value}</span>
    </div>
  );
}

function KPICard({
  label,
  value,
  delta,
  Icon,
  color,
}: {
  label: string;
  value: string;
  delta: number | null;
  Icon: (props: { size?: number; color?: string }) => JSX.Element;
  color: ColorName;
}) {
  return (
    <Card className="transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3.5">
        <p className="text-[13px] font-semibold text-text-muted-light dark:text-text-muted-dark">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLOR_CLASSES[color].bg} ${COLOR_CLASSES[color].text}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-text-light dark:text-text-dark mb-2">{value}</p>
      {delta !== null && (
        <div className={`flex items-center gap-1 text-[13px] font-semibold ${delta >= 0 ? 'text-primary' : 'text-danger'}`}>
          <TrendingIcon size={12} color={delta >= 0 ? undefined : undefined} />
          {Math.abs(delta)}%
          <span className="text-text-faint-light dark:text-text-faint-dark font-normal">vs last month</span>
        </div>
      )}
    </Card>
  );
}

function BudgetProgressBar({
  label,
  spent,
  limit,
  status,
  currency,
}: {
  label: string;
  spent: number;
  limit: number;
  status: string;
  currency: string;
}) {
  const percentage = (spent / limit) * 100;
  const colorClass = status === 'overBudget' ? 'bg-danger' : status === 'nearLimit' ? 'bg-warning' : 'bg-primary';

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-text-light dark:text-text-dark">{label}</span>
        <span className="text-[13px] text-text-muted-light dark:text-text-muted-dark">
          {formatCents(spent, currency)} <span className="text-text-faint-light dark:text-text-faint-dark">/ {formatCents(limit, currency)}</span>
        </span>
      </div>
      <div className="w-full bg-card-alt-light dark:bg-card-alt-dark rounded-full h-2 overflow-hidden">
        {/* FE-EC-04: bar width clamped visually at 100% but the percentage figure shown elsewhere isn't clipped */}
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}
