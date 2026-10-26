import React, { useState } from 'react';
import { ShoppingBag, Car, Home, BookOpen, Coffee, CircleDot, ReceiptText, Trash2 } from 'lucide-react';
import { Transaction, Wallet } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';

interface TransactionFeedProps {
  transactions: Transaction[];
  wallets: Wallet[];
  currencySymbol?: string;
  onDeleteTransaction?: (id: string) => void;
}

export const TransactionFeed: React.FC<TransactionFeedProps> = ({
  transactions,
  wallets,
  currencySymbol = '$',
  onDeleteTransaction,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'shop':
        return <ShoppingBag size={18} color="#A855F7" />;
      case 'transport':
        return <Car size={18} color="#38BDF8" />;
      case 'rent':
        return <Home size={18} color="#00E5FF" />;
      case 'education':
        return <BookOpen size={18} color="#E8F953" />;
      case 'food':
        return <Coffee size={18} color="#FB923C" />;
      default:
        return <CircleDot size={18} color="#94A3B8" />;
    }
  };

  const getWalletName = (walletId: string) => {
    const w = wallets.find((w) => w.id === walletId);
    return w ? w.name : 'Wallet';
  };

  const totalSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="transactions-header">
        <div className="transactions-title">Transactions</div>
        <div className="transactions-total">
          {currencySymbol}
          {totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <div className="transactions-list">
        {transactions.map((tx) => (
          <div key={tx.id} className="transaction-card">
            <div className="transaction-left">
              <div
                className="transaction-icon-box"
                style={{
                  background:
                    tx.category.toLowerCase() === 'shop'
                      ? 'rgba(168, 85, 247, 0.12)'
                      : tx.category.toLowerCase() === 'transport'
                      ? 'rgba(56, 189, 248, 0.12)'
                      : tx.category.toLowerCase() === 'rent'
                      ? 'rgba(0, 229, 255, 0.12)'
                      : 'rgba(232, 249, 83, 0.12)',
                }}
              >
                {getCategoryIcon(tx.category)}
              </div>
              <div>
                <div className="transaction-name">{tx.notes || tx.category}</div>
                <div className="transaction-sub">
                  {tx.notes ? `${tx.category} • ` : ''}{tx.isNecessity ? 'Necessity • ' : 'Discretionary • '}
                  {getWalletName(tx.walletId)} • {FinanceEngine.formatTransactionDateTime(tx.date)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="transaction-right">
                <div
                  className={`transaction-amount ${
                    tx.type === 'expense' ? 'expense' : 'income'
                  }`}
                >
                  {tx.type === 'expense' ? '-' : '+'}
                  {currencySymbol}
                  {tx.amount.toFixed(2)}
                </div>
                {tx.tax > 0 && <div className="transaction-tax">Tax: {currencySymbol}{tx.tax.toFixed(2)}</div>}
              </div>

              {onDeleteTransaction && (
                deletingId === tx.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      aria-label="Confirm delete transaction"
                      onClick={() => {
                        onDeleteTransaction(tx.id);
                        setDeletingId(null);
                      }}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel delete transaction"
                      onClick={() => setDeletingId(null)}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete ${tx.notes || tx.category}`}
                    onClick={() => setDeletingId(tx.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      padding: '6px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={15} />
                  </button>
                )
              )}
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '28px 16px',
              background: 'var(--card-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ReceiptText size={24} style={{ opacity: 0.5, marginBottom: '2px' }} />
            <div>No transactions recorded yet.</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Use the Quick Action buttons above to add an expense or income.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
