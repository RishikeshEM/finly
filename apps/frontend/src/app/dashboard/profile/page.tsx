'use client';

import { ProfilePage } from '@/components/profile/profile-page';

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-5xl font-extrabold mb-8 text-text-light dark:text-text-dark">Profile</h1>
      <ProfilePage />
    </div>
  );
}
