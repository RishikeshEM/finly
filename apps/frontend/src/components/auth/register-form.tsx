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
import { registerSchema, RegisterFormValues } from '@/lib/auth-schemas';
import { OAuthButtons } from '@/components/auth/oauth-buttons';

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError('');
    try {
      await registerUser(values.email, values.password);
      router.push('/dashboard');
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      setServerError(axiosErr.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary text-white font-extrabold text-lg flex items-center justify-center">
            F
          </div>
          <div className="font-bold text-2xl text-text-light dark:text-text-dark">Finly</div>
        </div>

        <div className="mb-10 text-center">
          <h2 className="text-4xl font-bold mb-3 text-text-light dark:text-text-dark">Create your account</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark">
            Start tracking every dollar today.
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
            <Input type="password" placeholder="At least 8 characters" {...register('password')} />
            {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-muted-light dark:text-text-muted-dark mb-2">
              Confirm password
            </label>
            <Input type="password" placeholder="••••••••" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full mt-6">
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
          <span className="text-xs text-text-faint-light dark:text-text-faint-dark">or continue with</span>
          <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
        </div>

        <OAuthButtons />

        <p className="text-center text-sm text-text-muted-light dark:text-text-muted-dark mt-8">
          Already have an account?{' '}
          <Link href="/" className="text-secondary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
