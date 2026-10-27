import React, { useState } from 'react';
import { Sparkles, Send, Bot, Settings, CheckCircle2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Wallet, Transaction, Loan, Asset, UserProfile, TransactionType } from '../../types';
import { FinanceEngine } from '../../services/financeEngine';
import { AiClientService } from '../../services/aiClientService';
import '../../styles/ai.css';

export interface AiMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  actionExecuted?: {
    type: 'income' | 'expense';
    amount: number;
    notes?: string;
    category?: string;
    walletName?: string;
  };
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
    date?: string;
    notes?: string;
  }) => void;
}

export const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({
  wallets,
  transactions,
  loans,
  assets,
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

    // Chat history for multi-turn context
    const currentHistory = [...messages, userMsg].map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

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
          assets,
          currencySymbol,
        },
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, text: m.text + chunk } : m))
          );
        },
        currentHistory
      );

      // Process extracted action (Expense or Income)
      let executedActionInfo: AiMessage['actionExecuted'] = undefined;

      if (response.action) {
        const isIncome = response.action.action === 'log_income';
        const isExpense = response.action.action === 'log_expense';

        if ((isIncome || isExpense) && response.action.amount > 0) {
          const targetWallet =
            wallets.find((w) => w.id === response.action?.walletId) ||
            FinanceEngine.sortWallets(wallets)[0] ||
            wallets[0];

          if (targetWallet) {
            const txType: TransactionType = isIncome ? 'income' : 'expense';
            const cat = response.action.category || (isIncome ? 'Income' : 'Shop');
            const noteText = response.action.notes || (isIncome ? 'Income' : 'Expense');
            const isNec = response.action.isNecessity ?? (isExpense ? true : false);

            onQuickAddTransaction({
              walletId: targetWallet.id,
              type: txType,
              amount: response.action.amount,
              category: cat,
              isNecessity: isNec,
              notes: noteText,
            });

            executedActionInfo = {
              type: txType,
              amount: response.action.amount,
              notes: noteText,
              category: cat,
              walletName: targetWallet.name,
            };
          }
        }
      }

      // Final complete text with executed action metadata
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, text: response.text, actionExecuted: executedActionInfo }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                text: `I have analyzed your balances. You have ${currencySymbol}${FinanceEngine.calculateTotalLiquidBalance(wallets).toFixed(2)} in total liquid balance. Ask me "where did my money go?" or "paano makatipid?"!`,
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Rich formatting: parses markdown bold (**text**), lists, bullets, and breaks
   */
  const renderFormattedText = (rawText: string) => {
    if (!rawText) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
          <Sparkles size={12} className="ai-spin" /> Analyzing your finances...
        </span>
      );
    }

    const lines = rawText.split('\n');

    return (
      <div className="ai-formatted-content">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} style={{ height: '6px' }} />;

          // Parse **bold** parts
          const parts = trimmed.split(/(\*\*.*?\*\*)/g);

          return (
            <p key={idx} className="ai-paragraph" style={{ margin: '3px 0', lineHeight: 1.5 }}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="ai-highlight-bold">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
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
                <span>Zero-Lag Built-in Advisor</span>
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
            <Bot size={15} color="var(--neon-yellow)" />
          )}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 800 }}>
              {hasCustomAi ? `Model: ${profile.aiModel || 'Default Model'}` : 'Nova Built-in Intelligence Active'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {hasCustomAi
                ? `Base URL: ${profile.aiBaseUrl}`
                : 'Recognizes expenses, income, debt, and Tagalog/English budget advice.'}
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

            {/* Interactive Action Confirmation Card */}
            {m.actionExecuted && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 10px',
                  background: 'rgba(232, 249, 83, 0.08)',
                  border: '1px solid rgba(232, 249, 83, 0.25)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                }}
              >
                {m.actionExecuted.type === 'income' ? (
                  <ArrowDownLeft size={16} color="var(--accent-green)" />
                ) : (
                  <ArrowUpRight size={16} color="var(--neon-yellow)" />
                )}
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                    Auto-Logged {m.actionExecuted.type === 'income' ? '+' : '-'}{currencySymbol}{m.actionExecuted.amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {m.actionExecuted.notes} • {m.actionExecuted.category} • {m.actionExecuted.walletName}
                  </div>
                </div>
              </div>
            )}

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

      {/* Dynamic Smart Suggestion Chips */}
      <div className="ai-suggestions-row">
        <button
          className="ai-suggestion-chip"
          disabled={isGenerating}
          onClick={() => handleSend('Where did my money go? Breakdown my expenses')}
        >
          📊 Where did my money go?
        </button>
        <button
          className="ai-suggestion-chip"
          disabled={isGenerating}
          onClick={() => handleSend('Paano makatipid? Give me advice for my budget')}
        >
          💡 Tips to save money
        </button>
        <button
          className="ai-suggestion-chip"
          disabled={isGenerating}
          onClick={() => handleSend('How much allowance do I have left today?')}
        >
          🎒 Today's Allowance
        </button>
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
          onClick={() => handleSend('Log 15 tricycle')}
        >
          ⚡ Log 15 tricycle
        </button>
        <button
          className="ai-suggestion-chip"
          disabled={isGenerating}
          onClick={() => handleSend('Earned 500 allowance')}
        >
          💰 Earned 500 allowance
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
          placeholder={isGenerating ? 'Nova is thinking...' : 'Ask Nova or e.g. "log 20 pamasahe"...'}
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
