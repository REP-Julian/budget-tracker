import React from 'react';
import { HeroBalanceCard } from './HeroBalanceCard';
import { WalletCarousel } from './WalletCarousel';
import { DailyNecessityWidget } from './DailyNecessityWidget';
import { QuickActions } from './QuickActions';
import { TransactionFeed } from './TransactionFeed';
import { Wallet, Transaction, UserProfile } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';
import '../../styles/dashboard.css';

interface DashboardScreenProps {
  wallets: Wallet[];
  transactions: Transaction[];
  profile: UserProfile;
  currencySymbol?: string;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onLendMoney: () => void;
  onDeleteTransaction?: (id: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  wallets,
  transactions,
  profile,
  currencySymbol = '₱',
  onAddExpense,
  onAddIncome,
  onLendMoney,
  onDeleteTransaction,
}) => {
  const sortedWallets = FinanceEngine.sortWallets(wallets);
  const totalBalance = FinanceEngine.calculateTotalLiquidBalance(sortedWallets);
  const { income, expense } = FinanceEngine.calculateMonthlyIncomeAndExpense(transactions);
  const dailyNecessity = FinanceEngine.calculateDailyNecessitySpend(
    transactions,
    new Date().toISOString().slice(0, 10),
    profile.dailyNecessityCap,
    profile.activeScheduleDays || [1, 2, 4, 5, 6],
    profile.restDayNecessityCap !== undefined ? profile.restDayNecessityCap : 150
  );
  const savings = FinanceEngine.calculateSavingsHistory(transactions, profile, 30);

  return (
    <div className="dashboard-container">
      <HeroBalanceCard
        totalBalance={totalBalance}
        totalIncome={income}
        totalExpenses={expense}
        currencySymbol={currencySymbol}
      />

      <WalletCarousel wallets={sortedWallets} currencySymbol={currencySymbol} />

      <DailyNecessityWidget
        spentToday={dailyNecessity.spentToday}
        dailyCap={dailyNecessity.dailyCap}
        remaining={dailyNecessity.remaining}
        percentage={dailyNecessity.percentage}
        isOverBudget={dailyNecessity.isOverBudget}
        isWorkDay={dailyNecessity.isWorkDay}
        currencySymbol={currencySymbol}
        savings={savings}
      />

      <QuickActions
        onAddExpense={onAddExpense}
        onAddIncome={onAddIncome}
        onLendMoney={onLendMoney}
      />

      <TransactionFeed
        transactions={transactions.slice(0, 6)}
        wallets={sortedWallets}
        currencySymbol={currencySymbol}
        onDeleteTransaction={onDeleteTransaction}
      />
    </div>
  );
};
