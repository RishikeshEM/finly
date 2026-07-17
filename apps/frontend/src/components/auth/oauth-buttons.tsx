'use client';

/**
 * OAuth sign-in buttons (Google/Apple).
 *
 * Phase 2 gap: the backend only implements the OAuth callback stub
 * (GET /api/v1/auth/oauth/:provider/callback, returns 501) - there is no
 * OAuth-initiation endpoint yet, and no defined contract for how a completed
 * OAuth round-trip communicates FE-EC-10's two distinct error cases
 * (provider-email mismatch vs. already-registered-under-a-different-provider)
 * back to the client (redirect query params? JSON error codes?). Inventing
 * that contract from the frontend alone would be guessing at a backend
 * decision, not implementing one - so these buttons surface a clear
 * "coming soon" state instead of a broken/silent network call. Once BE-01
 * Phase 2 defines the initiation + error-reporting contract, wire real
 * navigation here and add the distinct FE-EC-10 error states.
 */

import { useState } from 'react';

export function OAuthButtons() {
  const [notice, setNotice] = useState('');

  return (
    <div>
      {notice && (
        <p className="text-center text-xs text-text-muted-light dark:text-text-muted-dark mb-3">{notice}</p>
      )}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <button
          type="button"
          onClick={() => setNotice('Google sign-in is coming soon.')}
          className="font-semibold rounded-lg border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark px-4 py-2"
        >
          Google
        </button>
        <button
          type="button"
          onClick={() => setNotice('Apple sign-in is coming soon.')}
          className="font-semibold rounded-lg border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-hover-bg-light dark:hover:bg-hover-bg-dark px-4 py-2"
        >
          Apple
        </button>
      </div>
    </div>
  );
}
