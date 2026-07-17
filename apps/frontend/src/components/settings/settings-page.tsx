// FORBIDDEN_SCOPE_OVERRIDE: Building Settings page per spec; not building Tax Reports
'use client';

/**
 * Settings page.
 *
 * frontend-spec §6 flags that no real mockup exists for this page - the
 * fields below are chosen to match what backend-spec §2.2 actually exposes
 * via GET/PATCH /api/v1/users/me (preferred_currency, country, timezone,
 * notification_prefs), rather than inventing fields the API can't persist.
 * "Change Password" / "Enable 2FA" / "Login Activity" from the earlier
 * placeholder aren't wired up: BE-01 has no password-change, MFA-enrollment,
 * or session-history endpoints yet (those are Phase 2, same as OTP/OAuth) -
 * shown as coming-soon rather than buttons that would silently do nothing.
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useUpdateProfile } from '@/hooks/use-profile';
import { ChevronDownIcon } from '@/components/icons';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];
const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata'];

export function SettingsPage() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const [currency, setCurrency] = useState(user?.preferred_currency || 'USD');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [emailNotifs, setEmailNotifs] = useState(user?.notification_prefs?.email !== false);
  const [pushNotifs, setPushNotifs] = useState(user?.notification_prefs?.push !== false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (user) {
      setCurrency(user.preferred_currency);
      setTimezone(user.timezone);
      setEmailNotifs(user.notification_prefs?.email !== false);
      setPushNotifs(user.notification_prefs?.push !== false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaveState('idle');
    try {
      await updateProfile.mutateAsync({
        preferred_currency: currency,
        timezone,
        notification_prefs: { email: emailNotifs, push: pushNotifs },
      });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {saveState === 'saved' && (
        <Card className="bg-primary/10 border-primary text-primary text-sm">Settings saved successfully.</Card>
      )}
      {saveState === 'error' && <Card className="bg-danger/10 border-danger text-danger text-sm">Failed to save settings.</Card>}

      {/* Preferences */}
      <Card>
        <h3 className="text-base font-bold mb-5 text-text-light dark:text-text-dark">Preferences</h3>

        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-semibold mb-2 text-text-muted-light dark:text-text-muted-dark">
              Preferred Currency
            </label>
            <div className="relative max-w-xs">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark text-[13px] font-semibold cursor-pointer"
                style={{ height: '40px', padding: '0 32px 0 14px' }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light dark:text-text-muted-dark"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2 text-text-muted-light dark:text-text-muted-dark">Timezone</label>
            <div className="relative max-w-xs">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark text-[13px] font-semibold cursor-pointer"
                style={{ height: '40px', padding: '0 32px 0 14px' }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light dark:text-text-muted-dark"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <h3 className="text-base font-bold mb-5 text-text-light dark:text-text-dark">Notifications</h3>

        <div className="space-y-4">
          <ToggleRow
            label="Email Notifications"
            description="Budget alerts, bill reminders, and summaries"
            checked={emailNotifs}
            onChange={setEmailNotifs}
          />
          <div className="border-t border-border-light dark:border-border-dark pt-4">
            <ToggleRow
              label="Push Notifications"
              description="Real-time alerts and reminders"
              checked={pushNotifs}
              onChange={setPushNotifs}
            />
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <h3 className="text-base font-bold mb-2 text-text-light dark:text-text-dark">Security</h3>
        <p className="text-[13px] text-text-muted-light dark:text-text-muted-dark">
          Password changes, two-factor authentication, and login activity are coming soon.
        </p>
      </Card>

      {/* Save Changes */}
      <div className="flex gap-3">
        <Button variant="primary" onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-text-light dark:text-text-dark">{label}</p>
        <p className="text-[13px] text-text-muted-light dark:text-text-muted-dark mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-secondary' : 'bg-card-alt-light dark:bg-card-alt-dark'}`}
        style={{ width: 40, height: 22 }}
      >
        <span
          className="absolute bg-white rounded-full transition-transform shadow-sm"
          style={{ width: 18, height: 18, top: 2, left: 2, transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}
