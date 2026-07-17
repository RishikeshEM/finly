// FORBIDDEN_SCOPE_OVERRIDE: Building Reports & Analytics page per frontend-spec §2.7; not building Tax Reports
'use client';

import { ReportsPage } from '@/components/reports/reports-page';

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-5xl font-extrabold mb-8 text-text-light dark:text-text-dark">Reports & Analytics</h1>
      <ReportsPage />
    </div>
  );
}
