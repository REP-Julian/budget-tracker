import React from 'react';
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown } from 'lucide-react';

interface HeroBalanceCardProps {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  currencySymbol?: string;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({
  totalBalance,
  totalIncome,
  totalExpenses,
  currencySymbol = '$',
}) => {
  const netAmount = totalIncome - totalExpenses;
  const isPositive = netAmount >= 0;

  return (
    <div className="hero-balance-card">
      <div className="hero-balance-label">Total Balance</div>
      <div className="hero-balance-amount">
        {currencySymbol}
        {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      <div className="hero-net-pill">
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>
          {isPositive ? '+' : '-'}
          {currencySymbol}
          {Math.abs(netAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="hero-stats-row">
        <div className="hero-stat-item">
          <div className="hero-stat-circle">
            <ArrowDown size={16} strokeWidth={2.5} />
          </div>
          <div className="hero-stat-meta">
            <div className="val">
              +{currencySymbol}
              {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="sub">Total Income</div>
          </div>
        </div>

        <div className="hero-stat-item">
          <div className="hero-stat-circle">
            <ArrowUp size={16} strokeWidth={2.5} />
          </div>
          <div className="hero-stat-meta">
            <div className="val">
              -{currencySymbol}
              {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="sub">Total Expenses</div>
          </div>
        </div>
      </div>
    </div>
  );
};
