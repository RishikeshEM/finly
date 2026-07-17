'use client';

import { GoalsPage } from '@/components/goals/goals-page';

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-5xl font-extrabold mb-8 text-text-light dark:text-text-dark">Savings Goals</h1>
      <GoalsPage />
    </div>
  );
}
