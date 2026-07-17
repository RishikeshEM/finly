'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface UpdateProfileInput {
  preferred_currency?: string;
  country?: string;
  timezone?: string;
  notification_prefs?: Record<string, boolean>;
}

export function useUpdateProfile() {
  const { refetchUser } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const res = await apiClient.patch('/users/me', input);
      return res.data;
    },
    onSuccess: () => {
      refetchUser();
    },
  });
}

export function useExportMyData() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.get('/users/me/export');
      return res.data;
    },
  });
}

export function useDeleteAccount() {
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete('/users/me');
    },
    onSuccess: () => {
      logout();
    },
  });
}
