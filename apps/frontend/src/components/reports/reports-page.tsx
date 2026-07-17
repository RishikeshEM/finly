// FORBIDDEN_SCOPE_OVERRIDE: Building Reports & Analytics page per spec; not building Tax Reports
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function ReportsPage() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-07-17');

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-2 text-text-muted-light dark:text-text-muted-dark">
            Start Date
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-2 text-text-muted-light dark:text-text-muted-dark">
            End Date
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="primary">Apply</Button>
          <Button variant="outline">PDF</Button>
          <Button variant="outline">CSV</Button>
          <Button variant="outline">Excel</Button>
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Monthly Spending</h3>
          <div className="h-64 flex items-center justify-center text-text-muted-light dark:text-text-muted-dark">
            Bar chart placeholder
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Income Trend</h3>
          <div className="h-64 flex items-center justify-center text-text-muted-light dark:text-text-muted-dark">
            Line chart placeholder
          </div>
        </Card>

        <Card className="col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Category Breakdown</h3>
          <div className="grid grid-cols-3 gap-4">
            <CategoryStat label="Food & Dining" value="$2,450.00" percentage={28} />
            <CategoryStat label="Transport" value="$1,820.50" percentage={21} />
            <CategoryStat label="Entertainment" value="$1,200.00" percentage={14} />
            <CategoryStat label="Utilities" value="$850.00" percentage={10} />
            <CategoryStat label="Shopping" value="$1,500.00" percentage={17} />
            <CategoryStat label="Other" value="$900.00" percentage={10} />
          </div>
        </Card>

        <Card className="col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-text-light dark:text-text-dark">Budget Performance</h3>
          <div className="space-y-3">
            <BudgetPerformance category="Food & Dining" spent={2450} budgeted={2500} />
            <BudgetPerformance category="Transport" spent={1820} budgeted={1800} />
            <BudgetPerformance category="Entertainment" spent={1200} budgeted={1500} />
          </div>
        </Card>
      </div>
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

function BudgetPerformance({ category, spent, budgeted }: { category: string; spent: number; budgeted: number }) {
  const percentage = (spent / budgeted) * 100;
  const status = spent > budgeted ? 'over' : 'under';

  return (
    <div className="border-b border-border-light dark:border-border-dark last:border-b-0 pb-3 last:pb-0">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-text-light dark:text-text-dark">{category}</span>
        <span className={`text-sm font-semibold ${status === 'over' ? 'text-danger' : 'text-primary'}`}>
          ${spent} / ${budgeted}
        </span>
      </div>
      <div className="w-full bg-card-alt-light dark:bg-card-alt-dark rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${status === 'over' ? 'bg-danger' : 'bg-primary'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
