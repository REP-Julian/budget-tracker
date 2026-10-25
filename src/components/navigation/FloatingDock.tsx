import React from 'react';
import { Home, Handshake, Sparkles, BarChart3, Coins } from 'lucide-react';

export type ScreenTab = 'home' | 'loans' | 'ai' | 'stats' | 'assets' | 'profile';

interface FloatingDockProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <div className="dock-bar-wrapper">
      <nav className="floating-bottom-dock">
        {/* Tab 1: Home */}
        <button
          className={`dock-action-btn ${currentTab === 'home' ? 'active' : ''}`}
          onClick={() => onSelectTab('home')}
          title="Home Dashboard"
        >
          <Home size={19} />
        </button>

        {/* Tab 2: Money Lent */}
        <button
          className={`dock-action-btn ${currentTab === 'loans' ? 'active' : ''}`}
          onClick={() => onSelectTab('loans')}
          title="Money Lent Ledger"
        >
          <Handshake size={19} />
        </button>

        {/* Tab 3: CENTER AI ASSISTANT BUTTON */}
        <button
          className={`dock-ai-center-btn ${currentTab === 'ai' ? 'active' : ''}`}
          onClick={() => onSelectTab('ai')}
          title="AI Financial Assistant"
        >
          <Sparkles size={20} />
        </button>

        {/* Tab 4: Analytics */}
        <button
          className={`dock-action-btn ${currentTab === 'stats' ? 'active' : ''}`}
          onClick={() => onSelectTab('stats')}
          title="Statistics & Trends"
        >
          <BarChart3 size={19} />
        </button>

        {/* Tab 5: Assets */}
        <button
          className={`dock-action-btn ${currentTab === 'assets' ? 'active' : ''}`}
          onClick={() => onSelectTab('assets')}
          title="Assets & Net Worth"
        >
          <Coins size={19} />
        </button>
      </nav>
    </div>
  );
};
