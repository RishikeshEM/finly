import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { BudgetFormModal } from '../budget-form-modal';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    patch: jest.fn(),
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-transactions', () => ({
  useCategories: () => ({ data: [] }),
}));

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('BudgetFormModal concurrent-edit conflict (FE-TC-19, FE-EC-06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { preferred_currency: 'USD' } });
  });

  const existingBudget = {
    id: 'budget-1',
    user_id: 'user-1',
    category_id: 'cat-1',
    period_type: 'monthly' as const,
    limit_cents: 50000,
    start_date: '2026-07-01',
    version: 2,
    updated_at: '2026-07-01T00:00:00Z',
  };

  it('shows a distinct conflict message on 409, does not silently overwrite', async () => {
    (apiClient.patch as jest.Mock).mockRejectedValueOnce({
      response: { status: 409, data: { error: 'Budget was modified by another request.' } },
    });

    renderWithClient(<BudgetFormModal budget={existingBudget} onClose={jest.fn()} />);

    const limitInput = screen.getByLabelText(/limit/i);
    fireEvent.change(limitInput, { target: { value: '600' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/updated elsewhere/i)).toBeInTheDocument();
    });

    // Sent the version it started with (optimistic concurrency, BE-EC-02) -
    // it did not silently retry with a different/incremented version.
    expect(apiClient.patch).toHaveBeenCalledWith('/budgets/budget-1', { limitCents: 60000, version: 2 });
  });

  it('shows a generic error (not the conflict message) for a non-409 failure', async () => {
    (apiClient.patch as jest.Mock).mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Internal error' } },
    });

    renderWithClient(<BudgetFormModal budget={existingBudget} onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/limit/i), { target: { value: '600' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Internal error')).toBeInTheDocument();
    });
    expect(screen.queryByText(/updated elsewhere/i)).not.toBeInTheDocument();
  });
});
