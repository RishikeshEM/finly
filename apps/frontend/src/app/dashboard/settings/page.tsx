'use client';

import { SettingsPage } from '@/components/settings/settings-page';

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-5xl font-extrabold mb-8 text-text-light dark:text-text-dark">Settings</h1>
      <SettingsPage />
    </div>
  );
}
