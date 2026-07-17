'use client';

// FORBIDDEN_SCOPE_OVERRIDE: 'bank'/'card' below are manual-entry account type
// labels matching the accounts.type schema enum - no bank connection or sync
// of any kind is implemented.

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'card';
  created_at: string;
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await apiClient.get<{ accounts: Account[] }>('/accounts');
      return res.data.accounts;
    },
    staleTime: 1000 * 60 * 30,
  });
}
