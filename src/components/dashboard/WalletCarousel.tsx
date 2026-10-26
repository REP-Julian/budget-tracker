import React from 'react';
import { Banknote, Vault, ShieldAlert, Wallet as WalletIcon } from 'lucide-react';
import { Wallet } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';

interface WalletCarouselProps {
  wallets: Wallet[];
  onSelectWallet?: (wallet: Wallet) => void;
  currencySymbol?: string;
}

export const WalletCarousel: React.FC<WalletCarouselProps> = ({
  wallets,
  onSelectWallet,
  currencySymbol = '$',
}) => {
  const sortedWallets = FinanceEngine.sortWallets(wallets);

  const getWalletIcon = (type: Wallet['type']) => {
    switch (type) {
      case 'cash':
        return <Banknote size={15} color="#22C55E" />;
      case 'savings':
      case 'vault':
        return <Vault size={15} color="#38BDF8" />;
      case 'emergency':
        return <ShieldAlert size={15} color="#F59E0B" />;
      default:
        return <WalletIcon size={15} color="#A855F7" />;
    }
  };

  return (
    <div className="wallets-carousel">
      {sortedWallets.map((wallet) => (
        <div
          key={wallet.id}
          className="wallet-tile"
          onClick={() => onSelectWallet?.(wallet)}
        >
          <div className="wallet-tile-header">
            <div
              className="wallet-icon-box"
              style={{
                background:
                  wallet.type === 'cash'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(56, 189, 248, 0.15)',
              }}
            >
              {getWalletIcon(wallet.type)}
            </div>
            <span>{wallet.name}</span>
          </div>

          <div className="wallet-tile-balance">
            {currencySymbol}
            {wallet.balance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          <div className="wallet-tile-sub">
            {wallet.type === 'cash' ? 'Pocket cash' : 'Manual reserve'}
          </div>
        </div>
      ))}
    </div>
  );
};
