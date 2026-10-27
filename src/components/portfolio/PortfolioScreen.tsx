import React, { useState } from 'react';
import { Handshake, Coins } from 'lucide-react';
import { LoanLedgerScreen } from '../loans/LoanLedgerScreen';
import { AssetsScreen } from '../assets/AssetsScreen';
import { Wallet, Loan, Asset, AssetClass } from '../../types';

interface PortfolioScreenProps {
  loans: Loan[];
  wallets: Wallet[];
  assets: Asset[];
  currencySymbol?: string;
  initialSubTab?: 'loans' | 'assets';
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
  onAddAsset: (data: {
    name: string;
    assetClass: AssetClass;
    value: number;
    notes?: string;
  }) => void;
  onDeleteAsset?: (asset: Asset) => void;
}

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({
  loans,
  wallets,
  assets,
  currencySymbol = '₱',
  initialSubTab = 'loans',
  onLendMoney,
  onRepayLoan,
  onDeleteLoan,
  onAddAsset,
  onDeleteAsset,
}) => {
  const [subTab, setSubTab] = useState<'loans' | 'assets'>(initialSubTab);

  const activeLoansCount = loans.filter((l) => l.status !== 'settled').length;

  return (
    <div style={{ paddingBottom: '90px' }}>
      {/* Top Segmented Sub-Tab Bar */}
      <div
        style={{
          display: 'flex',
          maxWidth: '480px',
          margin: '0 auto',
          padding: '12px 16px 4px',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            background: 'var(--card-surface)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-full)',
            padding: '4px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <button
            type="button"
            onClick={() => setSubTab('loans')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              background: subTab === 'loans' ? 'var(--dock-btn-active)' : 'transparent',
              color: subTab === 'loans' ? 'var(--dock-btn-active-text)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            <Handshake size={15} />
            <span>Money Lent</span>
            {activeLoansCount > 0 && (
              <span
                style={{
                  background: subTab === 'loans' ? '#000000' : 'rgba(232, 249, 83, 0.2)',
                  color: subTab === 'loans' ? '#ffffff' : 'var(--neon-yellow)',
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {activeLoansCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('assets')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              background: subTab === 'assets' ? 'var(--dock-btn-active)' : 'transparent',
              color: subTab === 'assets' ? 'var(--dock-btn-active-text)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            <Coins size={15} />
            <span>Assets & Net Worth</span>
          </button>
        </div>
      </div>

      {/* Screen Content */}
      {subTab === 'loans' ? (
        <LoanLedgerScreen
          loans={loans}
          wallets={wallets}
          currencySymbol={currencySymbol}
          onLendMoney={onLendMoney}
          onRepayLoan={onRepayLoan}
          onDeleteLoan={onDeleteLoan}
        />
      ) : (
        <AssetsScreen
          wallets={wallets}
          loans={loans}
          assets={assets}
          currencySymbol={currencySymbol}
          onAddAsset={onAddAsset}
          onDeleteAsset={onDeleteAsset}
        />
      )}
    </div>
  );
};
