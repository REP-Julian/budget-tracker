import React, { useState } from 'react';
import { X, Handshake } from 'lucide-react';
import { Wallet } from '../../types';

interface AddLoanModalProps {
  wallets: Wallet[];
  isOpen: boolean;
  onClose: () => void;
  currencySymbol?: string;
  onSubmit: (data: {
    sourceWalletId: string;
    borrowerName: string;
    amount: number;
    borrowerContact?: string;
    dueDate?: string;
    notes?: string;
  }) => void;
}

export const AddLoanModal: React.FC<AddLoanModalProps> = ({
  wallets,
  isOpen,
  onClose,
  currencySymbol = '$',
  onSubmit,
}) => {
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [amount, setAmount] = useState('');
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!borrowerName.trim()) {
      setError('Borrower name required');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setError('Enter valid amount to lend');
      return;
    }
    const wallet = wallets.find((w) => w.id === sourceWalletId);
    if (wallet && wallet.balance < val) {
      setError(`Insufficient balance in ${wallet.name} (${currencySymbol}${wallet.balance.toFixed(2)})`);
      return;
    }

    onSubmit({
      sourceWalletId,
      borrowerName,
      amount: val,
      borrowerContact: borrowerContact || undefined,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Lend Money</div>
          <button className="icon-circle-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '12px', padding: '10px 12px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          💡 Money lent reduces your wallet and creates a receivable asset. It is <strong>never counted as an expense</strong>.
        </div>

        {error && (
          <div style={{ color: 'var(--accent-pink)', fontSize: '11px', marginBottom: '10px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Borrower Full Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Marcus Vance"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Borrower Phone / Contact (Optional)</label>
            <input
              type="tel"
              className="input-field"
              placeholder="+62 812-xxxx-xxxx"
              value={borrowerContact}
              onChange={(e) => setBorrowerContact(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Amount to Lend ({currencySymbol})</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Take Funds From Wallet</label>
            <select
              className="input-field"
              value={sourceWalletId}
              onChange={(e) => setSourceWalletId(e.target.value)}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (${w.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Expected Due Date (Optional)</label>
            <input
              type="date"
              className="input-field"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Purpose / Notes (Optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Car repair emergency"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '14px' }}>
            <Handshake size={16} /> Confirm Loan
          </button>
        </form>
      </div>
    </div>
  );
};
