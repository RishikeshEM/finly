import { formatCents, formatPercent, truncate } from '../format';

describe('formatCents (FE-TC-08: never a hardcoded currency symbol)', () => {
  it('formats USD cents correctly', () => {
    expect(formatCents(4550, 'USD', 'en-US')).toBe('$45.50');
  });

  it('formats a different currency using its own symbol, not $', () => {
    const result = formatCents(4550, 'EUR', 'de-DE');
    expect(result).not.toContain('$');
    expect(result).toMatch(/45,50/);
  });

  it('formats INR using its own symbol', () => {
    const result = formatCents(150000, 'INR', 'en-IN');
    expect(result).not.toContain('$');
    expect(result).toContain('1,500.00');
  });

  it('formats negative amounts correctly', () => {
    expect(formatCents(-4550, 'USD', 'en-US')).toBe('-$45.50');
  });

  it('formats zero correctly', () => {
    expect(formatCents(0, 'USD', 'en-US')).toBe('$0.00');
  });
});

describe('formatPercent', () => {
  it('rounds to the nearest whole percent', () => {
    expect(formatPercent(85.4)).toBe('85%');
    expect(formatPercent(85.6)).toBe('86%');
  });

  it('does not clip values above 100 (FE-EC-04)', () => {
    expect(formatPercent(150)).toBe('150%');
  });
});

describe('truncate (FE-EC-05: long text truncates with ellipsis)', () => {
  it('leaves short text unchanged', () => {
    expect(truncate('Groceries', 20)).toBe('Groceries');
  });

  it('truncates long text with an ellipsis', () => {
    const long = 'A very long transaction description that overflows the column';
    const result = truncate(long, 20);
    expect(result.length).toBe(20);
    expect(result.endsWith('…')).toBe(true);
  });

  it('does not truncate text exactly at the limit', () => {
    const exact = '12345678901234567890'; // 20 chars
    expect(truncate(exact, 20)).toBe(exact);
  });
});
