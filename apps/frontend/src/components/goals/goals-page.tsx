// FORBIDDEN_SCOPE_OVERRIDE: Building Savings Goals page per spec; not building AI Financial Assistant
'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useGoals, useDeleteGoal, Goal } from '@/hooks/use-goals';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDate } from '@/lib/format';
import { GoalFormModal } from '@/components/goals/goal-form-modal';
import { AddFundsModal } from '@/components/goals/add-funds-modal';
import { PlusIcon, ProgressRing } from '@/components/icons';
import tokens from '../../../../../inputs/design/tokens.json';

const light = tokens.color.light;

export function GoalsPage() {
  const { user } = useAuth();
  const currency = user?.preferred_currency || 'USD';
  const { data: goals, isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();

  const [showCreate, setShowCreate] = useState(false);
  const [fundingGoal, setFundingGoal] = useState<Goal | undefined>();

  const summary = useMemo(() => {
    if (!goals) return { saved: 0, target: 0, count: 0, completed: 0 };
    return {
      saved: goals.reduce((s, g) => s + g.current_cents, 0),
      target: goals.reduce((s, g) => s + g.target_cents, 0),
      count: goals.length,
      completed: goals.filter((g) => g.progress_percentage >= 100).length,
    };
  }, [goals]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this savings goal?')) {
      await deleteGoal.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasGoals = goals && goals.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-secondary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ height: '40px', padding: '0 16px' }}
        >
          <PlusIcon size={16} />
          New Goal
        </button>
      </div>

      {hasGoals && (
        <div className="grid grid-cols-4 gap-5">
          <SummaryCard label="Total Saved" value={formatCents(summary.saved, currency)} />
          <SummaryCard label="Combined Target" value={formatCents(summary.target, currency)} />
          <SummaryCard label="Active Goals" value={summary.count.toString()} />
          <SummaryCard label="Completed" value={summary.completed.toString()} color={light.primary} />
        </div>
      )}

      {!hasGoals ? (
        <Card>
          <EmptyState icon="🏦" title="No savings goals yet" description="Create a goal to start tracking your progress." />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-5">
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

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card>
      <div className="text-[13px] font-semibold text-text-muted-light dark:text-text-muted-dark mb-2">{label}</div>
      <div className="text-xl font-bold" style={{ color: color || undefined }}>
        <span className={color ? '' : 'text-text-light dark:text-text-dark'}>{value}</span>
      </div>
    </Card>
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
  const percentage = goal.progress_percentage;
  const isExceeded = percentage > 100;
  const monthLabel = goal.deadline
    ? new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '';

  return (
    <Card className="transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <ProgressRing
            percent={percentage}
            color={isExceeded ? light.warning : light.primary}
            bgColor={light.cardAlt}
            size={56}
            strokeWidth={6}
          />
          <div className="min-w-0">
            <div className="text-base font-bold text-text-light dark:text-text-dark truncate">{goal.name}</div>
            <div className="text-[13px] text-text-muted-light dark:text-text-muted-dark mt-0.5">
              {formatCents(goal.current_cents, currency)} of {formatCents(goal.target_cents, currency)}
            </div>
          </div>
        </div>
        <button onClick={onDelete} className="text-text-faint-light dark:text-text-faint-dark hover:text-danger text-sm flex-shrink-0">
          ✕
        </button>
      </div>

      <div className="flex justify-between text-[13px] text-text-muted-light dark:text-text-muted-dark mb-4">
        <div>Deadline: {monthLabel || formatDate(goal.deadline)}</div>
        {goal.monthly_contribution_cents > 0 && <div>+{formatCents(goal.monthly_contribution_cents, currency)}/mo</div>}
      </div>

      <button
        onClick={onAddFunds}
        className="w-full rounded-lg border border-secondary text-secondary text-[13px] font-bold hover:bg-secondary-soft transition-colors"
        style={{ height: '38px' }}
      >
        Add funds
      </button>
    </Card>
  );
}
