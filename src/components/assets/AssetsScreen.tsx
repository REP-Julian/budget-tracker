import React, { useState } from 'react';
import { Banknote, Handshake, Coins, Building, Plus, Trash2 } from 'lucide-react';
import { AddAssetModal } from './AddAssetModal';
import { Wallet, Loan, Asset, AssetClass } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';
import '../../styles/assets.css';

interface AssetsScreenProps {
  wallets: Wallet[];
  loans: Loan[];
  assets: Asset[];
  onAddAsset: (data: {
    name: string;
    assetClass: AssetClass;
    value: number;
    notes?: string;
  }) => void;
  onDeleteAsset?: (asset: Asset) => void;
  currencySymbol?: string;
}

export const AssetsScreen: React.FC<AssetsScreenProps> = ({
  wallets,
  loans,
  assets,
  onAddAsset,
  onDeleteAsset,
  currencySymbol = '$',
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const totalLiquid = FinanceEngine.calculateTotalLiquidBalance(wallets);
  const totalReceivables = FinanceEngine.calculateTotalMoneyLent(loans);
  const totalNetWorth = FinanceEngine.calculateNetWorth(wallets, loans, assets);

  return (
    <div className="assets-container">
      {/* Net Worth Summary Card */}
      <div className="networth-hero-card">
        <div className="networth-label">Total Net Worth</div>
        <div className="networth-amount">
          {currencySymbol}
          {totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="networth-sub">
          ↗ Real-time asset & receivable valuation
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 700 }}>Asset Portfolio Breakdown</div>
        <button
          className="pill-badge"
          style={{
            background: 'var(--card-surface)',
            border: '1px solid var(--card-border)',
            color: 'var(--neon-yellow)',
            cursor: 'pointer',
            padding: '6px 12px',
          }}
          onClick={() => setIsAddOpen(true)}
        >
          <Plus size={13} /> Add Asset
        </button>
      </div>

      <div className="asset-classes-list">
        {/* 1. Liquid Cash & Wallets */}
        <div className="asset-item-card">
          <div className="asset-item-left">
            <div className="asset-icon-box" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
              <Banknote size={18} />
            </div>
            <div>
              <div className="asset-item-title">Liquid Cash & Wallets</div>
              <div className="asset-item-sub">{wallets.length} manual active wallets</div>
            </div>
          </div>
          <div className="asset-item-val">
            {currencySymbol}{totalLiquid.toFixed(2)}
          </div>
        </div>

        {/* 2. Money Lent Receivables */}
        <div className="asset-item-card" style={{ borderLeft: '3px solid #06B6D4' }}>
          <div className="asset-item-left">
            <div className="asset-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}>
              <Handshake size={18} />
            </div>
            <div>
              <div className="asset-item-title">Money Lent (Receivables)</div>
              <div className="asset-item-sub">Loans currently owed to you</div>
            </div>
          </div>
          <div className="asset-item-val" style={{ color: '#38BDF8' }}>
            {currencySymbol}{totalReceivables.toFixed(2)}
          </div>
        </div>

        {/* 3. Custom Assets List */}
        {assets.map((ast) => (
          <div key={ast.id} className="asset-item-card">
            <div className="asset-item-left">
              <div
                className="asset-icon-box"
                style={{
                  background:
                    ast.assetClass === 'crypto'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : ast.assetClass === 'physical'
                      ? 'rgba(168, 85, 247, 0.15)'
                      : 'rgba(56, 189, 248, 0.15)',
                  color:
                    ast.assetClass === 'crypto'
                      ? '#F59E0B'
                      : ast.assetClass === 'physical'
                      ? '#A855F7'
                      : '#38BDF8',
                }}
              >
                {ast.assetClass === 'crypto' ? (
                  <Coins size={18} />
                ) : (
                  <Building size={18} />
                )}
              </div>
              <div>
                <div className="asset-item-title">{ast.name}</div>
                <div className="asset-item-sub">
                  {ast.assetClass.toUpperCase()} • {ast.notes || 'Asset holding'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="asset-item-val">
                {currencySymbol}{ast.value.toFixed(2)}
              </div>
              {onDeleteAsset && (
                <button
                  className="asset-delete-btn"
                  title="Delete asset"
                  onClick={() => onDeleteAsset(ast)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddAssetModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        currencySymbol={currencySymbol}
        onSubmit={onAddAsset}
      />
    </div>
  );
};
