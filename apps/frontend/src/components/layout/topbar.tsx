'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Topbar() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="h-20 border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex items-center justify-between px-8 sticky top-0 z-40">
      <div>
        {/* Placeholder for search or other header content */}
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications Bell */}
        <button className="relative p-2 text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="w-10 h-10 p-0 flex items-center justify-center"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </Button>

        {/* User Menu Placeholder */}
        <button className="w-10 h-10 rounded-lg bg-secondary text-white font-semibold flex items-center justify-center">
          U
        </button>
      </div>
    </div>
  );
}
