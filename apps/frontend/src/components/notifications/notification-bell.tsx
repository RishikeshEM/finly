'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications, useMarkNotificationRead, getNotificationLabel } from '@/hooks/use-notifications';
import { formatDate } from '@/lib/format';
import { BellIcon } from '@/components/icons';

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
        className="relative rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark flex items-center justify-center text-text-muted-light dark:text-text-muted-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark transition-colors"
        style={{ width: '40px', height: '40px' }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-[7px] right-2 w-2 h-2 rounded-full bg-danger border-2 border-card-light dark:border-card-dark" />
        )}
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
