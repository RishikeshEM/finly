'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateGoal } from '@/hooks/use-goals';
import { useAuth } from '@/lib/auth-context';

export function GoalFormModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const createGoal = useCreateGoal();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetCents = Math.round(parseFloat(target) * 100);
    if (!name.trim()) {
      setError('Enter a goal name');
      return;
    }
    if (!targetCents || targetCents <= 0) {
      setError('Enter a valid target amount');
      return;
    }
    if (!deadline) {
      setError('Select a deadline');
      return;
    }

    try {
      await createGoal.mutateAsync({
        name: name.trim(),
        targetCents,
        deadline,
        monthlyContributionCents: monthlyContribution ? Math.round(parseFloat(monthlyContribution) * 100) : undefined,
      });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      setError(axiosErr.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card-light dark:bg-card-dark rounded-lg border border-border-light dark:border-border-dark p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">New Savings Goal</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-danger/10 border border-danger rounded-lg text-danger text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-semibold mb-2">Goal name</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Target amount ({user?.preferred_currency || 'USD'})</label>
            <Input type="number" step="0.01" min="0.01" value={target} onChange={(e) => setTarget(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Deadline</label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Monthly contribution (optional)</label>
            <Input type="number" step="0.01" min="0" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={createGoal.isPending}>
              {createGoal.isPending ? 'Creating…' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
