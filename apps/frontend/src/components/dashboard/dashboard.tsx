'use client';

import { Card } from '@/components/ui/card';

export function Dashboard() {
  // Stub component for dashboard
  // Will be populated with KPI cards, charts, and widgets via React Query

  return (
    <div className="space-y-8">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-5 gap-6">
        <KPICard label="Total Balance" value="$12,450.50" trend={5} />
        <KPICard label="Monthly Income" value="$4,200.00" trend={12} />
        <KPICard label="Monthly Expenses" value="$2,180.75" trend={-8} />
        <KPICard label="Savings Rate" value="48.2%" trend={3} />
        <KPICard label="Net Worth" value="$125,680.00" trend={8} />
      </div>

      {/* Charts and Widgets Row */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <h3 className="text-lg font-semibold mb-4">Cash Flow</h3>
          <div className="h-64 flex items-center justify-center text-text-muted-light dark:text-text-muted-dark">
            Chart placeholder (area chart)
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
          <div className="h-64 flex items-center justify-center text-text-muted-light dark:text-text-muted-dark">
            Chart placeholder (donut)
          </div>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Budget Progress</h3>
        <div className="space-y-4">
          <BudgetProgressBar label="Food & Dining" spent={450} limit={500} />
          <BudgetProgressBar label="Transport" spent={280} limit={300} />
          <BudgetProgressBar label="Entertainment" spent={420} limit={400} />
        </div>
      </Card>

      {/* Savings Goals */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Savings Goals</h3>
        <div className="grid grid-cols-3 gap-6">
          <GoalCard label="Emergency Fund" progress={65} />
          <GoalCard label="Vacation" progress={40} />
          <GoalCard label="Down Payment" progress={30} />
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          <TransactionRow date="Today" description="Grocery Store" amount="-$45.50" category="Food" />
          <TransactionRow date="Yesterday" description="Salary Deposit" amount="+$2,100.00" category="Income" />
          <TransactionRow date="2 days ago" description="Gas Station" amount="-$52.00" category="Transport" />
        </div>
      </Card>

      {/* Upcoming Bills & Subscriptions */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Upcoming Bills</h3>
          <div className="space-y-3 text-sm">
            <BillItem label="Electricity" dueDate="Due in 5 days" amount="$125.00" />
            <BillItem label="Internet" dueDate="Due in 12 days" amount="$79.99" />
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold mb-4">Active Subscriptions</h3>
          <div className="space-y-3 text-sm">
            <BillItem label="Streaming Service" dueDate="Monthly" amount="$12.99" />
            <BillItem label="Cloud Storage" dueDate="Annually" amount="$119.99" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ label, value, trend }: { label: string; value: string; trend: number }) {
  return (
    <Card>
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-2">{label}</p>
      <p className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">{value}</p>
      <p className={`text-sm ${trend >= 0 ? 'text-primary' : 'text-danger'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
      </p>
    </Card>
  );
}

function BudgetProgressBar({ label, spent, limit }: { label: string; spent: number; limit: number }) {
  const percentage = (spent / limit) * 100;
  const status = spent >= limit ? 'danger' : spent >= limit * 0.85 ? 'warning' : 'primary';

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
          ${spent} / ${limit}
        </span>
      </div>
      <div className="w-full bg-card-alt-light dark:bg-card-alt-dark rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            status === 'danger' ? 'bg-danger' : status === 'warning' ? 'bg-warning' : 'bg-primary'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function GoalCard({ label, progress }: { label: string; progress: number }) {
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
            strokeDasharray={`${(progress / 100) * 283} 283`}
            className="text-primary transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold">{progress}%</span>
        </div>
      </div>
    </Card>
  );
}

function TransactionRow({ date, description, amount, category }: { date: string; description: string; amount: string; category: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark last:border-b-0">
      <div>
        <p className="font-medium text-text-light dark:text-text-dark">{description}</p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{date}</p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${amount.startsWith('+') ? 'text-primary' : 'text-text-light dark:text-text-dark'}`}>
          {amount}
        </p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{category}</p>
      </div>
    </div>
  );
}

function BillItem({ label, dueDate, amount }: { label: string; dueDate: string; amount: string }) {
  return (
    <div className="flex justify-between items-start py-2">
      <div>
        <p className="font-medium text-text-light dark:text-text-dark">{label}</p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{dueDate}</p>
      </div>
      <p className="font-semibold text-text-light dark:text-text-dark">{amount}</p>
    </div>
  );
}
