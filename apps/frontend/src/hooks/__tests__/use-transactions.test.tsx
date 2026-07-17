import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useCreateTransaction } from '../use-transactions';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCreateTransaction optimistic update (FE-TC-10, FE-EC-07)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    jest.clearAllMocks();
  });

  const input = {
    accountId: 'acc-1',
    categoryId: 'cat-1',
    type: 'expense' as const,
    amountCents: 1000,
    date: '2026-07-17',
    idempotencyKey: 'test-key-1',
  };

  it('inserts an optimistic row immediately, then replaces it with the real one on success', async () => {
    queryClient.setQueryData(['transactions', { limit: 20, offset: 0 }], {
      transactions: [],
      pagination: { limit: 20, offset: 0, total: 0 },
    });

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { id: 'real-id-1', ...input, notes: null, payment_method: null, recurring: false, recurrence_rule: null },
    });

    const { result } = renderHook(() => useCreateTransaction(), { wrapper: createWrapper(queryClient) });

    act(() => {
      result.current.mutate(input);
    });

    // Optimistic row appears synchronously via onMutate, before the network call resolves
    await waitFor(() => {
      const cached: any = queryClient.getQueryData(['transactions', { limit: 20, offset: 0 }]);
      expect(cached.transactions.length).toBe(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back the optimistic row cleanly on network failure (FE-EC-07)', async () => {
    queryClient.setQueryData(['transactions', { limit: 20, offset: 0 }], {
      transactions: [],
      pagination: { limit: 20, offset: 0, total: 0 },
    });

    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    const { result } = renderHook(() => useCreateTransaction(), { wrapper: createWrapper(queryClient) });

    act(() => {
      result.current.mutate(input);
    });

    // Optimistic row appears first
    await waitFor(() => {
      const cached: any = queryClient.getQueryData(['transactions', { limit: 20, offset: 0 }]);
      expect(cached.transactions.length).toBe(1);
    });

    // Then rolls back to the pre-mutation state once the request fails -
    // no stuck/ghost row left behind.
    await waitFor(() => expect(result.current.isError).toBe(true));

    const finalCache: any = queryClient.getQueryData(['transactions', { limit: 20, offset: 0 }]);
    expect(finalCache.transactions.length).toBe(0);
  });
});
