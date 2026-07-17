'use client';

/**
 * Profile page.
 *
 * frontend-spec §6 flags that no real mockup exists for this page. The
 * users table (database-spec §2.1) has no first/last name, phone, or city
 * fields - only email, preferred_currency, country, timezone, role, and
 * notification_prefs - so this page is designed around the identity data
 * that actually exists (account info + GDPR data controls) rather than a
 * fictional contact-details form.
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useExportMyData, useDeleteAccount } from '@/hooks/use-profile';
import { formatDate } from '@/lib/format';

export function ProfilePage() {
  const { user } = useAuth();
  const exportData = useExportMyData();
  const deleteAccount = useDeleteAccount();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExport = async () => {
    setExportError('');
    try {
      const data = await exportData.mutateAsync();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finly-data-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Failed to export your data. Please try again.');
    }
  };

  const handleDelete = async () => {
    await deleteAccount.mutateAsync();
  };

  if (!user) return null;

  const initial = user.email[0]?.toUpperCase() || '?';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Header */}
      <Card className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-secondary text-white font-bold text-4xl flex items-center justify-center flex-shrink-0">
          {initial}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">{user.email}</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark capitalize">{user.role.replace('_', ' ')}</p>
        </div>
      </Card>

      {/* Account Information */}
      <Card>
        <h3 className="text-lg font-semibold mb-6 text-text-light dark:text-text-dark">Account Information</h3>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between py-2 border-b border-border-light dark:border-border-dark">
            <span className="text-text-muted-light dark:text-text-muted-dark">Email</span>
            <span className="font-medium text-text-light dark:text-text-dark">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border-light dark:border-border-dark">
            <span className="text-text-muted-light dark:text-text-muted-dark">Preferred Currency</span>
            <span className="font-medium text-text-light dark:text-text-dark">{user.preferred_currency}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-text-muted-light dark:text-text-muted-dark">Timezone</span>
            <span className="font-medium text-text-light dark:text-text-dark">{user.timezone}</span>
          </div>
        </div>

        <p className="text-xs text-text-faint-light dark:text-text-faint-dark mt-4">
          To change these, use the Settings page.
        </p>
      </Card>

      {/* GDPR Data Controls */}
      <Card>
        <h3 className="text-lg font-semibold mb-2 text-text-light dark:text-text-dark">Your Data</h3>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-6">
          Download a complete copy of your data, or permanently delete your account.
        </p>

        {exportError && <div className="p-3 mb-4 bg-danger/10 border border-danger rounded-lg text-danger text-sm">{exportError}</div>}

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={handleExport} disabled={exportData.isPending}>
            {exportData.isPending ? 'Preparing export…' : 'Download Your Data'}
          </Button>

          {!confirmingDelete ? (
            <Button variant="outline" className="w-full text-danger" onClick={() => setConfirmingDelete(true)}>
              Delete Account
            </Button>
          ) : (
            <div className="space-y-2 p-4 bg-danger/10 border border-danger rounded-lg">
              <p className="text-sm text-danger font-medium">
                This will permanently delete your account. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 bg-danger hover:opacity-90"
                  onClick={handleDelete}
                  disabled={deleteAccount.isPending}
                >
                  {deleteAccount.isPending ? 'Deleting…' : 'Confirm Delete'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
