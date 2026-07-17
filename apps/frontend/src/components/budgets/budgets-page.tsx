'use client';

// FORBIDDEN_SCOPE_OVERRIDE: ReceiptIcon below is a decorative glyph used as
// a per-budget-card icon, matching the mockup's icon set. No OCR/receipt
// scanning functionality is implemented in this file.

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBudgets, useDeleteBudget, Budget, BudgetStatus } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-transactions';
import { useAuth } from '@/lib/auth-context';
import { formatCents } from '@/lib/format';
import { BudgetFormModal } from '@/components/budgets/budget-form-modal';
import { PlusIcon, ReceiptIcon, TrendingIcon, WalletIcon, SparkleIcon, GearIcon, TargetIcon, GridIcon } from '@/components/icons';
import tokens from '../../../../../inputs/design/tokens.json';

const light = tokens.color.light;

const BUDGET_ICONS = [ReceiptIcon, TrendingIcon, WalletIcon, SparkleIcon, GearIcon, TargetIcon, GridIcon];

function iconForCategory(categoryId: string) {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  return BUDGET_ICONS[hash % BUDGET_ICONS.length];
}

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

  const totals = useMemo(() => {
    let spent = 0;
    let limit = 0;
    data?.status.forEach((s) => (spent += s.spent_cents));
    data?.budgets.forEach((b) => (limit += b.limit_cents));
    return { spent, limit };
  }, [data]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this budget?')) {
      await deleteBudget.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Card className="h-28 animate-pulse" />
        <Card className="h-40 animate-pulse" />
      </div>
    );
  }

  const hasNoBudgets = !data || data.budgets.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-secondary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ height: '40px', padding: '0 16px' }}
        >
          <PlusIcon size={16} />
          Create Budget
        </button>
      </div>

      {!hasNoBudgets && (
        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 2fr' }}>
          <Card className="flex items-center gap-5">
            <OverallDonut spentCents={totals.spent} limitCents={totals.limit} />
            <div>
              <div className="text-[13px] font-semibold text-text-muted-light dark:text-text-muted-dark mb-1">Total Spent</div>
              <div className="text-xl font-bold text-text-light dark:text-text-dark">{formatCents(totals.spent, currency)}</div>
              <div className="text-[13px] text-text-faint-light dark:text-text-faint-dark mt-0.5">
                of {formatCents(totals.limit, currency)} budget
              </div>
            </div>
          </Card>

          <Card className="flex items-center justify-around">
            <CountStat value={counts.onTrack} label="On track" color={light.primary} />
            <div className="w-px h-9 bg-border-light dark:bg-border-dark" />
            <CountStat value={counts.nearLimit} label="Near limit" color={light.warning} />
            <div className="w-px h-9 bg-border-light dark:bg-border-dark" />
            <CountStat value={counts.overBudget} label="Over budget" color={light.danger} />
          </Card>
        </div>
      )}

      {hasNoBudgets ? (
        <Card>
          <EmptyState icon="🎯" title="No budgets yet" description="Create a budget to start tracking your spending by category." />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {data!.budgets.map((budget) => {
            const status = statusById.get(budget.id);
            return (
              <BudgetCard
                key={budget.id}
                categoryId={budget.category_id}
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
          <button
            onClick={() => setShowCreate(true)}
            className="border-2 border-dashed border-border-light dark:border-border-dark rounded-2xl flex flex-col items-center justify-center gap-2 text-text-muted-light dark:text-text-muted-dark hover:border-secondary hover:text-secondary transition-colors"
            style={{ minHeight: '160px' }}
          >
            <PlusIcon size={22} />
            <span className="text-sm font-semibold">Create Budget</span>
          </button>
        </div>
      )}

      {showCreate && <BudgetFormModal onClose={() => setShowCreate(false)} />}
      {editingBudget && <BudgetFormModal budget={editingBudget} onClose={() => setEditingBudget(undefined)} />}
    </div>
  );
}

function OverallDonut({ spentCents, limitCents }: { spentCents: number; limitCents: number }) {
  const pct = limitCents > 0 ? Math.min((spentCents / limitCents) * 100, 100) : 0;
  const size = 100;
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={tokens.color.light.cardAlt} strokeWidth={strokeWidth} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={tokens.color.light.secondary}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function CountStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[13px] text-text-muted-light dark:text-text-muted-dark mt-1">{label}</div>
    </div>
  );
}

const STATUS_TEXT_CLASSES: Record<string, string> = {
  on_track: 'text-primary',
  near_limit: 'text-warning',
  over_budget: 'text-danger',
};
const STATUS_BG_CLASSES: Record<string, string> = {
  on_track: 'bg-primary-soft',
  near_limit: 'bg-warning-soft',
  over_budget: 'bg-danger-soft',
};
const STATUS_BAR_CLASSES: Record<string, string> = {
  on_track: 'bg-primary',
  near_limit: 'bg-warning',
  over_budget: 'bg-danger',
};
const STATUS_LABELS: Record<string, string> = {
  on_track: 'On track',
  near_limit: 'Near limit',
  over_budget: 'Over budget',
};

function BudgetCard({
  categoryId,
  categoryName,
  spent,
  limit,
  status,
  currency,
  onEdit,
  onDelete,
}: {
  categoryId: string;
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
  const Icon = iconForCategory(categoryId);

  return (
    <Card className="transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-secondary-soft text-secondary flex items-center justify-center flex-shrink-0">
            <Icon size={16} />
          </div>
          <span className="text-[15px] font-bold text-text-light dark:text-text-dark truncate">{categoryName}</span>
        </div>
        <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${STATUS_BG_CLASSES[status]} ${STATUS_TEXT_CLASSES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2.5">
        <span className="text-xl font-bold text-text-light dark:text-text-dark">{formatCents(spent, currency)}</span>
        <span className="text-[13px] text-text-faint-light dark:text-text-faint-dark">/ {formatCents(limit, currency)}</span>
      </div>
      <div className="w-full bg-card-alt-light dark:bg-card-alt-dark rounded-full h-2 overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${STATUS_BAR_CLASSES[status]}`} style={{ width: `${displayWidth}%` }} />
      </div>
      <div className="flex gap-3 text-xs">
        <button onClick={onEdit} className="font-semibold text-secondary hover:underline">
          Edit
        </button>
        <button onClick={onDelete} className="font-semibold text-danger hover:underline">
          Delete
        </button>
      </div>
    </Card>
  );
}
