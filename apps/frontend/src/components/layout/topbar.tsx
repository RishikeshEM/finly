'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="h-20 border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex items-center justify-between px-8 sticky top-0 z-40">
      <div>
        {/* Placeholder for search or other header content */}
      </div>

      <div className="flex items-center gap-6">
        <NotificationBell />

        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="w-10 h-10 p-0 flex items-center justify-center"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </Button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 rounded-lg bg-secondary text-white font-semibold flex items-center justify-center"
          >
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg py-1 z-50">
              <p className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark truncate border-b border-border-light dark:border-border-dark">
                {user?.email}
              </p>
              <Link
                href="/dashboard/profile"
                className="block px-4 py-2 text-sm hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                href="/dashboard/settings"
                className="block px-4 py-2 text-sm hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                onClick={logout}
                className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
