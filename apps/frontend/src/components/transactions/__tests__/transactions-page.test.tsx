import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { TransactionsPage } from '../transactions-page';
import { useTransactions, useCategories, useDeleteTransaction } from '@/hooks/use-transactions';
import { useAccounts } from '@/hooks/use-accounts';
import { useAuth } from '@/lib/auth-context';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParamsValue = '1';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => '/dashboard/transactions',
  useSearchParams: () => ({
    get: (key: string) => (key === 'page' ? mockSearchParamsValue : null),
    toString: () => `page=${mockSearchParamsValue}`,
  }),
}));

jest.mock('@/hooks/use-transactions', () => ({
  useTransactions: jest.fn(),
  useCategories: jest.fn(),
  useDeleteTransaction: jest.fn(),
}));

jest.mock('@/hooks/use-accounts', () => ({
  useAccounts: jest.fn(),
}));

jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TransactionsPage pagination (FE-TC-17, FE-EC-09)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { preferred_currency: 'USD' } });
    (useCategories as jest.Mock).mockReturnValue({ data: [] });
    (useAccounts as jest.Mock).mockReturnValue({ data: [{ id: 'acc-1' }] });
    (useDeleteTransaction as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
  });

  it('falls back to the last valid page when a deep link points past the total', async () => {
    // 45 transactions at PAGE_SIZE=20 => 3 valid pages (0, 1, 2)
    (useTransactions as jest.Mock).mockReturnValue({
      data: { transactions: [], pagination: { limit: 20, offset: 0, total: 45 } },
      isLoading: false,
    });

    mockSearchParamsValue = '999'; // deep link far past the last page

    renderWithClient(<TransactionsPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard/transactions?page=3');
    });
  });

  it('does not redirect when the requested page is already valid', async () => {
    (useTransactions as jest.Mock).mockReturnValue({
      data: { transactions: [], pagination: { limit: 20, offset: 20, total: 45 } },
      isLoading: false,
    });

    mockSearchParamsValue = '2'; // valid: page 2 of 3

    renderWithClient(<TransactionsPage />);

    // Give effects a chance to run, then assert no correction happened
    await waitFor(() => expect(useTransactions).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
