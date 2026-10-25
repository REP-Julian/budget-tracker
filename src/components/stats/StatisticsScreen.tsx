import React, { useState } from 'react';
import { CategoryDonutChart } from './CategoryDonutChart';
import { CategoryGrid } from './CategoryGrid';
import { MonthlySpendingChart } from './MonthlySpendingChart';
import { SmartInsightCards } from './SmartInsightCards';
import { Transaction, Loan } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';
import '../../styles/stats.css';

interface StatisticsScreenProps {
  transactions: Transaction[];
  loans: Loan[];
  currencySymbol?: string;
}

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({
  transactions,
  loans,
  currencySymbol = '$',
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'monthly'>('categories');
  const [timeframe, setTimeframe] = useState<string>('6M');

  const categories = FinanceEngine.calculateCategoryBreakdown(transactions);
  const totalExpense = categories.reduce((acc, c) => acc + c.amount, 0);
  const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="stats-container">
      {/* Tab Switcher */}
      <div className="stats-tab-bar">
        <button
          className={`stats-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`stats-tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          Monthly Spending
        </button>
      </div>

      {activeTab === 'categories' ? (
        <>
          <CategoryDonutChart
            totalAmount={totalExpense}
            monthLabel={currentMonthLabel}
            categories={categories}
            currencySymbol={currencySymbol}
          />
          <CategoryGrid categories={categories} currencySymbol={currencySymbol} />
        </>
      ) : (
        <>
          <MonthlySpendingChart
            transactions={transactions}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            currencySymbol={currencySymbol}
          />
          <SmartInsightCards transactions={transactions} loans={loans} />
        </>
      )}
    </div>
  );
};
