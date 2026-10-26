import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Loan, Wallet } from '../../types';

interface RepaymentModalProps {
  loan: Loan;
  wallets: Wallet[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, destinationWalletId: string, notes?: string) => void;
  currencySymbol?: string;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({
  loan,
  wallets,
  isOpen,
  onClose,
  onSubmit,
  currencySymbol = '$',
}) => {
  const [amount, setAmount] = useState<string>(loan.remainingAmount.toString());
  const [destinationWalletId, setDestinationWalletId] = useState<string>(
    wallets[0]?.id || ''
  );
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (val > loan.remainingAmount) {
      setError(`Repayment cannot exceed remaining ${currencySymbol}${loan.remainingAmount}`);
      return;
    }
    onSubmit(val, destinationWalletId, notes);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Log Repayment</div>
          <button className="icon-circle-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Borrower: <strong>{loan.borrowerName}</strong> • Remaining:{' '}
          <span style={{ color: '#38BDF8', fontWeight: 700 }}>
            {currencySymbol}{loan.remainingAmount.toFixed(2)}
          </span>
        </div>

        {error && (
          <div style={{ color: 'var(--accent-pink)', fontSize: '11px', marginBottom: '10px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Repayment Amount ({currencySymbol})</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Deposit Back Into Wallet</label>
            <select
              className="input-field"
              value={destinationWalletId}
              onChange={(e) => setDestinationWalletId(e.target.value)}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (${w.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Repayment Note (Optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Bank transfer, cash in hand"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '14px' }}>
            <Check size={16} /> Record Repayment
          </button>
        </form>
      </div>
    </div>
  );
};
