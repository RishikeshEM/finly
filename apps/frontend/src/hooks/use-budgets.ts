'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  period_type: 'monthly' | 'weekly' | 'yearly';
  limit_cents: number;
  start_date: string;
  version: number;
  updated_at: string;
}

export interface BudgetStatus {
  id: string;
  category_id: string;
  limit_cents: number;
  spent_cents: number;
  status: 'on_track' | 'near_limit' | 'over_budget';
}

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const res = await apiClient.get<{ budgets: Budget[]; status: BudgetStatus[] }>('/budgets');
      return res.data;
    },
  });
}

interface CreateBudgetInput {
  categoryId: string;
  periodType: 'monthly' | 'weekly' | 'yearly';
  limitCents: number;
  startDate: string;
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const res = await apiClient.post<Budget>('/budgets', input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, limitCents, version }: { id: string; limitCents: number; version: number }) => {
      const res = await apiClient.patch<Budget>(`/budgets/${id}`, { limitCents, version });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
