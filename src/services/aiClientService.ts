import { UserProfile, Wallet, Transaction, Loan } from '../types';
import { FinanceEngine } from './financeEngine';

export interface AiModelOption {
  id: string;
  name: string;
  isFree?: boolean;
}

export interface AssistantResponse {
  text: string;
  action?: {
    action: 'log_expense' | 'log_income' | 'lend_money';
    amount: number;
    category?: string;
    notes?: string;
    walletId?: string;
  };
}

export class AiClientService {
  /**
   * Auto-detect available models from the custom base URL and API key
   */
  public static async fetchAvailableModels(baseUrl: string, apiKey: string): Promise<AiModelOption[]> {
    if (!baseUrl) {
      throw new Error('Base URL is required.');
    }

    const cleanBase = baseUrl.trim().replace(/\/+$/, '');
    const url = cleanBase.endsWith('/models') ? cleanBase : `${cleanBase}/models`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to fetch models (${res.status}): ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const modelList: AiModelOption[] = [];

      // OpenAI / OpenRouter / Ollama standard format: { data: [{ id: '...' }] } or array
      const rawList = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];

      for (const item of rawList) {
        const id = item.id || item.name || '';
        if (id) {
          const isFree =
            id.toLowerCase().includes(':free') ||
            id.toLowerCase().includes('free') ||
            item.pricing?.prompt === '0' ||
            item.pricing?.prompt === 0;

          modelList.push({
            id,
            name: item.name || id,
            isFree,
          });
        }
      }

      // Prioritize free models first, then sort alphabetically
      modelList.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      });

      return modelList;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Timeout connecting to AI provider. Check Base URL.');
      }
      throw err;
    }
  }

  /**
   * Build clean context prompt and send chat completion
   */
  public static async generateResponse(
    userPrompt: string,
    context: {
      profile: UserProfile;
      wallets: Wallet[];
      transactions: Transaction[];
      loans: Loan[];
      currencySymbol: string;
    },
    onToken?: (token: string) => void
  ): Promise<AssistantResponse> {
    const { profile, wallets, transactions, loans, currencySymbol } = context;
    const baseUrl = profile.aiBaseUrl?.trim();
    const apiKey = profile.aiApiKey?.trim();
    const model = profile.aiModel?.trim();

    // If API credentials are not configured, fall back directly to zero-lag rule engine
    if (!baseUrl) {
      return this.heuristicFallback(userPrompt, context);
    }

    const cleanBase = baseUrl.replace(/\/+$/, '');
    const chatEndpoint = cleanBase.endsWith('/chat/completions')
      ? cleanBase
      : `${cleanBase}/chat/completions`;

    const totalBalance = FinanceEngine.calculateTotalLiquidBalance(wallets);
    const { income, expense } = FinanceEngine.calculateMonthlyIncomeAndExpense(transactions);
    const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'partial');
    const totalLent = activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0);

    const systemPrompt = `You are Nova, an intelligent personal financial advisor and expense assistant inside Budget Tracker.
Current Financial Context:
- User: ${profile.fullName || 'User'} (${profile.role || 'Primary Earner'})
- Currency: ${currencySymbol}
- Total Liquid Balance across wallets: ${currencySymbol}${totalBalance.toFixed(2)}
- Wallets: ${wallets.map((w) => `${w.name} (${w.id}): ${currencySymbol}${w.balance.toFixed(2)}`).join(', ')}
- Monthly Income: ${currencySymbol}${income.toFixed(2)}, Expenses: ${currencySymbol}${expense.toFixed(2)}
- Active Money Lent to Others: ${currencySymbol}${totalLent.toFixed(2)} across ${activeLoans.length} loans (${activeLoans.map((l) => `${l.borrowerName}: ${currencySymbol}${l.remainingAmount}`).join(', ')})

Directives:
1. Provide concise, direct financial insights.
2. Strip markdown headers (no ###) and avoid excessive asterisks.
3. If the user asks to log an expense or income (e.g. "bought coffee 120 from Cash", "spent 200 on groceries"), confirm it clearly and append an ACTION JSON block on a new line:
ACTION: {"action":"log_expense","amount":120,"category":"Food","notes":"coffee","walletId":"${wallets[0]?.id || ''}"}
4. For general greetings or balance queries, respond conversationally and helpfully.`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const requestBody = {
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      stream: Boolean(onToken),
    };

    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('AI API Error:', response.status, errorText);
        // Fall back gracefully to rule-based analysis
        const fallback = this.heuristicFallback(userPrompt, context);
        return {
          text: `(Note: Remote AI error ${response.status}. Showing offline analysis)\n\n${fallback.text}`,
          action: fallback.action,
        };
      }

      if (onToken && response.body) {
        // Stream reading
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter((l) => l.trim().startsWith('data:'));
            for (const line of lines) {
              const dataStr = line.replace(/^data:\s*/, '').trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullText += delta;
                  onToken(delta);
                }
              } catch {
                // Ignore parse errors on raw stream fragments
              }
            }
          }
        }

        return this.parseAssistantOutput(fullText);
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return this.parseAssistantOutput(content);
      }
    } catch (err: any) {
      console.warn('AI Fetch error, falling back:', err.message);
      const fallback = this.heuristicFallback(userPrompt, context);
      return {
        text: `(Offline Mode: Unable to connect to custom AI endpoint)\n\n${fallback.text}`,
        action: fallback.action,
      };
    }
  }

  /**
   * Parse response and extract optional ACTION JSON
   */
  private static parseAssistantOutput(rawText: string): AssistantResponse {
    let cleanText = rawText;
    let action: AssistantResponse['action'] = undefined;

    const actionMatch = rawText.match(/ACTION:\s*({[\s\S]*})/);
    if (actionMatch && actionMatch[1]) {
      try {
        action = JSON.parse(actionMatch[1]);
        cleanText = rawText.replace(/ACTION:\s*{[\s\S]*}/, '').trim();
      } catch {
        // Ignore JSON parse errors
      }
    }

    return {
      text: cleanText,
      action,
    };
  }

  /**
   * Zero-lag instant rule-based fallback when offline or no API key
   */
  public static heuristicFallback(
    prompt: string,
    context: {
      profile: UserProfile;
      wallets: Wallet[];
      transactions: Transaction[];
      loans: Loan[];
      currencySymbol: string;
    }
  ): AssistantResponse {
    const p = prompt.toLowerCase();
    const { profile, wallets, loans, currencySymbol } = context;
    const totalLiquid = FinanceEngine.calculateTotalLiquidBalance(wallets);

    // 1. Expense logging detection (e.g. "log 150 lunch", "spent 200 on grocery")
    const spendMatch = prompt.match(/(?:spent|paid|log|bought|cost)\s+(?:about\s+)?(?:[\$₱€£¥]\s*)?(\d+(?:\.\d{1,2})?)\s*(?:on|for)?\s*([a-zA-Z\s]+)?/i);
    if (spendMatch && spendMatch[1]) {
      const amount = parseFloat(spendMatch[1]);
      const rawTarget = (spendMatch[2] || 'expense').trim();
      let category = 'Shop';
      if (/food|lunch|dinner|breakfast|snack|coffee/i.test(rawTarget)) category = 'Food';
      else if (/transport|grab|taxi|gas|fare/i.test(rawTarget)) category = 'Transport';
      else if (/rent|house|apartment/i.test(rawTarget)) category = 'Rent';
      else if (/school|tuition|book/i.test(rawTarget)) category = 'Education';

      const wallet = wallets[0];
      return {
        text: `Logged ${currencySymbol}${amount.toFixed(2)} for ${rawTarget} under ${category}.`,
        action: {
          action: 'log_expense',
          amount,
          category,
          notes: rawTarget,
          walletId: wallet?.id,
        },
      };
    }

    // 2. Who owes me money
    if (p.includes('owe') || p.includes('borrow') || p.includes('lent')) {
      const active = loans.filter((l) => l.status === 'active' || l.status === 'partial');
      if (active.length === 0) {
        return { text: 'You currently have zero active receivables. No one owes you money right now.' };
      }
      const totalOwed = active.reduce((acc, l) => acc + l.remainingAmount, 0);
      const list = active.map((l) => `• ${l.borrowerName}: ${currencySymbol}${l.remainingAmount.toFixed(2)}`).join('\n');
      return {
        text: `You have ${active.length} active borrowers with ${currencySymbol}${totalOwed.toFixed(2)} total pending collection:\n\n${list}`,
      };
    }

    // 3. Balance check
    if (p.includes('balance') || p.includes('how much') || p.includes('cash')) {
      const breakdown = wallets.map((w) => `• ${w.name}: ${currencySymbol}${w.balance.toFixed(2)}`).join('\n');
      return {
        text: `Your total liquid balance is ${currencySymbol}${totalLiquid.toFixed(2)}.\n\n${breakdown}`,
      };
    }

    // 4. Can I afford dinner / outside spend
    if (p.includes('afford') || p.includes('dinner') || p.includes('outside')) {
      const safe = totalLiquid > 500;
      return {
        text: safe
          ? `Yes, you can afford dinner tonight. Your liquid balance is ${currencySymbol}${totalLiquid.toFixed(2)}.`
          : `Proceed with caution. Your current balance is ${currencySymbol}${totalLiquid.toFixed(2)}. Prioritize essential daily necessities first.`,
      };
    }

    // Default friendly answer
    return {
      text: `Hello ${profile.fullName || 'there'}. Your current liquid balance is ${currencySymbol}${totalLiquid.toFixed(2)}. Configure your custom AI Base URL and API Key in Settings to enable deep LLM reasoning.`,
    };
  }
}
