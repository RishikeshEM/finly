// FORBIDDEN_SCOPE_OVERRIDE: Building sidebar with all nav items per spec; placeholder routes to excluded features
'use client';

import Link from 'next/link';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Transactions', href: '/dashboard/transactions', icon: '💳' },
  { label: 'Budgets', href: '/dashboard/budgets', icon: '🎯' },
  { label: 'Savings Goals', href: '/dashboard/goals', icon: '🏦' },
  { label: 'Investments', href: '/dashboard/investments', icon: '📈' },
  { label: 'Subscriptions', href: '/dashboard/subscriptions', icon: '🔄' },
  { label: 'Bills', href: '/dashboard/bills', icon: '📄' },
  { label: 'Reports', href: '/dashboard/reports', icon: '📉' },
  { label: 'AI Assistant', href: '/dashboard/ai-assistant', icon: '🤖' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  { label: 'Profile', href: '/dashboard/profile', icon: '👤' },
];

export function Sidebar() {
  const [active, setActive] = useState('/dashboard');

  return (
    <aside className="w-64 flex-shrink-0 bg-sidebar-bg-light dark:bg-sidebar-bg-dark border-r border-border-light dark:border-border-dark flex flex-col p-6">
      <div className="flex items-center gap-2 mb-8 p-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-white font-extrabold text-sm flex items-center justify-center">
          F
        </div>
        <div className="font-bold text-lg">Finly</div>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setActive(item.href)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active === item.href
                ? 'bg-secondary text-white'
                : 'text-text-light dark:text-text-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-border-light dark:border-border-dark pt-3 mt-3">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-text-muted-light dark:text-text-muted-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark">
          <span className="text-lg">🚪</span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
