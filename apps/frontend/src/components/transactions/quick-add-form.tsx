'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateTransaction, useCategories } from '@/hooks/use-transactions';
import { useAuth } from '@/lib/auth-context';

interface QuickAddFormProps {
  accountId: string;
  onClose: () => void;
}

export function QuickAddForm({ accountId, onClose }: QuickAddFormProps) {
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!categoryId) {
      setError('Select a category');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        accountId,
        categoryId,
        type,
        amountCents,
        date,
        notes: notes || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      onClose();
    } catch {
      // FE-EC-07: optimistic row already rolled back by the mutation's onError;
      // surface a visible error rather than a silently stuck/ghost row.
      setError('Failed to add transaction. Please check your connection and try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card-light dark:bg-card-dark rounded-lg border border-border-light dark:border-border-dark p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Add Transaction</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-danger/10 border border-danger rounded-lg text-danger text-sm">{error}</div>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                type === 'expense' ? 'bg-danger text-white' : 'border border-border-light dark:border-border-dark'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                type === 'income' ? 'bg-primary text-white' : 'border border-border-light dark:border-border-dark'
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Amount ({user?.preferred_currency || 'USD'})</label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>

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
            <label className="block text-sm font-semibold mb-2">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Notes (optional)</label>
            <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Grocery Store" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? 'Adding…' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
