import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Car,
  Home,
  BookOpen,
  Coffee,
  CircleDot,
  ReceiptText,
  Trash2,
  Search,
  Calendar,
  Plus,
} from 'lucide-react';
import { Transaction, Wallet } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';
import '../../styles/transactions.css';

export type TimeframeOption = '7d' | '3m' | '6m' | '9m' | '12m' | 'custom';

interface TransactionsScreenProps {
  transactions: Transaction[];
  wallets: Wallet[];
  currencySymbol?: string;
  onDeleteTransaction?: (id: string) => void;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  transactions,
  wallets,
  currencySymbol = '₱',
  onDeleteTransaction,
  onAddExpense,
  onAddIncome,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
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

  // Filter by timeframe
  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions
      .filter((tx) => {
        const txDate = new Date(tx.date);

        // Timeframe filter
        if (timeframe === '7d') {
          const cut = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (txDate < cut) return false;
        } else if (timeframe === '3m') {
          const cut = new Date(now);
          cut.setMonth(cut.getMonth() - 3);
          if (txDate < cut) return false;
        } else if (timeframe === '6m') {
          const cut = new Date(now);
          cut.setMonth(cut.getMonth() - 6);
          if (txDate < cut) return false;
        } else if (timeframe === '9m') {
          const cut = new Date(now);
          cut.setMonth(cut.getMonth() - 9);
          if (txDate < cut) return false;
        } else if (timeframe === '12m') {
          const cut = new Date(now);
          cut.setFullYear(cut.getFullYear() - 1);
          if (txDate < cut) return false;
        } else if (timeframe === 'custom') {
          const start = new Date(`${customStartDate}T00:00:00`);
          const end = new Date(`${customEndDate}T23:59:59`);
          if (txDate < start || txDate > end) return false;
        }

        // Type filter
        if (typeFilter !== 'all' && tx.type !== typeFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNote = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
          const matchCat = tx.category.toLowerCase().includes(q);
          const matchWallet = getWalletName(tx.walletId).toLowerCase().includes(q);
          if (!matchNote && !matchCat && !matchWallet) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, timeframe, customStartDate, customEndDate, typeFilter, searchQuery, wallets]);

  // Financial summary metrics
  const { totalSpent, totalIncome, netFlow } = useMemo(() => {
    let spent = 0;
    let inc = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        spent += tx.amount;
      } else {
        inc += tx.amount;
      }
    });
    return {
      totalSpent: spent,
      totalIncome: inc,
      netFlow: inc - spent,
    };
  }, [filteredTransactions]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { [dateKey: string]: { dateLabel: string; list: Transaction[]; daySpent: number } } = {};
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    filteredTransactions.forEach((tx) => {
      const rawDateStr = tx.date.slice(0, 10);
      if (!groups[rawDateStr]) {
        let label = rawDateStr;
        if (rawDateStr === todayStr) {
          label = 'Today';
        } else if (rawDateStr === yesterdayStr) {
          label = 'Yesterday';
        } else {
          try {
            const d = new Date(tx.date);
            label = d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          } catch {
            label = rawDateStr;
          }
        }
        groups[rawDateStr] = { dateLabel: label, list: [], daySpent: 0 };
      }
      groups[rawDateStr].list.push(tx);
      if (tx.type === 'expense') {
        groups[rawDateStr].daySpent += tx.amount;
      }
    });

    return Object.entries(groups);
  }, [filteredTransactions]);

  return (
    <div className="transactions-screen-container">
      {/* Header */}
      <div className="tx-screen-header">
        <div>
          <h1 className="tx-screen-title">Transactions</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Complete Financial Records
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="tx-screen-count">
            {filteredTransactions.length} records
          </div>
          {(onAddExpense || onAddIncome) && (
            <button
              type="button"
              onClick={onAddExpense || onAddIncome}
              style={{
                background: 'var(--neon-yellow)',
                color: '#000000',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Add Transaction"
            >
              <Plus size={13} strokeWidth={3} />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div className="tx-filter-card">
        <div className="tx-filter-row">
          <div className="tx-filter-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} color="var(--neon-yellow)" />
            <span>Timeframe</span>
          </div>
          <select
            className="tx-dropdown-select"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
            aria-label="Filter transactions timeframe"
          >
            <option value="7d">Last 7 Days</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="9m">Last 9 Months</option>
            <option value="12m">Last 12 Months</option>
            <option value="custom">Custom Date Range ▾</option>
          </select>
        </div>

        {/* Custom Date Range Inputs */}
        {timeframe === 'custom' && (
          <div className="tx-custom-date-box">
            <div className="tx-date-field">
              <label>Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="tx-date-field">
              <label>End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Search & Type Filters */}
        <div className="tx-controls-row">
          <div className="tx-search-input-wrapper">
            <Search size={14} className="tx-search-icon" />
            <input
              type="text"
              placeholder="Search category, note, wallet..."
              className="tx-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tx-type-chips">
            <button
              type="button"
              className={`tx-type-btn ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`tx-type-btn ${typeFilter === 'expense' ? 'active' : ''}`}
              onClick={() => setTypeFilter('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`tx-type-btn ${typeFilter === 'income' ? 'active' : ''}`}
              onClick={() => setTypeFilter('income')}
            >
              Income
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="tx-metrics-strip">
        <div className="tx-metric-card">
          <div className="tx-metric-label">Expenses</div>
          <div className="tx-metric-value expense">
            -{currencySymbol}{totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="tx-metric-card">
          <div className="tx-metric-label">Income</div>
          <div className="tx-metric-value income">
            +{currencySymbol}{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="tx-metric-card">
          <div className="tx-metric-label">Net Flow</div>
          <div className="tx-metric-value net">
            {netFlow >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(netFlow).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Grouped Transaction List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {groupedTransactions.map(([dateKey, group]) => (
          <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="tx-date-group-header">
              <span>{group.dateLabel}</span>
              <span className="tx-date-group-total">
                Spent: {currencySymbol}{group.daySpent.toFixed(2)}
              </span>
            </div>

            <div className="transactions-list">
              {group.list.map((tx) => (
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
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="transaction-name">{tx.notes || tx.category}</div>
                      <div className="transaction-sub">
                        <span className={`transaction-badge ${tx.isNecessity ? 'necessity' : 'discretionary'}`}>
                          {tx.isNecessity ? 'Necessity' : 'Discretionary'}
                        </span>
                        <span className="transaction-meta">
                          {tx.notes ? `${tx.category} • ` : ''}
                          {getWalletName(tx.walletId)} • {FinanceEngine.formatTransactionDateTime(tx.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="transaction-right-wrapper">
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
                      {tx.tax > 0 && (
                        <div className="transaction-tax">
                          Tax: {currencySymbol}{tx.tax.toFixed(2)}
                        </div>
                      )}
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
            </div>
          </div>
        ))}

        {filteredTransactions.length === 0 && (
          <div className="tx-empty-card">
            <ReceiptText size={28} style={{ opacity: 0.5, color: 'var(--neon-yellow)' }} />
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              No transactions found
            </div>
            <div style={{ fontSize: '11px', maxWidth: '280px', lineHeight: '1.4' }}>
              No records match your selected timeframe or search criteria.
            </div>
            {(searchQuery || typeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--card-border)',
                  color: 'var(--neon-yellow)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
