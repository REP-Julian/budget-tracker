import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Wallet, TransactionType } from '../../types';

interface QuickAddModalProps {
  isOpen: boolean;
  initialType?: TransactionType;
  wallets: Wallet[];
  onClose: () => void;
  currencySymbol?: string;
  onSubmit: (data: {
    walletId: string;
    type: TransactionType;
    amount: number;
    category: string;
    isNecessity: boolean;
    notes?: string;
  }) => void;
}

const CATEGORIES = [
  'Shop',
  'Transport',
  'Rent',
  'Education',
  'Food',
  'Health',
  'Bills',
  'Salary',
  'Other',
];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  initialType = 'expense',
  wallets,
  onClose,
  currencySymbol = '$',
  onSubmit,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(initialType === 'income' ? 'Salary' : 'Shop');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [isNecessity, setIsNecessity] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Sync state whenever modal is opened with initialType
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setCategory(initialType === 'income' ? 'Salary' : 'Shop');
      setAmount('');
      setNotes('');
      setError('');
      if (wallets.length > 0 && !walletId) {
        setWalletId(wallets[0].id);
      }
    }
  }, [isOpen, initialType, wallets]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    onSubmit({
      walletId,
      type,
      amount: val,
      category,
      isNecessity: type === 'expense' ? isNecessity : false,
      notes: notes || undefined,
    });
    onClose();
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {type === 'expense' ? 'Add Expense' : 'Add Income'}
          </div>
          <button className="icon-circle-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Type Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--card-elevated)',
            borderRadius: '999px',
            padding: '3px',
            gap: '3px',
            marginBottom: '14px',
          }}
        >
          <button
            type="button"
            className="theme-switch-btn"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: type === 'expense' ? 'var(--card-surface)' : 'transparent',
              color: type === 'expense' ? 'var(--accent-pink)' : 'var(--text-muted)',
              boxShadow: type === 'expense' ? 'var(--shadow-card)' : 'none',
              border: type === 'expense' ? '1px solid var(--card-border)' : '1px solid transparent',
            }}
            onClick={() => {
              setType('expense');
              setCategory('Shop');
            }}
          >
            - Expense
          </button>
          <button
            type="button"
            className="theme-switch-btn"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: type === 'income' ? 'var(--card-surface)' : 'transparent',
              color: type === 'income' ? 'var(--accent-green)' : 'var(--text-muted)',
              boxShadow: type === 'income' ? 'var(--shadow-card)' : 'none',
              border: type === 'income' ? '1px solid var(--card-border)' : '1px solid transparent',
            }}
            onClick={() => {
              setType('income');
              setCategory('Salary');
            }}
          >
            + Income
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--accent-pink)', fontSize: '11px', marginBottom: '10px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Amount ({currencySymbol})</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Category</label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Wallet Account</label>
            <select
              className="input-field"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({currencySymbol}{w.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {type === 'expense' && (
            <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isNecessity"
                checked={isNecessity}
                onChange={(e) => setIsNecessity(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--neon-yellow)' }}
              />
              <label htmlFor="isNecessity" style={{ fontSize: '12px', cursor: 'pointer' }}>
                Mark as <strong>Daily Necessity</strong> (Need vs Want)
              </label>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Description / Note (Optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Grocery at Whole Foods"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '14px' }}>
            <Check size={16} /> Record Transaction
          </button>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
