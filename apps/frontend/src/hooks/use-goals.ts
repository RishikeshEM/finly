'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_cents: number;
  current_cents: number;
  deadline: string;
  monthly_contribution_cents: number;
  version: number;
  updated_at: string;
  progress_percentage: number;
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await apiClient.get<{ goals: Goal[] }>('/goals');
      return res.data.goals;
    },
  });
}

interface CreateGoalInput {
  name: string;
  targetCents: number;
  deadline: string;
  monthlyContributionCents?: number;
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const res = await apiClient.post<Goal>('/goals', input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      version,
      ...updates
    }: {
      id: string;
      version: number;
      current_cents?: number;
      monthly_contribution_cents?: number;
      name?: string;
    }) => {
      const res = await apiClient.patch<Goal>(`/goals/${id}`, { ...updates, version });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
