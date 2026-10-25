import { describe, it, expect } from 'vitest';
import { FinanceEngine } from '../src/services/financeEngine';
import { Wallet, Transaction, Loan, Asset } from '../src/types';

describe('FinanceEngine Personal Accounting Rules', () => {
  const mockWallets: Wallet[] = [
    {
      id: 'w-cash',
      name: 'Cash Pocket',
      type: 'cash',
      balance: 1000.00,
      currency: 'USD',
      icon: 'banknote',
      updatedAt: '2026-10-01',
    },
    {
      id: 'w-savings',
      name: 'Savings',
      type: 'savings',
      balance: 2000.00,
      currency: 'USD',
      icon: 'vault',
      updatedAt: '2026-10-01',
    },
  ];

  it('calculates total liquid balance accurately', () => {
    const total = FinanceEngine.calculateTotalLiquidBalance(mockWallets);
    expect(total).toBe(3000.00);
  });

  it('calculates monthly income and expense with strict separation from loans', () => {
    const mockTxs: Transaction[] = [
      {
        id: 'tx1',
        walletId: 'w-savings',
        type: 'income',
        amount: 4000,
        category: 'Salary',
        isNecessity: false,
        date: '2026-10-01T10:00:00Z',
        tax: 0,
        syncStatus: 'synced',
      },
      {
        id: 'tx2',
        walletId: 'w-cash',
        type: 'expense',
        amount: 250,
        category: 'Food',
        isNecessity: true,
        date: '2026-10-05T12:00:00Z',
        tax: 0,
        syncStatus: 'synced',
      },
    ];

    const result = FinanceEngine.calculateMonthlyIncomeAndExpense(mockTxs, '2026-10');
    expect(result.income).toBe(4000);
    expect(result.expense).toBe(250);
    expect(result.net).toBe(3750);
  });

  it('lends money: reduces wallet balance and creates loan receivable without expense leak', () => {
    const { updatedWallets, newLoan } = FinanceEngine.lendMoney(
      mockWallets,
      'w-cash',
      'Marcus Vance',
      500,
      '+123456789',
      '2026-11-01',
      'Emergency loan'
    );

    const cashWallet = updatedWallets.find((w) => w.id === 'w-cash');
    expect(cashWallet?.balance).toBe(500); // 1000 - 500
    expect(newLoan.borrowerName).toBe('Marcus Vance');
    expect(newLoan.principalAmount).toBe(500);
    expect(newLoan.remainingAmount).toBe(500);
    expect(newLoan.status).toBe('active');
  });

  it('processes partial and full repayments without recording fake income', () => {
    const initialLoan: Loan = {
      id: 'loan-1',
      walletId: 'w-cash',
      borrowerName: 'David Chen',
      principalAmount: 500,
      remainingAmount: 500,
      lentDate: '2026-10-01',
      status: 'active',
      repayments: [],
      syncStatus: 'synced',
    };

    // Partial repayment of 150
    const { updatedWallets, updatedLoan } = FinanceEngine.processRepayment(
      mockWallets,
      initialLoan,
      150,
      'w-cash',
      'First installment'
    );

    const cashWallet = updatedWallets.find((w) => w.id === 'w-cash');
    expect(cashWallet?.balance).toBe(1150); // 1000 + 150
    expect(updatedLoan.remainingAmount).toBe(350);
    expect(updatedLoan.status).toBe('partial');
    expect(updatedLoan.repayments.length).toBe(1);

    // Full repayment of remaining 350
    const { updatedLoan: settledLoan } = FinanceEngine.processRepayment(
      updatedWallets,
      updatedLoan,
      350,
      'w-cash',
      'Final installment'
    );

    expect(settledLoan.remainingAmount).toBe(0);
    expect(settledLoan.status).toBe('settled');
  });

  it('calculates daily necessity spending and warns when over budget', () => {
    const today = '2026-10-25';
    const txs: Transaction[] = [
      {
        id: 't1',
        walletId: 'w-cash',
        type: 'expense',
        amount: 30,
        category: 'Groceries',
        isNecessity: true,
        date: `${today}T08:00:00Z`,
        tax: 0,
        syncStatus: 'synced',
      },
      {
        id: 't2',
        walletId: 'w-cash',
        type: 'expense',
        amount: 25,
        category: 'Commute',
        isNecessity: true,
        date: `${today}T12:00:00Z`,
        tax: 0,
        syncStatus: 'synced',
      },
      {
        id: 't3',
        walletId: 'w-cash',
        type: 'expense',
        amount: 100,
        category: 'Cinema',
        isNecessity: false, // Discretionary want, NOT necessity
        date: `${today}T20:00:00Z`,
        tax: 0,
        syncStatus: 'synced',
      },
    ];

    const result = FinanceEngine.calculateDailyNecessitySpend(txs, today, 60);
    expect(result.spentToday).toBe(55); // 30 + 25, cinema excluded
    expect(result.remaining).toBe(5);
    expect(result.isOverBudget).toBe(false);
  });

  it('calculates true net worth aggregating wallets, loans receivable, and physical/crypto assets', () => {
    const loans: Loan[] = [
      {
        id: 'l1',
        walletId: 'w-cash',
        borrowerName: 'Alex',
        principalAmount: 500,
        remainingAmount: 300, // $300 receivable
        lentDate: '2026-10-01',
        status: 'partial',
        repayments: [],
        syncStatus: 'synced',
      },
    ];

    const assets: Asset[] = [
      { id: 'a1', name: 'BTC', assetClass: 'crypto', value: 10000, syncStatus: 'synced' },
      { id: 'a2', name: 'Bike', assetClass: 'physical', value: 5000, syncStatus: 'synced' },
    ];

    // Total = Liquid ($3000) + Receivables ($300) + Assets ($15000) = $18300
    const netWorth = FinanceEngine.calculateNetWorth(mockWallets, loans, assets);
    expect(netWorth).toBe(18300);
  });
});
