'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateGoal, Goal } from '@/hooks/use-goals';
import { useAuth } from '@/lib/auth-context';
import { formatCents } from '@/lib/format';

export function AddFundsModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { user } = useAuth();
  const currency = user?.preferred_currency || 'USD';
  const updateGoal = useUpdateGoal();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents <= 0) {
      setError('Enter a valid amount');
      return;
    }

    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        version: goal.version,
        current_cents: goal.current_cents + amountCents,
      });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      if (axiosErr.response?.status === 409) {
        setError('This goal was updated elsewhere. Please close and try again.');
      } else {
        setError(axiosErr.response?.data?.error || 'Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card-light dark:bg-card-dark rounded-lg border border-border-light dark:border-border-dark p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-1">Add Funds</h3>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">{goal.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-danger/10 border border-danger rounded-lg text-danger text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-semibold mb-2">
              Amount to add ({currency}) — currently {formatCents(goal.current_cents, currency)} of{' '}
              {formatCents(goal.target_cents, currency)}
            </label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={updateGoal.isPending}>
              {updateGoal.isPending ? 'Adding…' : 'Add Funds'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
