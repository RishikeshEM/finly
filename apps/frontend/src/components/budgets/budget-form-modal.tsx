'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCategories } from '@/hooks/use-transactions';
import { useCreateBudget, useUpdateBudget, Budget } from '@/hooks/use-budgets';
import { useAuth } from '@/lib/auth-context';

interface BudgetFormModalProps {
  budget?: Budget; // present when editing
  onClose: () => void;
}

export function BudgetFormModal({ budget, onClose }: BudgetFormModalProps) {
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  const [categoryId, setCategoryId] = useState(budget?.category_id || '');
  const [periodType, setPeriodType] = useState<'monthly' | 'weekly' | 'yearly'>(budget?.period_type || 'monthly');
  const [limit, setLimit] = useState(budget ? (budget.limit_cents / 100).toString() : '');
  const [error, setError] = useState('');

  const isEditing = !!budget;
  const isPending = createBudget.isPending || updateBudget.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const limitCents = Math.round(parseFloat(limit) * 100);
    if (!limitCents || limitCents <= 0) {
      setError('Enter a valid limit');
      return;
    }

    try {
      if (isEditing) {
        await updateBudget.mutateAsync({ id: budget.id, limitCents, version: budget.version });
      } else {
        if (!categoryId) {
          setError('Select a category');
          return;
        }
        await createBudget.mutateAsync({
          categoryId,
          periodType,
          limitCents,
          startDate: new Date().toISOString().split('T')[0],
        });
      }
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      // FE-EC-06: a stale version means someone else edited this budget first -
      // surface that clearly rather than silently overwriting.
      if (axiosErr.response?.status === 409) {
        setError('This budget was updated elsewhere. Please close and try again with the latest values.');
      } else {
        setError(axiosErr.response?.data?.error || 'Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card-light dark:bg-card-dark rounded-lg border border-border-light dark:border-border-dark p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Budget' : 'Create Budget'}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-danger/10 border border-danger rounded-lg text-danger text-sm">{error}</div>}

          {!isEditing && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-12 px-3 rounded-lg border border-border-light dark:border-border-dark bg-input-bg-light dark:bg-input-bg-dark"
                  required
                >
                  <option value="">Select category…</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Period</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full h-12 px-3 rounded-lg border border-border-light dark:border-border-dark bg-input-bg-light dark:bg-input-bg-dark"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">Limit ({user?.preferred_currency || 'USD'})</label>
            <Input type="number" step="0.01" min="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} required />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={isPending}>
              {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
