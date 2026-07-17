'use client';

import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDate, truncate } from '@/lib/format';
import tokens from '../../../../../inputs/design/tokens.json';

// Chart colors read from tokens.json (recharts needs real color strings for
// SVG fill/stroke, not Tailwind classes, so tokens are imported directly
// rather than hardcoded per design_token_guard's requirement).
const light = tokens.color.light;
const DONUT_COLORS = [light.primary, light.secondary, light.accent, light.warning, light.danger];
const INCOME_COLOR = light.primary;
const EXPENSE_COLOR = light.danger;

export function Dashboard() {
  const { user } = useAuth();
  const currency = user?.preferred_currency || 'USD';
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-5 gap-6">
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

  const { kpis, cashFlow, budgetsSummary, goalsSummary, recentTransactions, upcomingBills, subscriptions } = data;

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

  const categoryDonutData = budgetsSummary.topBudgets
    .filter((b) => b.spent > 0)
    .map((b) => ({ name: b.categoryName, value: b.spent / 100 }));

  return (
    <div className="space-y-8">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-5 gap-6">
        <KPICard label="Total Balance" value={formatCents(kpis.totalBalance, currency)} />
        <KPICard label="Monthly Income" value={formatCents(kpis.monthlyIncome, currency)} />
        <KPICard label="Monthly Expenses" value={formatCents(kpis.monthlyExpenses, currency)} />
        <KPICard label="Savings" value={formatCents(kpis.savings, currency)} />
        <KPICard label="Net Worth" value={formatCents(kpis.netWorth, currency)} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <h3 className="text-lg font-semibold mb-4">Cash Flow</h3>
          {cashFlowChartData.length === 0 ? (
            <EmptyState icon="📈" title="No cash flow data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={cashFlowChartData}>
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
                <Area type="monotone" dataKey="income" stackId="1" stroke={INCOME_COLOR} fill={`${INCOME_COLOR}33`} />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke={EXPENSE_COLOR} fill={`${EXPENSE_COLOR}33`} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
          {categoryDonutData.length === 0 ? (
            <EmptyState icon="🍩" title="No spending yet" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie data={categoryDonutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {categoryDonutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCents(value * 100, currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Budget Progress</h3>
        {budgetsSummary.topBudgets.length === 0 ? (
          <EmptyState icon="🎯" title="No budgets yet" description="Create a budget to track your spending." />
        ) : (
          <div className="space-y-4">
            {budgetsSummary.topBudgets.map((b) => (
              <BudgetProgressBar
                key={b.categoryName}
                label={b.categoryName}
                spent={b.spent}
                limit={b.limit}
                status={b.status}
                currency={currency}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Savings Goals */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Savings Goals</h3>
        {goalsSummary.goals.length === 0 ? (
          <EmptyState icon="🏦" title="No savings goals yet" />
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {goalsSummary.goals.slice(0, 3).map((g) => (
              <GoalCard key={g.name} label={g.name} progress={g.progress} />
            ))}
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <EmptyState icon="💳" title="No transactions yet" />
        ) : (
          <div className="space-y-3">
            {recentTransactions.slice(0, 5).map((tx) => (
              <TransactionRow
                key={tx.id}
                date={formatDate(tx.date)}
                description={truncate(tx.notes || tx.category, 40)}
                amount={tx.amount}
                type={tx.type}
                category={tx.category}
                currency={currency}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Upcoming Bills & Subscriptions */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Upcoming Bills</h3>
          {upcomingBills.length === 0 ? (
            <EmptyState icon="📄" title="No upcoming bills" />
          ) : (
            <div className="space-y-3 text-sm">
              {upcomingBills.slice(0, 5).map((bill, i) => (
                <BillItem key={i} label={bill.category} dueDate={formatDate(bill.date)} amount={bill.amount} currency={currency} />
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="text-lg font-semibold mb-4">Active Subscriptions</h3>
          {subscriptions.length === 0 ? (
            <EmptyState icon="🔄" title="No active subscriptions" />
          ) : (
            <div className="space-y-3 text-sm">
              {subscriptions.slice(0, 5).map((sub, i) => (
                <BillItem key={i} label={sub.name} dueDate={sub.frequency || ''} amount={sub.amount} currency={currency} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-2">{label}</p>
      <p className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">{value}</p>
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
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
          {formatCents(spent, currency)} / {formatCents(limit, currency)}
        </span>
      </div>
      <div className="w-full bg-card-alt-light dark:bg-card-alt-dark rounded-full h-2">
        {/* FE-EC-04: bar width clamped visually at 100% but percentage label (if shown) isn't clipped */}
        <div className={`h-2 rounded-full transition-all ${colorClass}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}

function GoalCard({ label, progress }: { label: string; progress: number }) {
  // FE-EC-04: progress can exceed 100% (goal exceeded) - ring visually caps at 100%
  // but the percentage label shows the true, unclipped value.
  const ringProgress = Math.min(progress, 100);

  return (
    <Card variant="alt" className="text-center">
      <p className="font-semibold mb-3">{label}</p>
      <div className="relative w-20 h-20 mx-auto mb-3">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-border-light dark:text-border-dark" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${(ringProgress / 100) * 283} 283`}
            className={progress > 100 ? 'text-warning transition-all' : 'text-primary transition-all'}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold">{progress}%</span>
        </div>
      </div>
    </Card>
  );
}

function TransactionRow({
  date,
  description,
  amount,
  type,
  category,
  currency,
}: {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  currency: string;
}) {
  const signedAmount = type === 'income' ? amount : -amount;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium text-text-light dark:text-text-dark truncate" title={description}>
          {description}
        </p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{date}</p>
      </div>
      <div className="text-right flex-shrink-0 pl-4">
        <p className={`font-semibold ${type === 'income' ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>
          {type === 'income' ? '+' : ''}
          {formatCents(signedAmount, currency)}
        </p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{category}</p>
      </div>
    </div>
  );
}

function BillItem({ label, dueDate, amount, currency }: { label: string; dueDate: string; amount: number; currency: string }) {
  return (
    <div className="flex justify-between items-start py-2">
      <div>
        <p className="font-medium text-text-light dark:text-text-dark">{label}</p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{dueDate}</p>
      </div>
      <p className="font-semibold text-text-light dark:text-text-dark">{formatCents(amount, currency)}</p>
    </div>
  );
}
