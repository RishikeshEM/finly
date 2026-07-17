'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface DashboardData {
  kpis: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savings: number;
    netWorth: number;
  };
  cashFlow: {
    labels: string[];
    income: number[];
    expenses: number[];
  };
  budgetsSummary: {
    topBudgets: Array<{ categoryName: string; limit: number; spent: number; status: string }>;
  };
  goalsSummary: {
    activeGoals: number;
    goals: Array<{
      name: string;
      target: number;
      current: number;
      progress: number;
      deadline: string;
      monthlyContribution: number;
    }>;
  };
  recentTransactions: Array<{
    id: string;
    date: string;
    category: string;
    amount: number;
    notes: string | null;
    type: 'income' | 'expense';
  }>;
  upcomingBills: Array<{ date: string; amount: number; category: string; notes: string | null }>;
  subscriptions: Array<{ name: string; amount: number; frequency: string | null }>;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<DashboardData>('/dashboard');
      return res.data;
    },
  });
}
