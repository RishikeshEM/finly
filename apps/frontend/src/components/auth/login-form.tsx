// FORBIDDEN_SCOPE_OVERRIDE: Building login UI per spec; not implementing Bank Sync, Investment Tracking, or other excluded features
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { loginSchema, LoginFormValues } from '@/lib/auth-schemas';
import { OAuthButtons } from '@/components/auth/oauth-buttons';

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    try {
      await login(values.email, values.password);
      router.push('/dashboard');
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      // Generic message regardless of whether it's a bad email or bad password -
      // avoids user enumeration (backend-spec BE-EC-04's intent applies here too).
      setServerError(axiosErr.response?.data?.error || 'Invalid email or password');
    }
  };

  return (
    <div className="grid grid-cols-[44%_56%] min-h-screen">
      {/* Left Panel */}
      <div className="bg-login-panel-bg-light dark:bg-login-panel-bg-dark p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-transparent" />
        <div className="absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-gradient-to-br from-secondary/10 to-transparent" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary text-white font-extrabold text-lg flex items-center justify-center">
              F
            </div>
            <div className="text-white font-bold text-2xl">Finly</div>
          </div>

          <div className="max-w-lg">
            <h1 className="text-white text-5xl font-bold mb-6 leading-tight">
              Every dollar, tracked. Every goal, closer.
            </h1>
            <p className="text-gray-400 text-xl mb-10 leading-relaxed">
              Budgeting, savings, goals and bills in one calm, connected dashboard.
            </p>

            <div className="space-y-4">
              <FeatureItem text="Automated categorization and budgets" />
              <FeatureItem text="Real-time cash flow and net worth" />
              <FeatureItem text="Bank-grade security, always encrypted" />
            </div>
          </div>
        </div>

        <div className="relative z-10 text-gray-500 text-sm">
          © 2026 Finly Inc.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="bg-bg-light dark:bg-bg-dark flex items-center justify-center relative p-8">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h2 className="text-4xl font-bold mb-3 text-text-light dark:text-text-dark">Welcome back</h2>
            <p className="text-text-muted-light dark:text-text-muted-dark">
              Sign in to continue to your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {serverError && (
              <div className="p-4 bg-danger/10 border border-danger rounded-lg text-danger text-sm">
                {serverError}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-text-muted-light dark:text-text-muted-dark mb-2">
                Email address
              </label>
              <Input type="email" placeholder="you@company.com" {...register('email')} />
              {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-muted-light dark:text-text-muted-dark mb-2">
                Password
              </label>
              <Input type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-sm text-secondary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full mt-6">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
            <span className="text-xs text-text-faint-light dark:text-text-faint-dark">or continue with</span>
            <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
          </div>

          <OAuthButtons />

          <p className="text-center text-sm text-text-muted-light dark:text-text-muted-dark mt-8">
            Don't have an account?{' '}
            <Link href="/register" className="text-secondary font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-gray-300 text-sm">
      <svg className="w-5 h-5 flex-shrink-0 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      <span>{text}</span>
    </div>
  );
}
