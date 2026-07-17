'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications, useMarkNotificationRead, getNotificationLabel } from '@/hooks/use-notifications';
import { formatDate } from '@/lib/format';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unreadCount = notifications?.filter((n) => !n.read_at).length || 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-border-light dark:border-border-dark font-semibold">
            Notifications
          </div>

          {isLoading && <div className="px-4 py-6 text-center text-text-muted-light dark:text-text-muted-dark text-sm">Loading…</div>}

          {!isLoading && (!notifications || notifications.length === 0) && (
            <div className="px-4 py-6 text-center text-text-muted-light dark:text-text-muted-dark text-sm">
              No notifications yet
            </div>
          )}

          {notifications?.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read_at && markRead.mutate(n.id)}
              className={`block w-full text-left px-4 py-3 border-b border-border-light dark:border-border-dark last:border-b-0 hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark ${
                !n.read_at ? 'bg-secondary/5' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-text-light dark:text-text-dark">
                  {getNotificationLabel(n.type)}
                </span>
                {!n.read_at && <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />}
              </div>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                {formatDate(n.created_at)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
