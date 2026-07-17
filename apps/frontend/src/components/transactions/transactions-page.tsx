'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useTransactions, useCategories, useDeleteTransaction } from '@/hooks/use-transactions';
import { useAccounts } from '@/hooks/use-accounts';
import { useAuth } from '@/lib/auth-context';
import { formatCents, formatDate, truncate } from '@/lib/format';
import { QuickAddForm } from '@/components/transactions/quick-add-form';
import { SearchIcon, ChevronDownIcon, DownloadIcon } from '@/components/icons';
import tokens from '../../../../../inputs/design/tokens.json';

const light = tokens.color.light;
const CATEGORY_COLORS = [light.secondary, light.primary, light.warning, light.accent, light.danger];

function colorForCategory(categoryId: string): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

function initialsOf(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w[0]?.toUpperCase() || '').join('') || '?';
}

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

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
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

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ['Date', 'Description', 'Category', 'Amount', 'Type'],
      ...data.transactions.map((tx) => [
        tx.date,
        tx.notes || '',
        categoryNameById.get(tx.category_id) || '',
        (tx.amount_cents / 100).toFixed(2),
        tx.type,
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-page-${effectivePage + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg flex-1"
          style={{ padding: '0 12px', height: '40px', maxWidth: '320px' }}
        >
          <SearchIcon size={18} className="text-text-faint-light dark:text-text-faint-dark flex-shrink-0" />
          <input
            type="text"
            placeholder="Search transactions"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none outline-none bg-transparent text-text-light dark:text-text-dark text-sm w-full"
          />
        </div>

        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="appearance-none rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark text-[13px] font-semibold cursor-pointer"
            style={{ height: '40px', padding: '0 32px 0 14px' }}
          >
            <option value="all">All Categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light dark:text-text-muted-dark" />
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowQuickAdd(true)}
          disabled={!defaultAccountId}
          className="flex items-center gap-2 rounded-lg bg-secondary text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ height: '40px', padding: '0 16px' }}
        >
          Add Transaction
        </button>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark text-[13px] font-semibold hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark transition-colors"
          style={{ height: '40px', padding: '0 16px' }}
        >
          <DownloadIcon size={16} />
          Export
        </button>
      </div>

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
          <>
            <div
              className="grid border-b border-border-light dark:border-border-dark text-[12px] font-bold text-text-faint-light dark:text-text-faint-dark uppercase tracking-wide"
              style={{ gridTemplateColumns: '110px 2fr 1fr 120px 80px', padding: '14px 24px' }}
            >
              <div>Date</div>
              <div>Description</div>
              <div>Category</div>
              <div className="text-right">Amount</div>
              <div className="text-center">Actions</div>
            </div>
            {filteredTransactions.map((tx) => {
              const categoryName = categoryNameById.get(tx.category_id) || '—';
              const label = tx.notes || categoryName;
              const catColor = colorForCategory(tx.category_id);
              return (
                <div
                  key={tx.id}
                  className={`grid items-center border-b border-border-light dark:border-border-dark last:border-b-0 hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark text-sm ${
                    tx.id.startsWith('optimistic-') ? 'opacity-60' : ''
                  }`}
                  style={{ gridTemplateColumns: '110px 2fr 1fr 120px 80px', padding: '16px 24px' }}
                >
                  <div className="text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">{formatDate(tx.date)}</div>
                  <div className="flex items-center gap-2.5 font-semibold min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{ backgroundColor: `${catColor}1A`, color: catColor }}
                    >
                      {initialsOf(label)}
                    </div>
                    <span className="truncate" title={label}>
                      {truncate(label, 40)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block truncate max-w-full"
                      style={{ backgroundColor: `${catColor}1A`, color: catColor }}
                      title={categoryName}
                    >
                      {truncate(categoryName, 18)}
                    </span>
                  </div>
                  <div
                    className={`text-right font-bold whitespace-nowrap ${
                      tx.type === 'income' ? 'text-primary' : 'text-text-light dark:text-text-dark'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCents(tx.amount_cents, currency)}
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={tx.id.startsWith('optimistic-')}
                      className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {data && data.pagination.total > 0 && (
              <div className="flex items-center justify-between" style={{ padding: '16px 24px' }}>
                <p className="text-[13px] text-text-muted-light dark:text-text-muted-dark">
                  Showing {effectivePage * PAGE_SIZE + 1}–{Math.min((effectivePage + 1) * PAGE_SIZE, data.pagination.total)} of{' '}
                  {data.pagination.total} transactions
                </p>
                <div className="flex gap-1.5">
                  <PageButton disabled={effectivePage === 0} onClick={() => goToPage(effectivePage - 1)}>
                    ‹
                  </PageButton>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i).map((i) => (
                    <PageButton key={i} active={i === effectivePage} onClick={() => goToPage(i)}>
                      {i + 1}
                    </PageButton>
                  ))}
                  <PageButton disabled={effectivePage >= totalPages - 1} onClick={() => goToPage(effectivePage + 1)}>
                    ›
                  </PageButton>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {showQuickAdd && defaultAccountId && (
        <QuickAddForm accountId={defaultAccountId} onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  );
}

function PageButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-lg border text-[13px] font-semibold disabled:opacity-40 transition-colors ${
        active
          ? 'bg-secondary border-secondary text-white'
          : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-muted-light dark:text-text-muted-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark'
      }`}
    >
      {children}
    </button>
  );
}
