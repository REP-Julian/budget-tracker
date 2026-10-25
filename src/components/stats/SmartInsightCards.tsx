import React from 'react';
import { TrendingUp, ShieldCheck } from 'lucide-react';
import { Transaction, Loan } from '../../types';

interface SmartInsightCardsProps {
  transactions: Transaction[];
  loans: Loan[];
}

export const SmartInsightCards: React.FC<SmartInsightCardsProps> = ({ transactions, loans }) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthExpenses = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((acc, t) => acc + t.amount, 0);

  const activeLoans = loans.filter((l) => l.status !== 'settled');

  return (
    <div className="insights-row">
      <div className="insight-card-item">
        <div style={{ color: 'var(--accent-green)', marginBottom: '6px' }}>
          <TrendingUp size={16} />
        </div>
        <div>
          {thisMonthExpenses > 0 ? (
            <>Current month spending is <strong>${thisMonthExpenses.toFixed(2)}</strong>.</>
          ) : (
            <>No expenses recorded yet for <strong>{new Date().toLocaleDateString('en-US', { month: 'long' })}</strong>.</>
          )}
        </div>
      </div>

      <div className="insight-card-item">
        <div style={{ color: 'var(--neon-yellow)', marginBottom: '6px' }}>
          <ShieldCheck size={16} />
        </div>
        <div>
          {activeLoans.length > 0 ? (
            <>Tracking <strong>{activeLoans.length} active loans</strong> securely as assets.</>
          ) : (
            <>All loans are <strong>settled</strong> with zero outstanding receivables.</>
          )}
        </div>
      </div>
    </div>
  );
};
