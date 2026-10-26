import { createPortal } from 'react-dom';
import React, { useState } from 'react';
import { Search, X, ArrowUpRight, ArrowDownLeft, HandCoins, Calendar, Trash2 } from 'lucide-react';
import { Transaction, Loan } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  loans: Loan[];
  currencySymbol?: string;
  onDeleteTransaction?: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  transactions,
  loans,
  currencySymbol = '$',
  onDeleteTransaction,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'transactions' | 'loans'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const filteredTransactions = transactions.filter((t) => {
    if (!cleanQuery) return true;
    return (
      t.category.toLowerCase().includes(cleanQuery) ||
      (t.notes && t.notes.toLowerCase().includes(cleanQuery)) ||
      t.amount.toString().includes(cleanQuery)
    );
  });

  const filteredLoans = loans.filter((l) => {
    if (!cleanQuery) return true;
    return (
      l.borrowerName.toLowerCase().includes(cleanQuery) ||
      (l.notes && l.notes.toLowerCase().includes(cleanQuery)) ||
      l.remainingAmount.toString().includes(cleanQuery)
    );
  });

  const modalContent = (
    <div className="auth-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="auth-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Search Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div className="auth-input-wrapper" style={{ flex: 1, padding: '10px 14px' }}>
            <Search size={18} style={{ color: 'var(--role-accent-color, var(--neon-yellow))' }} />
            <input
              type="text"
              autoFocus
              placeholder="Search expenses, lent money, borrower, notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ fontSize: '14px' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="icon-circle-btn"
            onClick={onClose}
            style={{ width: '38px', height: '38px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {(['all', 'transactions', 'loans'] as const).map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setFilterType(ft)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--card-border)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: filterType === ft ? 'var(--btn-primary-bg, var(--neon-yellow))' : 'var(--card-surface)',
                color: filterType === ft ? 'var(--btn-primary-text, var(--neon-yellow-text))' : 'var(--text-muted)',
              }}
            >
              {ft === 'all' ? 'All Results' : ft === 'transactions' ? `Expenses (${filteredTransactions.length})` : `Lent Money (${filteredLoans.length})`}
            </button>
          ))}
        </div>

        {/* Search Results List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(filterType === 'all' || filterType === 'transactions') && (
            <div>
              {filteredTransactions.length > 0 && (
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Transactions
                </div>
              )}
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--card-surface)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '14px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        background: tx.type === 'income' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: tx.type === 'income' ? 'var(--accent-green)' : 'var(--accent-pink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{tx.category}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {FinanceEngine.formatTransactionDateTime(tx.date)} {tx.notes ? `• ${tx.notes}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: tx.type === 'income' ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                      {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                    </div>
                    {onDeleteTransaction && (
                      deletingId === tx.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTransaction(tx.id);
                              setDeletingId(null);
                            }}
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              padding: '3px 6px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            Del
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            style={{
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--card-border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '3px 5px',
                              fontSize: '10px',
                              cursor: 'pointer',
                            }}
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Delete transaction ${tx.notes || tx.category}`}
                          onClick={() => setDeletingId(tx.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            padding: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(filterType === 'all' || filterType === 'loans') && (
            <div>
              {filteredLoans.length > 0 && (
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Money Lent (Receivables)
                </div>
              )}
              {filteredLoans.map((loan) => (
                <div
                  key={loan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--card-surface)',
                    border: '1px solid var(--role-accent-border, rgba(232, 249, 83, 0.2))',
                    borderRadius: '14px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--role-accent-bg, rgba(232, 249, 83, 0.15))',
                        color: 'var(--role-accent-color, var(--neon-yellow))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HandCoins size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{loan.borrowerName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={11} /> Lent: {loan.lentDate.split('T')[0]}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--role-accent-color, var(--neon-yellow))' }}>
                      {currencySymbol}{loan.remainingAmount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Due: {loan.dueDate || 'Open'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredTransactions.length === 0 && filteredLoans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>No matches found</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Try searching by category, note, or borrower name.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
