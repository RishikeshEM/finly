'use client';

/**
 * Password reset request UI. Backend (BE-01 Phase 2) currently returns 501
 * for POST /auth/password-reset/request - this form calls the real endpoint
 * and surfaces that as a clear "coming soon" state rather than a generic
 * network-error message, so the UI is honest about current capability while
 * staying wired to light up once Phase 2 ships.
 */

import { useState } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setIsError(false);

    try {
      await apiClient.post('/auth/password-reset/request', { email });
      // Generic success message regardless of whether the email exists,
      // to avoid user enumeration (BE-EC-04).
      setMessage("If an account exists for that email, we've sent a reset link.");
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
      if (axiosErr.response?.status === 501) {
        setMessage('Password reset is coming soon. Please contact support in the meantime.');
      } else {
        setIsError(true);
        setMessage('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold mb-3 text-text-light dark:text-text-dark">Reset your password</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {message && (
            <div
              className={`p-4 rounded-lg text-sm border ${
                isError ? 'bg-danger/10 border-danger text-danger' : 'bg-secondary/10 border-secondary text-secondary'
              }`}
            >
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-text-muted-light dark:text-text-muted-dark mb-2">
              Email address
            </label>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <p className="text-center text-sm text-text-muted-light dark:text-text-muted-dark mt-8">
          <Link href="/" className="text-secondary font-semibold hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
