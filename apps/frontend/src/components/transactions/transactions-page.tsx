'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useTransactions, useCategories, useDeleteTransaction } from '@/hooks/use-transactions';
import { useAccounts } from '@/hooks/use-accounts';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDate, truncate } from '@/lib/format';
import { QuickAddForm } from '@/components/transactions/quick-add-form';

const PAGE_SIZE = 20;

export function TransactionsPage() {
  const { user } = useAuth();
  const currency = user?.preferred_currency || 'USD';
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const deleteTransaction = useDeleteTransaction();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Page is URL-driven (?page=N, 1-indexed) so a deep link is meaningful and
  // reproducible, not just in-memory client state (FE-EC-09).
  const rawPageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(rawPageParam) && rawPageParam >= 1 ? rawPageParam - 1 : 0;

  const { data, isLoading } = useTransactions(PAGE_SIZE, page * PAGE_SIZE);

  const totalPages = data ? Math.max(1, Math.ceil(data.pagination.total / PAGE_SIZE)) : 1;

  // FE-EC-09: a deep link to a page number beyond total pages falls back to
  // the last valid page, rather than rendering an empty/broken page. Done
  // via a URL replace in an effect, not a setState call during render.
  const effectivePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (!isLoading && effectivePage !== page) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(effectivePage + 1));
      router.replace(`${pathname}?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, effectivePage, page]);

  const goToPage = (zeroIndexedPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(zeroIndexedPage + 1));
    router.push(`${pathname}?${params.toString()}`);
  };

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((tx) => {
      const categoryName = categoryNameById.get(tx.category_id) || '';
      const matchesSearch =
        !searchTerm ||
        tx.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || tx.category_id === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [data, searchTerm, filterCategory, categoryNameById]);

  const defaultAccountId = accounts?.[0]?.id;

  const handleDelete = async (id: string) => {
    if (confirm('Delete this transaction?')) {
      await deleteTransaction.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="flex items-center justify-between gap-4">
        <Input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-input-bg-light dark:bg-input-bg-dark text-text-light dark:text-text-dark"
        >
          <option value="all">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button variant="primary" onClick={() => setShowQuickAdd(true)} disabled={!defaultAccountId}>
          Add Transaction
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          Export
        </Button>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted-light dark:text-text-muted-dark">Loading…</div>
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            icon="💳"
            title={searchTerm || filterCategory !== 'all' ? 'No matching transactions' : 'No transactions yet'}
            description={
              searchTerm || filterCategory !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Add your first transaction to get started.'
            }
          />
        ) : (
          <table className="w-full">
            <thead className="border-b border-border-light dark:border-border-dark bg-card-alt-light dark:bg-card-alt-dark">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className={`border-b border-border-light dark:border-border-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark ${
                    tx.id.startsWith('optimistic-') ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-6 py-3 text-sm whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="px-6 py-3 text-sm font-medium max-w-xs truncate" title={tx.notes || ''}>
                    {truncate(tx.notes || '—', 50)}
                  </td>
                  <td className="px-6 py-3 text-sm truncate max-w-[150px]" title={categoryNameById.get(tx.category_id)}>
                    {truncate(categoryNameById.get(tx.category_id) || '—', 20)}
                  </td>
                  <td
                    className={`px-6 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                      tx.type === 'income' ? 'text-primary' : 'text-text-light dark:text-text-dark'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCents(tx.amount_cents, currency)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-danger"
                      onClick={() => handleDelete(tx.id)}
                      disabled={tx.id.startsWith('optimistic-')}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Pagination */}
      {data && data.pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            Showing {effectivePage * PAGE_SIZE + 1}-{Math.min((effectivePage + 1) * PAGE_SIZE, data.pagination.total)} of{' '}
            {data.pagination.total} transactions
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={effectivePage === 0} onClick={() => goToPage(Math.max(0, effectivePage - 1))}>
              Previous
            </Button>
            <Button variant="primary" size="sm" disabled>
              {effectivePage + 1} / {totalPages}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={effectivePage >= totalPages - 1}
              onClick={() => goToPage(Math.min(totalPages - 1, effectivePage + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showQuickAdd && defaultAccountId && (
        <QuickAddForm accountId={defaultAccountId} onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  );
}
