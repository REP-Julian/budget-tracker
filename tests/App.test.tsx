import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../src/App';
import { ThemeProvider } from '../src/context/ThemeContext';

// Mock recharts responsive container for jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('Budget Tracker App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Dashboard with Total Balance and user manual wallets', async () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('Total Income')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Cash & Pocket')).toBeInTheDocument();
    expect(screen.getByText('Savings Safe')).toBeInTheDocument();
  });

  it('verifies that NO settings icon exists on navigation dock', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    // Dock buttons: Home, Lent, AI (middle), Stats, Assets
    expect(screen.getByTitle('Home Dashboard')).toBeInTheDocument();
    expect(screen.getByTitle('Money Lent Ledger')).toBeInTheDocument();
    expect(screen.getByTitle('AI Financial Assistant')).toBeInTheDocument();
    expect(screen.getByTitle('Statistics & Trends')).toBeInTheDocument();
    expect(screen.getByTitle('Assets & Net Worth')).toBeInTheDocument();

    // Verify Settings button is NOT in the dock
    expect(screen.queryByTitle('Settings')).not.toBeInTheDocument();
  });

  it('navigates to AI Assistant from center dock button and displays financial advisor', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    const aiTab = screen.getByTitle('AI Financial Assistant');
    fireEvent.click(aiTab);

    expect(screen.getByText('Nova Financial AI')).toBeInTheDocument();
    expect(screen.getByText(/Who owes me money/i)).toBeInTheDocument();
    expect(screen.getByText(/Can I afford dinner tonight/i)).toBeInTheDocument();
  });

  it('opens dedicated Profile & Settings when clicking top header profile chip', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    const profileTrigger = screen.getByTitle('Open Profile & Settings');
    fireEvent.click(profileTrigger);

    // Profile Screen should be displayed
    expect(screen.getByText('Profile & Settings')).toBeInTheDocument();
    expect(screen.getAllByText('Primary Earner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('System Theme')).toBeInTheDocument();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
  });

  it('navigates to Money Lent Ledger and verifies separate accounting banner', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    const loansTab = screen.getByTitle('Money Lent Ledger');
    fireEvent.click(loansTab);

    expect(screen.getByText('Total Money Lent Out')).toBeInTheDocument();
    expect(screen.getByText(/Excluded from Expenses/i)).toBeInTheDocument();
    expect(screen.getByText('No active money lent records.')).toBeInTheDocument();
  });

  it('navigates to Assets & Net Worth screen', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    const assetsTab = screen.getByTitle('Assets & Net Worth');
    fireEvent.click(assetsTab);

    expect(screen.getByText('Total Net Worth')).toBeInTheDocument();
    expect(screen.getByText('Liquid Cash & Wallets')).toBeInTheDocument();
    expect(screen.getByText('Money Lent (Receivables)')).toBeInTheDocument();
  });

  it('allows adding and removing a transaction and updates UI', async () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    // Click Expense quick action
    const expenseBtn = screen.getByRole('button', { name: 'Expense' });
    fireEvent.click(expenseBtn);

    // Modal opens, fill amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '150' } });

    // Submit transaction
    const addTxBtn = screen.getByRole('button', { name: /Record Transaction/i });
    fireEvent.click(addTxBtn);

    // Verify transaction appears in feed
    expect(screen.getByText('Shop')).toBeInTheDocument();

    // Click delete icon button
    const deleteBtn = screen.getByRole('button', { name: /Delete Shop/i });
    fireEvent.click(deleteBtn);

    // Confirm button appears
    const confirmBtn = screen.getByRole('button', { name: /Confirm delete transaction/i });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    // Transaction removed
    expect(screen.queryByText('Shop')).not.toBeInTheDocument();
  });
});
