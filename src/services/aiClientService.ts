import { UserProfile, Wallet, Transaction, Loan, Asset } from '../types';
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

export interface AiFinancialContext {
  profile: UserProfile;
  wallets: Wallet[];
  transactions: Transaction[];
  loans: Loan[];
  assets?: Asset[];
  currencySymbol: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    context: AiFinancialContext,
    onToken?: (token: string) => void
  ): Promise<AssistantResponse> {
    const { profile, wallets, transactions, loans, assets = [], currencySymbol } = context;
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

    // 1. Wallets & Total Liquid Cash
    const sortedWallets = FinanceEngine.sortWallets(wallets);
    const totalBalance = FinanceEngine.calculateTotalLiquidBalance(sortedWallets);
    const walletLines = sortedWallets
      .map((w) => `• ${w.name} (${w.type}): ${currencySymbol}${w.balance.toFixed(2)}`)
      .join('\n');

    // 2. Monthly Cash Flow
    const { income, expense, net } = FinanceEngine.calculateMonthlyIncomeAndExpense(transactions);

    // 3. Daily Necessity Schedule & Today's Status
    const today = new Date();
    const dayOfWeek = today.getDay();
    const activeDays = profile.activeScheduleDays && profile.activeScheduleDays.length > 0
      ? profile.activeScheduleDays
      : [1, 2, 4, 5, 6];
    const workCap = profile.dailyNecessityCap || 500;
    const restCap = profile.restDayNecessityCap !== undefined ? profile.restDayNecessityCap : 150;
    const todayIso = today.toISOString().slice(0, 10);
    const todayNecessity = FinanceEngine.calculateDailyNecessitySpend(transactions, todayIso, workCap, activeDays, restCap);
    const activeDaysStr = activeDays.map((d) => DAY_SHORT_NAMES[d]).join(', ');

    // 4. Savings History Data (Discipline Tracker)
    const savings = FinanceEngine.calculateSavingsHistory(transactions, profile, 30);

    // 5. Active Loans & Receivables (Money Lent Out)
    const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'partial');
    const totalLent = activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    const loanLines = activeLoans.length > 0
      ? activeLoans
          .map((l) => `• ${l.borrowerName}: ${currencySymbol}${l.remainingAmount.toFixed(2)} remaining (Principal: ${currencySymbol}${l.principalAmount.toFixed(2)}${l.dueDate ? `, Due: ${l.dueDate}` : ''})`)
          .join('\n')
      : '• No outstanding loans or receivables.';

    // 6. Net Worth & Assets
    const netWorth = FinanceEngine.calculateNetWorth(sortedWallets, loans, assets);
    const otherAssets = assets.filter((a) => a.assetClass !== 'liquid');
    const otherAssetsTotal = otherAssets.reduce((sum, a) => sum + a.value, 0);
    const assetLines = otherAssets.length > 0
      ? otherAssets.map((a) => `• ${a.name} (${a.assetClass}): ${currencySymbol}${a.value.toFixed(2)}`).join('\n')
      : '• No physical or investment assets registered.';

    // 7. Recent Transactions (last 15)
    const recentTxs = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
    const recentTxLines = recentTxs.length > 0
      ? recentTxs
          .map((tx) => `• ${FinanceEngine.formatTransactionDateTime(tx.date)} | ${tx.type === 'expense' ? '-' : '+'}${currencySymbol}${tx.amount.toFixed(2)} | ${tx.category}${tx.notes ? ` ("${tx.notes}")` : ''} | ${tx.isNecessity ? 'Daily Necessity' : 'Discretionary'}`)
          .join('\n')
      : '• No recent transactions.';

    const systemPrompt = `You are Nova, an intelligent personal financial advisor and expense assistant inside Budget Tracker.
You specialize in student & personal budgeting, daily necessity allowance discipline, smart cash flow management, and loan receivable tracking.

=== REAL-TIME USER FINANCIAL CONTEXT ===
• User: ${profile.fullName || profile.username || 'User'} (${profile.role || 'Student / Earner'})
• Currency: ${currencySymbol} (${profile.currency || 'PHP'})
• Schedule: Active Work/School Days: [${activeDaysStr}] (Cap: ${currencySymbol}${workCap}/day) | Rest Days (Cap: ${currencySymbol}${restCap}/day)

=== CASH & WALLETS ===
• Total Liquid Cash: ${currencySymbol}${totalBalance.toFixed(2)}
• Wallet Breakdown:
${walletLines}

=== MONTHLY CASH FLOW (CURRENT MONTH) ===
• Total Income: ${currencySymbol}${income.toFixed(2)}
• Total Expenses: ${currencySymbol}${expense.toFixed(2)}
• Net Monthly Cash Flow: ${currencySymbol}${net.toFixed(2)} (${net >= 0 ? 'Surplus' : 'Deficit'})

=== TODAY'S DAILY NECESSITY STATUS ===
• Today is: ${DAY_NAMES[dayOfWeek]} (${todayNecessity.isWorkDay ? '🎒 Work/School Day' : '☕ Rest Day'})
• Today's Allowance Cap: ${currencySymbol}${todayNecessity.dailyCap.toFixed(2)}
• Spent Today (Necessities): ${currencySymbol}${todayNecessity.spentToday.toFixed(2)}
• Remaining Allowance Today: ${currencySymbol}${todayNecessity.remaining.toFixed(2)} (${todayNecessity.isOverBudget ? 'OVER BUDGET' : 'Within Budget'})

=== SAVINGS DISCIPLINE (UNSPENT DAILY ALLOWANCE) ===
• Saved Today: ${currencySymbol}${savings.todaySaved.toFixed(2)}
• Saved Past 7 Days (Week): ${currencySymbol}${savings.weekSaved.toFixed(2)}
• Saved Past 30 Days (Month): ${currencySymbol}${savings.monthSaved.toFixed(2)}

=== ACTIVE LOANS & RECEIVABLES (MONEY LENT OUT) ===
• Total Outstanding Lent: ${currencySymbol}${totalLent.toFixed(2)} across ${activeLoans.length} borrower(s)
${loanLines}

=== ASSETS & TOTAL NET WORTH ===
• Total Net Worth: ${currencySymbol}${netWorth.toFixed(2)}
• Liquid Cash: ${currencySymbol}${totalBalance.toFixed(2)}
• Receivables: ${currencySymbol}${totalLent.toFixed(2)}
• Physical / Investments: ${currencySymbol}${otherAssetsTotal.toFixed(2)}
${assetLines}

=== RECENT TRANSACTIONS (LATEST 15) ===
${recentTxLines}

=== DIRECTIVES & BEHAVIOR ===
1. Deep Financial Understanding: You possess complete knowledge of the user's financial status. Answer queries accurately using the context above.
2. Savings & Schedule: Understand student budgeting rules. If user asks how much they saved, report the exact savings for today, the past 7 days, and the past 30 days. If asked about today's schedule or cap, explain whether today is a work/school day or rest day and their remaining allowance.
3. Clean Formatting: Provide concise, structured, friendly answers. Do not use excessive markdown headers (avoid ###) or markdown tables. Use clean bullet points and bold text for numbers.
4. Action Logging: If the user explicitly asks to log an expense or income (e.g. "bought coffee 120 from Cash", "spent 250 on lunch"), confirm it clearly and append an ACTION JSON block on a new line:
ACTION: {"action":"log_expense","amount":120,"category":"Food","notes":"coffee","walletId":"${sortedWallets[0]?.id || ''}"}
5. Tone: Encouraging, analytical, disciplined financial companion.`;

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
   * Zero-lag instant rule-based fallback when offline or no API key configured.
   * Full comprehensive coverage of savings, daily necessity, cash flow, net worth, and loans.
   */
  public static heuristicFallback(
    prompt: string,
    context: AiFinancialContext
  ): AssistantResponse {
    const p = prompt.toLowerCase();
    const { profile, wallets, transactions, loans, assets = [], currencySymbol } = context;

    const sortedWallets = FinanceEngine.sortWallets(wallets);
    const totalLiquid = FinanceEngine.calculateTotalLiquidBalance(sortedWallets);
    const { income, expense, net } = FinanceEngine.calculateMonthlyIncomeAndExpense(transactions);
    const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'partial');
    const totalLent = activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    const totalNetWorth = FinanceEngine.calculateNetWorth(sortedWallets, loans, assets);

    const today = new Date();
    const dayOfWeek = today.getDay();
    const activeDays = profile.activeScheduleDays && profile.activeScheduleDays.length > 0
      ? profile.activeScheduleDays
      : [1, 2, 4, 5, 6];
    const workCap = profile.dailyNecessityCap || 500;
    const restCap = profile.restDayNecessityCap !== undefined ? profile.restDayNecessityCap : 150;
    const todayIso = today.toISOString().slice(0, 10);
    const todayNecessity = FinanceEngine.calculateDailyNecessitySpend(transactions, todayIso, workCap, activeDays, restCap);
    const todayDayName = DAY_NAMES[dayOfWeek];

    const savings = FinanceEngine.calculateSavingsHistory(transactions, profile, 30);

    // 1. Expense logging detection (e.g. "log 150 lunch", "spent 200 on grocery")
    const spendMatch = prompt.match(/(?:spent|paid|log|bought|cost)\s+(?:about\s+)?(?:[\$₱€£¥]\s*)?(\d+(?:\.\d{1,2})?)\s*(?:on|for)?\s*([a-zA-Z\s]+)?/i);
    if (spendMatch && spendMatch[1]) {
      const amount = parseFloat(spendMatch[1]);
      const rawTarget = (spendMatch[2] || 'expense').trim();
      let category = 'Shop';
      if (/food|lunch|dinner|breakfast|snack|coffee/i.test(rawTarget)) category = 'Food';
      else if (/transport|grab|taxi|gas|fare|jeep|mrt|lrt/i.test(rawTarget)) category = 'Transport';
      else if (/rent|house|apartment/i.test(rawTarget)) category = 'Rent';
      else if (/school|tuition|book|course/i.test(rawTarget)) category = 'Education';
      else if (/bill|electric|water|internet|load/i.test(rawTarget)) category = 'Bills';

      const wallet = sortedWallets[0] || wallets[0];
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

    // 2. Savings queries (Today / Week / Month)
    if (p.includes('sav') || p.includes('saved')) {
      return {
        text: `Here is your Daily Necessity Savings summary:
• Today's Savings: ${currencySymbol}${savings.todaySaved.toFixed(2)} unspent allowance
• Past 7 Days (Week): ${currencySymbol}${savings.weekSaved.toFixed(2)} saved
• Past 30 Days (Month): ${currencySymbol}${savings.monthSaved.toFixed(2)} saved

You can transfer these unspent daily funds into your Savings Safe to build up your financial cushion.`,
      };
    }

    // 3. Daily Necessity status / cap / allowance queries
    if (
      p.includes('necessity') ||
      p.includes('allowance') ||
      p.includes('cap') ||
      (p.includes('today') && (p.includes('spend') || p.includes('budget') || p.includes('status') || p.includes('left')))
    ) {
      const budgetStatus = todayNecessity.isOverBudget
        ? `⚠️ Over budget by ${currencySymbol}${(todayNecessity.spentToday - todayNecessity.dailyCap).toFixed(2)}`
        : `✅ Within budget (${currencySymbol}${todayNecessity.remaining.toFixed(2)} remaining)`;

      return {
        text: `Daily Necessity Status for Today (${todayDayName}):
• Day Type: ${todayNecessity.isWorkDay ? '🎒 Work/School Day' : '☕ Rest Day'}
• Daily Cap: ${currencySymbol}${todayNecessity.dailyCap.toFixed(2)}
• Spent Today: ${currencySymbol}${todayNecessity.spentToday.toFixed(2)} (${todayNecessity.percentage}%)
• Remaining Allowance: ${currencySymbol}${todayNecessity.remaining.toFixed(2)}
• Status: ${budgetStatus}`,
      };
    }

    // 4. Monthly Cash Flow (Income, Expense, Net)
    if (p.includes('income') || p.includes('expense') || p.includes('cash flow') || p.includes('net') || p.includes('monthly')) {
      return {
        text: `Current Month Cash Flow Summary:
• Total Income: ${currencySymbol}${income.toFixed(2)}
• Total Expenses: ${currencySymbol}${expense.toFixed(2)}
• Net Cash Flow: ${currencySymbol}${net.toFixed(2)} (${net >= 0 ? 'Surplus' : 'Deficit'})`,
      };
    }

    // 5. Total Net Worth & Assets
    if (p.includes('net worth') || p.includes('asset') || p.includes('wealth')) {
      const otherAssets = assets.filter((a) => a.assetClass !== 'liquid');
      const otherAssetsVal = otherAssets.reduce((sum, a) => sum + a.value, 0);
      return {
        text: `Total Net Worth: ${currencySymbol}${totalNetWorth.toFixed(2)}
• Liquid Cash (Wallets): ${currencySymbol}${totalLiquid.toFixed(2)}
• Active Receivables (Money Lent): ${currencySymbol}${totalLent.toFixed(2)}
• Physical & Investment Assets: ${currencySymbol}${otherAssetsVal.toFixed(2)}`,
      };
    }

    // 6. Who owes me money / Loans / Receivables
    if (p.includes('owe') || p.includes('borrow') || p.includes('lent') || p.includes('loan')) {
      if (activeLoans.length === 0) {
        return { text: 'You currently have zero active receivables. No one owes you money right now.' };
      }
      const list = activeLoans
        .map((l) => `• ${l.borrowerName}: ${currencySymbol}${l.remainingAmount.toFixed(2)} (Principal: ${currencySymbol}${l.principalAmount.toFixed(2)}${l.dueDate ? `, Due: ${l.dueDate}` : ''})`)
        .join('\n');
      return {
        text: `You have ${activeLoans.length} active borrower(s) with ${currencySymbol}${totalLent.toFixed(2)} total pending collection:\n\n${list}`,
      };
    }

    // 7. Wallet & Balance check
    if (p.includes('balance') || p.includes('wallet') || p.includes('cash') || p.includes('how much money')) {
      const breakdown = sortedWallets.map((w) => `• ${w.name}: ${currencySymbol}${w.balance.toFixed(2)}`).join('\n');
      return {
        text: `Your total liquid balance is ${currencySymbol}${totalLiquid.toFixed(2)}.\n\n${breakdown}`,
      };
    }

    // 8. Affordability check (e.g. "Can I afford dinner tonight?")
    if (p.includes('afford') || p.includes('dinner') || p.includes('outside')) {
      const remainingAllowance = todayNecessity.remaining;
      const safe = remainingAllowance >= 200 || totalLiquid >= 1000;
      return {
        text: safe
          ? `Yes, you can afford dinner tonight. You have ${currencySymbol}${remainingAllowance.toFixed(2)} remaining in today's daily allowance and ${currencySymbol}${totalLiquid.toFixed(2)} in total liquid balance.`
          : `Caution: Your remaining daily necessity allowance is ${currencySymbol}${remainingAllowance.toFixed(2)} (Total liquid: ${currencySymbol}${totalLiquid.toFixed(2)}). Consider keeping your meal within budget.`,
      };
    }

    // Default friendly answer
    return {
      text: `Hello ${profile.fullName || 'there'}. I am Nova, your financial advisor.
• Liquid Balance: ${currencySymbol}${totalLiquid.toFixed(2)}
• Today's Necessity Allowance: ${currencySymbol}${todayNecessity.remaining.toFixed(2)} remaining (${todayNecessity.isWorkDay ? 'Work/School' : 'Rest'} Day)
• Saved Today: ${currencySymbol}${savings.todaySaved.toFixed(2)} | Week: ${currencySymbol}${savings.weekSaved.toFixed(2)}

Ask me about your savings, daily allowance, who owes you money, or log expenses directly!`,
    };
  }
}
