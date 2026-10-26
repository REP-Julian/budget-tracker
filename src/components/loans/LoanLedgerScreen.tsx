import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { LoanCard } from './LoanCard';
import { AddLoanModal } from './AddLoanModal';
import { RepaymentModal } from './RepaymentModal';
import { Loan, Wallet } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';
import '../../styles/loans.css';

interface LoanLedgerScreenProps {
  loans: Loan[];
  wallets: Wallet[];
  currencySymbol?: string;
  onLendMoney: (data: {
    sourceWalletId: string;
    borrowerName: string;
    amount: number;
    borrowerContact?: string;
    dueDate?: string;
    notes?: string;
  }) => void;
  onRepayLoan: (loan: Loan, amount: number, destinationWalletId: string, notes?: string) => void;
  onDeleteLoan?: (loan: Loan) => void;
}

export const LoanLedgerScreen: React.FC<LoanLedgerScreenProps> = ({
  loans,
  wallets,
  currencySymbol = '$',
  onLendMoney,
  onRepayLoan,
  onDeleteLoan,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [repayingLoan, setRepayingLoan] = useState<Loan | null>(null);

  const totalLent = FinanceEngine.calculateTotalMoneyLent(loans);
  const activeCount = loans.filter((l) => l.status !== 'settled').length;

  return (
    <div className="loans-container">
      {/* Top Total Lent Out Banner */}
      <div className="loans-hero-banner">
        <div>
          <div className="loans-hero-title">Total Money Lent Out</div>
          <div className="loans-hero-sub">Excluded from Expenses • Asset</div>
        </div>
        <div>
          <div className="loans-hero-val">{currencySymbol}{totalLent.toFixed(2)}</div>
          <div className="loans-hero-note">{activeCount} Active Borrowers</div>
        </div>
      </div>

      {/* Accounting Notice */}
      <div className="accounting-notice-box">
        <strong>✓ Safe Accounting:</strong> Lending money decreases wallet cash and creates a <em>Receivables Asset</em>. It does <strong>not</strong> count as an expense or reduce your monthly budget. Repayments return directly to wallet without inflating income.
      </div>

      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700 }}>Borrower Accounts</div>
        <button
          className="pill-badge"
          style={{
            background: 'var(--card-surface)',
            border: '1px solid var(--card-border)',
            color: '#38BDF8',
            cursor: 'pointer',
            padding: '6px 12px',
          }}
          onClick={() => setIsAddOpen(true)}
        >
          <Plus size={13} /> New Loan
        </button>
      </div>

      {/* Loans List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            currencySymbol={currencySymbol}
            onRepay={(l) => setRepayingLoan(l)}
            onDelete={onDeleteLoan}
          />
        ))}
        {loans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '12px' }}>
            No active money lent records.
          </div>
        )}
      </div>

      {/* Modals */}
      <AddLoanModal
        wallets={wallets}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={onLendMoney}
      />

      {repayingLoan && (
        <RepaymentModal
          loan={repayingLoan}
          wallets={wallets}
          isOpen={!!repayingLoan}
          onClose={() => setRepayingLoan(null)}
          onSubmit={(amount, destinationWalletId, notes) => {
            onRepayLoan(repayingLoan, amount, destinationWalletId, notes);
            setRepayingLoan(null);
          }}
        />
      )}
    </div>
  );
};
