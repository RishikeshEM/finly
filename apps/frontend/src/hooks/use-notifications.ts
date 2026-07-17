'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Notification {
  id: string;
  type: 'budget_alert' | 'bill_due' | 'goal_progress' | 'weekly_summary' | 'monthly_summary' | 'low_balance';
  channel: string;
  payload: Record<string, any>;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: async () => {
      const params = unreadOnly ? { read: 'false' } : {};
      const res = await apiClient.get<{ notifications: Notification[] }>('/notifications', { params });
      return res.data.notifications;
    },
    refetchInterval: 60_000, // poll every minute for new notifications
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

const NOTIFICATION_LABELS: Record<Notification['type'], string> = {
  budget_alert: 'Budget Alert',
  bill_due: 'Bill Due',
  goal_progress: 'Goal Progress',
  weekly_summary: 'Weekly Summary',
  monthly_summary: 'Monthly Summary',
  low_balance: 'Low Balance',
};

export function getNotificationLabel(type: Notification['type']): string {
  return NOTIFICATION_LABELS[type] || 'Notification';
}
