import React, { useState } from 'react';
import { Sparkles, Send, Bot, Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { Wallet, Transaction, Loan, Asset, UserProfile, TransactionType } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';
import { AiClientService } from '../../services/aiClientService';
import '../../styles/ai.css';

export interface AiMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

interface AiAssistantScreenProps {
  wallets: Wallet[];
  transactions: Transaction[];
  loans: Loan[];
  assets: Asset[];
  profile: UserProfile;
  currencySymbol?: string;
  messages: AiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
  onOpenSettings?: () => void;
  onQuickAddTransaction: (data: {
    walletId: string;
    type: TransactionType;
    amount: number;
    category: string;
    isNecessity: boolean;
    notes?: string;
  }) => void;
}

export const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({
  wallets,
  transactions,
  loans,
  assets: _assets,
  profile,
  currencySymbol = '₱',
  messages,
  setMessages,
  onOpenSettings,
  onQuickAddTransaction,
}) => {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const hasCustomAi = Boolean(profile.aiBaseUrl?.trim());

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isGenerating) return;

    const userMsg: AiMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    const botMsgId = `ai-${Date.now()}`;
    const initialBotMsg: AiMessage = {
      id: botMsgId,
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, initialBotMsg]);

    try {
      const response = await AiClientService.generateResponse(
        query,
        {
          profile,
          wallets,
          transactions,
          loans,
          currencySymbol,
        },
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, text: m.text + chunk } : m))
          );
        }
      );

      // Final complete text
      setMessages((prev) =>
        prev.map((m) => (m.id === botMsgId ? { ...m, text: response.text } : m))
      );

      // Process extracted offline action if any
      if (response.action && response.action.action === 'log_expense') {
        const defaultWallet = wallets.find((w) => w.id === response.action?.walletId) || wallets[0];
        if (defaultWallet && response.action.amount > 0) {
          onQuickAddTransaction({
            walletId: defaultWallet.id,
            type: 'expense',
            amount: response.action.amount,
            category: response.action.category || 'Shop',
            isNecessity: true,
            notes: response.action.notes || 'Expense',
          });
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, text: `I have analyzed your balances. You have ${currencySymbol}${FinanceEngine.calculateTotalLiquidBalance(wallets).toFixed(2)} in total liquid balance.` }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Clean plain text rendering: no special characters, no asterisks
   */
  const renderFormattedText = (rawText: string) => {
    if (!rawText) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
          <Sparkles size={12} className="ai-spin" /> Thinking...
        </span>
      );
    }

    const lines = rawText.split('\n');
    return (
      <div className="ai-formatted-content">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} style={{ height: '6px' }} />;
          return (
            <p key={idx} className="ai-paragraph" style={{ margin: '3px 0', lineHeight: 1.45 }}>
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="ai-container">
      {/* AI Header Card */}
      <div className="ai-header-card">
        <div className="ai-avatar-orb">
          <Sparkles size={22} />
        </div>
        <div>
          <div className="ai-title">Nova Financial AI</div>
          <div className="ai-status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {hasCustomAi ? (
              <>
                <CheckCircle2 size={11} color="var(--accent-green)" />
                <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
                  Connected ({profile.aiModel || 'Custom AI'})
                </span>
              </>
            ) : (
              <>
                <Bot size={11} color="var(--neon-yellow)" />
                <span>Zero-Lag Built-in Intelligence</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Provider Config Banner */}
      <div
        style={{
          background: 'var(--card-elevated)',
          border: '1px solid var(--card-border)',
          borderRadius: '14px',
          padding: '10px 14px',
          margin: '0 4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasCustomAi ? (
            <CheckCircle2 size={15} color="var(--accent-green)" />
          ) : (
            <AlertCircle size={15} color="var(--neon-yellow)" />
          )}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 800 }}>
              {hasCustomAi ? `Model: ${profile.aiModel || 'Default Model'}` : 'Custom AI Provider Not Configured'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {hasCustomAi
                ? `Base URL: ${profile.aiBaseUrl}`
                : 'Using fast zero-lag device heuristics. Set API key in Settings.'}
            </div>
          </div>
        </div>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 10px',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Settings size={11} /> Settings
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="ai-chat-feed">
        {messages.map((m) => (
          <div key={m.id} className={`ai-bubble ${m.sender}`}>
            {renderFormattedText(m.text)}
            <div
              style={{
                fontSize: '9.5px',
                opacity: 0.65,
                marginTop: '6px',
                textAlign: m.sender === 'user' ? 'right' : 'left',
              }}
            >
              {m.timestamp}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Suggestion Chips */}
      <div className="ai-suggestions-row">
        <button
          className="ai-suggestion-chip"
          disabled={isGenerating}
          onClick={() => handleSend('Who owes me money right now?')}
        >
          🤝 Who owes me money?
        </button>
        <button
          className="ai-suggestion-chip"
          disabled={isGenerating}
          onClick={() => handleSend('Can I afford dinner tonight?')}
        >
          🍽️ Can I afford dinner tonight?
        </button>
        <button
          className="ai-suggestion-chip"
          disabled={isGenerating}
          onClick={() => handleSend('Log 150 lunch from cash')}
        >
          ⚡ Log 150 lunch
        </button>
      </div>

      {/* Chat Input Bar */}
      <form
        className="ai-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          className="ai-input-field"
          placeholder={isGenerating ? 'Nova is thinking...' : 'Ask Nova or log an expense...'}
          value={input}
          disabled={isGenerating}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="ai-send-btn" disabled={!input.trim() || isGenerating} title="Send message">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
