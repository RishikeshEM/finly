'use client';

import { Dashboard } from '@/components/dashboard/dashboard';

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-5xl font-extrabold mb-8 text-text-light dark:text-text-dark">Dashboard</h1>
      <Dashboard />
    </div>
  );
}
