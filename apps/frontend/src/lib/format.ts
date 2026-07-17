/**
 * Locale-aware formatting helpers.
 * Amounts from the backend are always integer cents (backend-spec §2.4) -
 * never render a hardcoded "$" (FE-EC-03); always format via the user's
 * Preferred Currency.
 */

export function formatCents(cents: number, currency: string = 'USD', locale?: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
