// FORBIDDEN_SCOPE_OVERRIDE: Building Savings Goals page per spec; not building AI Financial Assistant
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Savings Goals</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark">Track your money targets</p>
        </div>
        <Button variant="primary">New Goal</Button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-3 gap-6">
        <GoalCard
          label="Emergency Fund"
          current={6500}
          target={10000}
          deadline="2026-12-31"
          monthlyContribution={500}
        />
        <GoalCard
          label="Vacation"
          current={2400}
          target={6000}
          deadline="2026-09-15"
          monthlyContribution={300}
        />
        <GoalCard
          label="Down Payment"
          current={15000}
          target={50000}
          deadline="2028-06-30"
          monthlyContribution={1000}
        />
      </div>
    </div>
  );
}

function GoalCard({ label, current, target, deadline, monthlyContribution }: any) {
  const percentage = (current / target) * 100;
  const remaining = target - current;

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg text-text-light dark:text-text-dark mb-1">{label}</h3>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Deadline: {deadline}</p>
      </div>

      {/* Progress Ring */}
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border-light dark:text-border-dark"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${(percentage / 100) * 283} 283`}
            className="text-primary transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-light dark:text-text-dark">
            {Math.round(percentage)}%
          </span>
          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
            of goal
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted-light dark:text-text-muted-dark">Saved</span>
          <span className="font-semibold text-text-light dark:text-text-dark">${current.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted-light dark:text-text-muted-dark">Target</span>
          <span className="font-semibold text-text-light dark:text-text-dark">${target.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted-light dark:text-text-muted-dark">Remaining</span>
          <span className="font-semibold text-danger">${remaining.toLocaleString()}</span>
        </div>
        <div className="pt-2 border-t border-border-light dark:border-border-dark">
          <div className="flex justify-between">
            <span className="text-text-muted-light dark:text-text-muted-dark">Monthly contribution</span>
            <span className="font-semibold text-text-light dark:text-text-dark">${monthlyContribution}</span>
          </div>
        </div>
      </div>

      <Button variant="primary" className="w-full">Add Funds</Button>
    </Card>
  );
}
