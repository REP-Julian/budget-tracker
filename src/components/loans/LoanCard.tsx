import React from 'react';
import { User, CheckCircle2, DollarSign } from 'lucide-react';
import { Loan } from '../../types';

interface LoanCardProps {
  loan: Loan;
  onRepay: (loan: Loan) => void;
  currencySymbol?: string;
}

export const LoanCard: React.FC<LoanCardProps> = ({ loan, onRepay, currencySymbol = '$' }) => {
  const getStatusBadge = (status: Loan['status']) => {
    switch (status) {
      case 'settled':
        return <span className="loan-status-tag status-settled">Settled</span>;
      case 'partial':
        return <span className="loan-status-tag status-partial">Partially Paid</span>;
      default:
        return <span className="loan-status-tag status-active">Pending Due</span>;
    }
  };

  const isSettled = loan.remainingAmount === 0;

  return (
    <div className="loan-card-item" style={{ opacity: isSettled ? 0.6 : 1 }}>
      <div className="loan-card-header">
        <div className="borrower-info">
          <div className="borrower-avatar-icon">
            <User size={15} />
          </div>
          <div>
            <div>{loan.borrowerName}</div>
            {loan.borrowerContact && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {loan.borrowerContact}
              </div>
            )}
          </div>
        </div>
        {getStatusBadge(loan.status)}
      </div>

      <div className="loan-financial-row">
        <span style={{ color: 'var(--text-secondary)' }}>
          Principal: <strong>{currencySymbol}{loan.principalAmount.toFixed(2)}</strong>
        </span>
        <span style={{ color: isSettled ? 'var(--accent-green)' : '#38BDF8', fontWeight: 700 }}>
          Remaining: {currencySymbol}{loan.remainingAmount.toFixed(2)}
        </span>
      </div>

      <div className="loan-dates-meta">
        <div>
          Lent: {new Date(loan.lentDate).toLocaleDateString()}
          {loan.dueDate && ` • Due: ${new Date(loan.dueDate).toLocaleDateString()}`}
        </div>
        {loan.notes && <div>Note: {loan.notes}</div>}
        {loan.repayments.length > 0 && (
          <div style={{ color: 'var(--accent-green)' }}>
            ✓ {loan.repayments.length} repayment logged
          </div>
        )}
      </div>

      {!isSettled && (
        <div className="loan-card-actions">
          <button className="loan-btn repay" onClick={() => onRepay(loan)}>
            <DollarSign size={14} /> Log Repayment
          </button>
        </div>
      )}

      {isSettled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '11px', fontWeight: 600 }}>
          <CheckCircle2 size={14} /> Completely paid off
        </div>
      )}
    </div>
  );
};
