import React from 'react';
import { Home, ReceiptText, Sparkles, BarChart3, Coins } from 'lucide-react';

export type ScreenTab =
  | 'home'
  | 'transactions'
  | 'ai'
  | 'stats'
  | 'portfolio'
  | 'loans'
  | 'assets'
  | 'profile';

interface FloatingDockProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const isPortfolioActive =
    currentTab === 'portfolio' || currentTab === 'loans' || currentTab === 'assets';

  return (
    <div className="dock-bar-wrapper">
      <nav className="floating-bottom-dock">
        {/* Tab 1: Home */}
        <button
          type="button"
          className={`dock-action-btn ${currentTab === 'home' ? 'active' : ''}`}
          onClick={() => onSelectTab('home')}
          title="Home Dashboard"
          aria-label="Home Dashboard"
        >
          <Home size={19} />
        </button>

        {/* Tab 2: All Transactions */}
        <button
          type="button"
          className={`dock-action-btn ${currentTab === 'transactions' ? 'active' : ''}`}
          onClick={() => onSelectTab('transactions')}
          title="All Transactions"
          aria-label="All Transactions"
        >
          <ReceiptText size={19} />
        </button>

        {/* Tab 3: CENTER AI ASSISTANT BUTTON (ALWAYS IN CENTER) */}
        <button
          type="button"
          className={`dock-ai-center-btn ${currentTab === 'ai' ? 'active' : ''}`}
          onClick={() => onSelectTab('ai')}
          title="AI Financial Assistant"
          aria-label="AI Financial Assistant"
        >
          <Sparkles size={20} />
        </button>

        {/* Tab 4: Analytics / Stats */}
        <button
          type="button"
          className={`dock-action-btn ${currentTab === 'stats' ? 'active' : ''}`}
          onClick={() => onSelectTab('stats')}
          title="Statistics & Trends"
          aria-label="Statistics & Trends"
        >
          <BarChart3 size={19} />
        </button>

        {/* Tab 5: Portfolio (Loans & Assets) */}
        <button
          type="button"
          className={`dock-action-btn ${isPortfolioActive ? 'active' : ''}`}
          onClick={() => onSelectTab('portfolio')}
          title="Portfolio & Vault"
          aria-label="Portfolio & Vault"
        >
          <Coins size={19} />
        </button>
      </nav>
    </div>
  );
};
