'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useBudgets, useDeleteBudget, Budget, BudgetStatus } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-transactions';
import { useAuth } from '@/lib/auth-context';
import { formatCents } from '@/lib/format';
import { BudgetFormModal } from '@/components/budgets/budget-form-modal';

export function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.preferred_currency || 'USD';
  const { data, isLoading } = useBudgets();
  const { data: categories } = useCategories();
  const deleteBudget = useDeleteBudget();

  const [showCreate, setShowCreate] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const statusById = useMemo(() => {
    const map = new Map<string, BudgetStatus>();
    data?.status.forEach((s) => map.set(s.id, s));
    return map;
  }, [data]);

  const counts = useMemo(() => {
    const result = { onTrack: 0, nearLimit: 0, overBudget: 0 };
    data?.status.forEach((s) => {
      if (s.status === 'on_track') result.onTrack++;
      else if (s.status === 'near_limit') result.nearLimit++;
      else if (s.status === 'over_budget') result.overBudget++;
    });
    return result;
  }, [data]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this budget?')) {
      await deleteBudget.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="h-20 animate-pulse" />
        <Card className="h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Budget Overview</h2>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          Create Budget
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-6">
        <SummaryCard label="On Track" value={counts.onTrack.toString()} color="bg-primary" />
        <SummaryCard label="Near Limit" value={counts.nearLimit.toString()} color="bg-warning" />
        <SummaryCard label="Over Budget" value={counts.overBudget.toString()} color="bg-danger" />
      </div>

      {/* Budget Cards */}
      {!data || data.budgets.length === 0 ? (
        <Card>
          <EmptyState icon="🎯" title="No budgets yet" description="Create a budget to start tracking your spending by category." />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.budgets.map((budget) => {
            const status = statusById.get(budget.id);
            return (
              <BudgetCard
                key={budget.id}
                categoryName={categoryNameById.get(budget.category_id) || 'Unknown'}
                spent={status?.spent_cents || 0}
                limit={budget.limit_cents}
                status={status?.status || 'on_track'}
                currency={currency}
                onEdit={() => setEditingBudget(budget)}
                onDelete={() => handleDelete(budget.id)}
              />
            );
          })}
        </div>
      )}

      {showCreate && <BudgetFormModal onClose={() => setShowCreate(false)} />}
      {editingBudget && <BudgetFormModal budget={editingBudget} onClose={() => setEditingBudget(undefined)} />}
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

function BudgetCard({
  categoryName,
  spent,
  limit,
  status,
  currency,
  onEdit,
  onDelete,
}: {
  categoryName: string;
  spent: number;
  limit: number;
  status: 'on_track' | 'near_limit' | 'over_budget';
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // FE-EC-04: percentage can exceed 100% (overspent) - bar visually caps at
  // 100% width but the percentage label shows the true, unclipped value.
  const percentage = (spent / limit) * 100;
  const displayWidth = Math.min(percentage, 100);

  const statusColors: Record<string, string> = {
    on_track: 'bg-primary',
    near_limit: 'bg-warning',
    over_budget: 'bg-danger',
  };

  const statusBadges: Record<string, string> = {
    on_track: 'bg-primary/10 text-primary',
    near_limit: 'bg-warning/10 text-warning',
    over_budget: 'bg-danger/10 text-danger',
  };

  const statusLabels: Record<string, string> = {
    on_track: 'ON TRACK',
    near_limit: 'NEAR LIMIT',
    over_budget: 'OVER BUDGET',
  };

  return (
    <Card className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-text-light dark:text-text-dark">{categoryName}</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadges[status]}`}>
            {statusLabels[status]}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {formatCents(spent, currency)} / {formatCents(limit, currency)}
          </span>
          <span className="text-sm font-semibold text-text-light dark:text-text-dark">{Math.round(percentage)}%</span>
        </div>
        <div className="w-full bg-card-alt-light dark:bg-card-alt-dark rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${statusColors[status]}`} style={{ width: `${displayWidth}%` }} />
        </div>
      </div>
      <div className="flex gap-1 ml-4">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" className="text-danger" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
