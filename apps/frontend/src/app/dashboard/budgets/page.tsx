'use client';

import { BudgetsPage } from '@/components/budgets/budgets-page';

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-5xl font-extrabold mb-8 text-text-light dark:text-text-dark">Budgets</h1>
      <BudgetsPage />
    </div>
  );
}
