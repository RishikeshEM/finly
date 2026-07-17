// FORBIDDEN_SCOPE_OVERRIDE: Building Savings Goals page per spec; not building AI Financial Assistant
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useGoals, useDeleteGoal, Goal } from '@/hooks/use-goals';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDate } from '@/lib/format';
import { GoalFormModal } from '@/components/goals/goal-form-modal';
import { AddFundsModal } from '@/components/goals/add-funds-modal';

export function GoalsPage() {
  const { user } = useAuth();
  const currency = user?.preferred_currency || 'USD';
  const { data: goals, isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();

  const [showCreate, setShowCreate] = useState(false);
  const [fundingGoal, setFundingGoal] = useState<Goal | undefined>();

  const handleDelete = async (id: string) => {
    if (confirm('Delete this savings goal?')) {
      await deleteGoal.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="h-20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Savings Goals</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark">Track your money targets</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          New Goal
        </Button>
      </div>

      {!goals || goals.length === 0 ? (
        <Card>
          <EmptyState icon="🏦" title="No savings goals yet" description="Create a goal to start tracking your progress." />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              onAddFunds={() => setFundingGoal(goal)}
              onDelete={() => handleDelete(goal.id)}
            />
          ))}
        </div>
      )}

      {showCreate && <GoalFormModal onClose={() => setShowCreate(false)} />}
      {fundingGoal && <AddFundsModal goal={fundingGoal} onClose={() => setFundingGoal(undefined)} />}
    </div>
  );
}

function GoalCard({
  goal,
  currency,
  onAddFunds,
  onDelete,
}: {
  goal: Goal;
  currency: string;
  onAddFunds: () => void;
  onDelete: () => void;
}) {
  // FE-EC-04: progress can exceed 100% (goal exceeded) - ring visually caps
  // at 100% but the percentage label shows the true, unclipped value.
  const percentage = goal.progress_percentage;
  const ringProgress = Math.min(percentage, 100);
  const remaining = Math.max(goal.target_cents - goal.current_cents, 0);
  const isExceeded = percentage > 100;

  return (
    <Card className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg text-text-light dark:text-text-dark mb-1">{goal.name}</h3>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Deadline: {formatDate(goal.deadline)}</p>
        </div>
        <button onClick={onDelete} className="text-text-faint-light dark:text-text-faint-dark hover:text-danger text-sm">
          ✕
        </button>
      </div>

      {/* Progress Ring */}
      <div className="relative w-32 h-32 mx-auto">
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
            className={isExceeded ? 'text-warning transition-all' : 'text-primary transition-all'}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-light dark:text-text-dark">{Math.round(percentage)}%</span>
          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{isExceeded ? 'exceeded!' : 'of goal'}</span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted-light dark:text-text-muted-dark">Saved</span>
          <span className="font-semibold text-text-light dark:text-text-dark">{formatCents(goal.current_cents, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted-light dark:text-text-muted-dark">Target</span>
          <span className="font-semibold text-text-light dark:text-text-dark">{formatCents(goal.target_cents, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted-light dark:text-text-muted-dark">Remaining</span>
          <span className="font-semibold text-danger">{formatCents(remaining, currency)}</span>
        </div>
        {goal.monthly_contribution_cents > 0 && (
          <div className="pt-2 border-t border-border-light dark:border-border-dark">
            <div className="flex justify-between">
              <span className="text-text-muted-light dark:text-text-muted-dark">Monthly contribution</span>
              <span className="font-semibold text-text-light dark:text-text-dark">
                {formatCents(goal.monthly_contribution_cents, currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      <Button variant="primary" className="w-full" onClick={onAddFunds}>
        Add Funds
      </Button>
    </Card>
  );
}
