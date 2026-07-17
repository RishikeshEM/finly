'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function BudgetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Budget Overview</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark">July 2026</p>
        </div>
        <Button variant="primary">Create Budget</Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-6">
        <SummaryCard label="On Track" value="3" color="bg-primary" />
        <SummaryCard label="Near Limit" value="2" color="bg-warning" />
        <SummaryCard label="Over Budget" value="1" color="bg-danger" />
      </div>

      {/* Budget Cards */}
      <div className="space-y-4">
        <BudgetCard label="Food & Dining" spent={450} limit={500} status="on-track" />
        <BudgetCard label="Transport" spent={280} limit={300} status="near-limit" />
        <BudgetCard label="Entertainment" spent={420} limit={400} status="over-budget" />
        <BudgetCard label="Utilities" spent={150} limit={200} status="on-track" />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card>
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <p className="text-3xl font-bold text-text-light dark:text-text-dark">{value}</p>
        <div className={`w-2 h-2 rounded-full ${color}`} />
      </div>
    </Card>
  );
}

function BudgetCard({ label, spent, limit, status }: { label: string; spent: number; limit: number; status: 'on-track' | 'near-limit' | 'over-budget' }) {
  const percentage = (spent / limit) * 100;
  const statusColors: Record<string, string> = {
    'on-track': 'bg-primary',
    'near-limit': 'bg-warning',
    'over-budget': 'bg-danger',
  };

  const statusBadges: Record<string, string> = {
    'on-track': 'bg-primary/10 text-primary',
    'near-limit': 'bg-warning/10 text-warning',
    'over-budget': 'bg-danger/10 text-danger',
  };

  return (
    <Card className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-text-light dark:text-text-dark">{label}</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadges[status]}`}>
            {status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
            ${spent} / ${limit}
          </span>
          <span className="text-sm font-semibold text-text-light dark:text-text-dark">
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="w-full bg-card-alt-light dark:bg-card-alt-dark rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${statusColors[status]}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
      <Button variant="ghost" size="sm" className="ml-4">Edit</Button>
    </Card>
  );
}
