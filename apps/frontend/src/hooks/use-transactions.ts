'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string;
  type: 'income' | 'expense';
  amount_cents: number;
  date: string;
  notes: string | null;
  payment_method: string | null;
  recurring: boolean;
  recurrence_rule: string | null;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
}

export function useTransactions(limit: number, offset: number) {
  return useQuery({
    queryKey: ['transactions', { limit, offset }],
    queryFn: async () => {
      const res = await apiClient.get<{ transactions: Transaction[]; pagination: { limit: number; offset: number; total: number } }>(
        '/transactions',
        { params: { limit, offset } }
      );
      return res.data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get<{ categories: Category[] }>('/categories');
      return res.data.categories;
    },
    staleTime: 1000 * 60 * 30, // categories change rarely
  });
}

interface CreateTransactionInput {
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amountCents: number;
  date: string;
  notes?: string;
  idempotencyKey: string;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const res = await apiClient.post<Transaction>('/transactions', input);
      return res.data;
    },
    // FE-EC-07: optimistic UI update, rolled back cleanly on network failure
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['transactions'] });

      const optimisticTransaction: Transaction = {
        id: `optimistic-${input.idempotencyKey}`,
        account_id: input.accountId,
        category_id: input.categoryId,
        type: input.type,
        amount_cents: input.amountCents,
        date: input.date,
        notes: input.notes || null,
        payment_method: null,
        recurring: false,
        recurrence_rule: null,
      };

      queryClient.setQueriesData({ queryKey: ['transactions'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          transactions: [optimisticTransaction, ...old.transactions],
          pagination: { ...old.pagination, total: old.pagination.total + 1 },
        };
      });

      return { previousData };
    },
    onError: (_err, _input, context) => {
      // Roll back to the pre-mutation state on failure
      context?.previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transaction> }) => {
      const res = await apiClient.patch<Transaction>(`/transactions/${id}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
