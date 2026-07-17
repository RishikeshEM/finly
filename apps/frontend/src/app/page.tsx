'use client';

import { LoginForm } from '@/components/auth/login-form';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <LoginForm />
    </main>
  );
}
