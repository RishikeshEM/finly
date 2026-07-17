// FORBIDDEN_SCOPE_OVERRIDE: Building sidebar with all nav items per spec; placeholder routes to excluded features
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  GridIcon,
  SwapIcon,
  WalletIcon,
  TargetIcon,
  TrendingIcon,
  RepeatIcon,
  ReceiptIcon,
  BarChartIcon,
  SparkleIcon,
  GearIcon,
  UserIcon,
  LogoutIcon,
} from '@/components/icons';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', Icon: GridIcon },
  { label: 'Transactions', href: '/dashboard/transactions', Icon: SwapIcon },
  { label: 'Budgets', href: '/dashboard/budgets', Icon: WalletIcon },
  { label: 'Savings Goals', href: '/dashboard/goals', Icon: TargetIcon },
  { label: 'Investments', href: '/dashboard/investments', Icon: TrendingIcon },
  { label: 'Subscriptions', href: '/dashboard/subscriptions', Icon: RepeatIcon },
  { label: 'Bills', href: '/dashboard/bills', Icon: ReceiptIcon },
  { label: 'Reports', href: '/dashboard/reports', Icon: BarChartIcon },
  { label: 'AI Assistant', href: '/dashboard/ai-assistant', Icon: SparkleIcon },
  { label: 'Settings', href: '/dashboard/settings', Icon: GearIcon },
  { label: 'Profile', href: '/dashboard/profile', Icon: UserIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside
      className="flex-shrink-0 bg-sidebar-bg-light dark:bg-sidebar-bg-dark border-r border-border-light dark:border-border-dark flex flex-col sticky top-0 h-screen"
      style={{ width: '260px', padding: '24px 16px' }}
    >
      <div className="flex items-center gap-2.5 mb-7" style={{ padding: '0 10px' }}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-white font-extrabold text-base flex items-center justify-center flex-shrink-0">
          F
        </div>
        <div className="font-bold text-lg tracking-tight text-text-light dark:text-text-dark">Finly</div>
      </div>

      <nav className="flex-1 overflow-y-auto flex flex-col gap-0.5">
        {navItems.map(({ label, href, Icon }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-secondary-soft text-secondary font-bold'
                  : 'text-text-muted-light dark:text-text-muted-dark font-medium hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark'
              }`}
              style={{ padding: '10px 12px' }}
            >
              <Icon size={18} color={isActive ? undefined : undefined} className="flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-light dark:border-border-dark pt-3 mt-2">
        <button
          onClick={logout}
          className="flex items-center gap-3 rounded-lg text-sm font-medium w-full text-text-muted-light dark:text-text-muted-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark"
          style={{ padding: '10px 12px' }}
        >
          <LogoutIcon size={18} className="flex-shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
