'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { SearchIcon, PlusIcon, SunIcon, MoonIcon } from '@/components/icons';

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/dashboard/transactions?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div
      className="border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex items-center justify-between sticky top-0 z-40"
      style={{ height: '72px', padding: '0 32px' }}
    >
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2.5 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg"
        style={{ padding: '0 12px', height: '40px', width: '320px' }}
      >
        <SearchIcon size={18} className="text-text-faint-light dark:text-text-faint-dark flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions, budgets..."
          className="border-none outline-none bg-transparent text-text-light dark:text-text-dark text-sm w-full placeholder-text-faint-light dark:placeholder-text-faint-dark"
        />
      </form>

      <div className="flex items-center gap-3.5">
        <Link
          href="/dashboard/transactions"
          className="flex items-center gap-2 rounded-lg bg-secondary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ height: '40px', padding: '0 16px' }}
        >
          <PlusIcon size={16} />
          Quick Add
        </Link>

        <NotificationBell />

        <button
          onClick={toggleTheme}
          className="rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark flex items-center justify-center text-text-muted-light dark:text-text-muted-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark transition-colors"
          style={{ width: '40px', height: '40px' }}
        >
          {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-1.5 border-l border-border-light dark:border-border-dark ml-1"
          >
            <div className="w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left leading-tight hidden md:block">
              <div className="text-sm font-semibold text-text-light dark:text-text-dark truncate max-w-[140px]">
                {user?.email}
              </div>
              <div className="text-xs text-text-muted-light dark:text-text-muted-dark capitalize">
                {user?.role?.replace('_', ' ') || 'User'}
              </div>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg py-1 z-50">
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
