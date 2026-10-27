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
    isNecessity?: boolean;
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

export interface ChatHistoryMessage {
  sender: 'user' | 'assistant';
  text: string;
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

      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.models)
        ? data.models
        : [];

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

      const getModelScore = (id: string) => {
        const lower = id.toLowerCase();
        if (lower.includes('llama-3.3-70b') || lower.includes('llama-3.1-70b')) return 100;
        if (lower.includes('llama-3.1-8b') || lower.includes('llama-3-8b')) return 90;
        if (lower.includes('deepseek-r1') || lower.includes('deepseek-v3')) return 80;
        if (lower.includes('gpt-4o-mini') || lower.includes('gpt-4o')) return 70;
        if (lower.includes('gemma2-9b')) return 60;
        if (lower.includes('mixtral')) return 50;
        if (lower.includes('allam')) return -50;
        return 0;
      };

      modelList.sort((a, b) => {
        const scoreA = getModelScore(a.id);
        const scoreB = getModelScore(b.id);
        if (scoreA !== scoreB) return scoreB - scoreA;
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
   * Build clean context prompt and send chat completion with multi-turn history
   */
  public static async generateResponse(
    userPrompt: string,
    context: AiFinancialContext,
    onToken?: (token: string) => void,
    chatHistory?: ChatHistoryMessage[]
  ): Promise<AssistantResponse> {
    const { profile, wallets, transactions, loans, assets = [], currencySymbol } = context;
    const { income, expense, net } = FinanceEngine.calculateMonthlyIncomeAndExpense(transactions);
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

    // 7. Recent Transactions (last 20)
    const recentTxs = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
    const recentTxLines = recentTxs.length > 0
      ? recentTxs
          .map((tx) => `• ${FinanceEngine.formatTransactionDateTime(tx.date)} | ${tx.type === 'expense' ? '-' : '+'}${currencySymbol}${tx.amount.toFixed(2)} | ${tx.category}${tx.notes ? ` ("${tx.notes}")` : ''} | ${tx.isNecessity ? 'Necessity' : 'Discretionary'}`)
          .join('\n')
      : '• No recent transactions.';

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });
    const categoryLines = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `• ${cat}: ${currencySymbol}${amt.toFixed(2)}`)
      .join('\n') || '• No expense categories recorded.';

    const systemPrompt = `You are Nova, an intelligent personal financial advisor and proactive companion inside Budget Tracker.
You specialize in student & earner budgeting, daily necessity allowance discipline, smart cash flow management, actionable saving tips, and loan receivable tracking.

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

=== SPENDING BY CATEGORY ===
${categoryLines}

=== RECENT TRANSACTIONS (LATEST 20) ===
${recentTxLines}

=== DIRECTIVES & BEHAVIOR ===
1. Deep Financial Understanding: You possess complete knowledge of the user's financial status. Answer queries accurately using real numbers from the context above.
2. Contextual Advice & Empathy: If user asks for advice or how to save, give specific, actionable steps based on their highest expense category and remaining allowance. Mention the discipline rule: unspent daily allowance should be moved to Savings Safe.
3. Multi-turn Memory: Reference earlier conversation context seamlessly.
4. Clean Formatting: Provide structured, concise, friendly answers. Use clean bullet points and bold numbers. Avoid markdown tables or ### headers.
5. Action Logging Rules:
- ONLY output an ACTION block if the user's CURRENT message explicitly commands you to record/log/spend/add a new transaction (e.g. "log 50 lunch", "pamasahe 20", "earned 500").
- If the user asks questions, asks for breakdowns, or asks for advice, NEVER output an ACTION block or mention action functions. Just reply conversationally.
- When logging, append the ACTION block on the very last line:
For expense: ACTION: {"action":"log_expense","amount":50,"category":"Transport","notes":"tricycle","walletId":"${sortedWallets[0]?.id || ''}","isNecessity":true}
For income: ACTION: {"action":"log_income","amount":500,"category":"Income","notes":"allowance","walletId":"${sortedWallets[0]?.id || ''}"}
6. Language: If the user speaks Tagalog/Taglish (e.g., "magkano nagastos ko", "tipid tips", "utang"), reply fluently in natural friendly English or warm Taglish.`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Build multi-turn messages array
    const historyPayload = (chatHistory || [])
      .slice(-10)
      .filter((m) => m.text && m.text.trim())
      .map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

    const requestBody = {
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyPayload,
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.35,
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
        const fallback = this.heuristicFallback(userPrompt, context);
        return {
          text: `(Note: Remote AI returned ${response.status}. Using Built-in Advisor)\n\n${fallback.text}`,
          action: fallback.action,
        };
      }

      if (onToken && response.body) {
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
        text: `(Offline Mode: Connected to Built-in Intelligence)\n\n${fallback.text}`,
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

    const actionMatch = rawText.match(/ACTION:\s*({[\s\S]*?})/);
    if (actionMatch && actionMatch[1]) {
      try {
        action = JSON.parse(actionMatch[1]);
      } catch {
        // Ignore JSON parse errors
      }
    }

    cleanText = rawText
      .replace(/ACTION:\s*{[\s\S]*?}/gi, '')
      .replace(/Log_expense\([^)]*\)/gi, '')
      .replace(/Log_income\([^)]*\)/gi, '')
      .replace(/```json[\s\S]*?```/gi, '')
      .trim();

    return {
      text: cleanText,
      action,
    };
  }

  /**
   * Supercharged zero-lag built-in financial intelligence engine.
   * Handles deep category breakdowns, income/expense logging, Tagalog & English queries,
   * debt & loan management, discipline advice, and daily necessity calculations.
   */
  public static heuristicFallback(
    prompt: string,
    context: AiFinancialContext
  ): AssistantResponse {
    const p = prompt.toLowerCase().trim();
    const { profile, wallets, transactions, loans, currencySymbol } = context;

    const sortedWallets = FinanceEngine.sortWallets(wallets);
    const totalLiquid = FinanceEngine.calculateTotalLiquidBalance(sortedWallets);
        const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'partial');
    const totalLent = activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    
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

    // Default primary wallet
    const primaryWallet = sortedWallets[0] || wallets[0];

    // ----------------------------------------------------
    // 1. SMART INCOME LOGGING (English & Tagalog)
    // e.g. "earned 1000", "income 500", "allowance 500", "baon 150", "sweldo 5000", "received 200"
    // ----------------------------------------------------
    const incomeMatch = prompt.match(/(?:income|earned|allowance|baon|sweldo|sahod|received|deposit)\s+(?:about\s+)?(?:[\$₱€£¥]\s*)?(\d+(?:\.\d{1,2})?)\s*(?:from|for)?\s*([a-zA-Z\s]+)?/i) ||
      prompt.match(/(?:[\$₱€£¥]\s*)?(\d+(?:\.\d{1,2})?)\s*(?:income|allowance|baon|sweldo|sahod)/i);

    if (incomeMatch) {
      const amount = parseFloat(incomeMatch[1]);
      const note = (incomeMatch[2] || 'Allowance / Income').trim();
      return {
        text: `✅ Added ${currencySymbol}${amount.toFixed(2)} income to **${primaryWallet?.name || 'Wallet'}**.\n\nYour updated liquid cash balance will be ${currencySymbol}${(totalLiquid + amount).toFixed(2)}.`,
        action: {
          action: 'log_income',
          amount,
          category: 'Income',
          notes: note,
          walletId: primaryWallet?.id,
        },
      };
    }

    // ----------------------------------------------------
    // 2. SMART EXPENSE LOGGING (English, Filipino, Slang)
    // Matches: "spent 50 tricycle", "pamasahe 20", "jeep 13", "tricycle 30", "lunch 120", "kain 60", "load 50"
    // ----------------------------------------------------
    let expenseAmount: number | null = null;
    let expenseItem = '';
    let expenseCategory = 'Shop';
    let isNecessity = true;

    // Pattern A: "spent/paid/bought/cost 50 on X" or "log 50 lunch"
    const expMatchA = prompt.match(/(?:spent|paid|log|bought|cost|nagastos|nagbayad|bumili|gastos)\s+(?:about\s+)?(?:[\$₱€£¥]\s*)?(\d+(?:\.\d{1,2})?)\s*(?:on|for|sa)?\s*([a-zA-Z\s]+)?/i);
    // Pattern B: "jeep 13", "tricycle 30", "pamasahe 20", "lunch 120", "kain 50"
    const expMatchB = prompt.match(/(jeep|trycicle|tricycle|trike|pamasahe|fare|transpo|food|lunch|dinner|breakfast|snack|meryenda|coffee|load|grocery|groceries|rent|tuition)\s+(?:[\$₱€£¥]\s*)?(\d+(?:\.\d{1,2})?)/i);
    // Pattern C: "50 pamasahe", "13 jeep", "150 lunch"
    const expMatchC = prompt.match(/(?:[\$₱€£¥]\s*)?(\d+(?:\.\d{1,2})?)\s+(?:sa\s+|for\s+)?(jeep|trycicle|tricycle|trike|pamasahe|fare|lunch|dinner|food|coffee|snack|load)/i);

    if (expMatchA && expMatchA[1]) {
      expenseAmount = parseFloat(expMatchA[1]);
      expenseItem = (expMatchA[2] || 'Expense').trim();
    } else if (expMatchB && expMatchB[2]) {
      expenseAmount = parseFloat(expMatchB[2]);
      expenseItem = expMatchB[1].trim();
    } else if (expMatchC && expMatchC[1]) {
      expenseAmount = parseFloat(expMatchC[1]);
      expenseItem = expMatchC[2].trim();
    }

    if (expenseAmount !== null && expenseAmount > 0) {
      const lowerItem = expenseItem.toLowerCase();
      if (/transport|fare|jeep|trycicle|tricycle|trike|pamasahe|grab|taxi|gas|mrt|lrt/i.test(lowerItem)) {
        expenseCategory = 'Transport';
        isNecessity = true;
      } else if (/food|lunch|dinner|breakfast|snack|meryenda|kain|coffee|rice|canteen/i.test(lowerItem)) {
        expenseCategory = 'Food';
        isNecessity = true;
      } else if (/rent|apartment|boarding|dorm/i.test(lowerItem)) {
        expenseCategory = 'Rent';
        isNecessity = true;
      } else if (/school|tuition|book|books|course|project|photocopy/i.test(lowerItem)) {
        expenseCategory = 'Education';
        isNecessity = true;
      } else if (/bill|bills|electric|water|internet|wifi|load/i.test(lowerItem)) {
        expenseCategory = 'Bills';
        isNecessity = true;
      } else {
        expenseCategory = 'Shop';
        isNecessity = false;
      }

      const formattedName = expenseItem.charAt(0).toUpperCase() + expenseItem.slice(1);
      const remainingAfter = Math.max(0, todayNecessity.remaining - expenseAmount);

      return {
        text: `✅ Logged ${currencySymbol}${expenseAmount.toFixed(2)} for **${formattedName}** (${expenseCategory}) from **${primaryWallet?.name || 'Cash'}**.\n\n• Type: ${isNecessity ? '🎒 Daily Necessity' : '✨ Discretionary (Want)'}\n• Remaining Today: ${currencySymbol}${remainingAfter.toFixed(2)} (${remainingAfter > 0 ? 'Within Budget' : '⚠️ Over Cap'})`,
        action: {
          action: 'log_expense',
          amount: expenseAmount,
          category: expenseCategory,
          notes: formattedName,
          walletId: primaryWallet?.id,
          isNecessity,
        },
      };
    }

    // ----------------------------------------------------
    // 3. SPENDING BREAKDOWN & WHERE MONEY WENT
    // e.g. "where did my money go", "spending breakdown", "saan napunta pera ko", "expenses"
    // ----------------------------------------------------
    if (
      p.includes('breakdown') ||
      p.includes('where did') ||
      p.includes('saan napunta') ||
      p.includes('category') ||
      p.includes('highest') ||
      p.includes('top expense')
    ) {
      const categoryTotals: Record<string, number> = {};
      let totalSpent = 0;
      let necessityTotal = 0;
      let discretionaryTotal = 0;

      transactions
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
          totalSpent += t.amount;
          if (t.isNecessity) {
            necessityTotal += t.amount;
          } else {
            discretionaryTotal += t.amount;
          }
        });

      if (totalSpent === 0) {
        return {
          text: `You have zero recorded expenses so far! Your total liquid cash remains intact at ${currencySymbol}${totalLiquid.toFixed(2)}.`,
        };
      }

      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      const topCat = sortedCategories[0];
      const necessityPercent = Math.round((necessityTotal / totalSpent) * 100);
      const discretionaryPercent = 100 - necessityPercent;

      const breakdownLines = sortedCategories
        .map(([cat, amt]) => {
          const pct = Math.round((amt / totalSpent) * 100);
          return `• **${cat}**: ${currencySymbol}${amt.toFixed(2)} (${pct}%)`;
        })
        .join('\n');

      return {
        text: `📊 **Spending Breakdown (Total: ${currencySymbol}${totalSpent.toFixed(2)})**:
${breakdownLines}

💡 **Analysis**:
• **Top Expense**: ${topCat[0]} (${currencySymbol}${topCat[1].toFixed(2)})
• **Needs vs Wants**: ${necessityPercent}% Necessities / ${discretionaryPercent}% Wants
${necessityPercent >= 70 ? '🎯 Great discipline! You are prioritizing necessities.' : '⚠️ Warning: Over 30% spent on wants. Consider tightening non-essentials.'}`,
      };
    }

    // ----------------------------------------------------
    // 4. ACTIONABLE SAVING TIPS & FINANCIAL COACHING
    // e.g. "tips", "how to save", "paano makatipid", "advice", "budget plan"
    // ----------------------------------------------------
    if (
      p.includes('tip') ||
      p.includes('advice') ||
      p.includes('makatipid') ||
      p.includes('save money') ||
      p.includes('paano mag-ipon') ||
      p.includes('help me save')
    ) {
      const topTip = todayNecessity.isOverBudget
        ? `⚠️ Today you exceeded your cap by ${currencySymbol}${(todayNecessity.spentToday - todayNecessity.dailyCap).toFixed(2)}. For dinner, choose a home meal or budget alternative to recover.`
        : `✅ You have ${currencySymbol}${todayNecessity.remaining.toFixed(2)} remaining today. If unspent by bedtime, transfer it into your **Savings Safe**!`;

      return {
        text: `💡 **Actionable Smart Financial Tips for You**:

1. **Daily Allowance Rule**: ${topTip}
2. **Weekly Momentum**: You've saved **${currencySymbol}${savings.weekSaved.toFixed(2)}** in the past 7 days. Consistency over 30 days yields **${currencySymbol}${(savings.weekSaved * 4.3).toFixed(2)}** in reserve!
3. **Transport Optimization**: Commuting via Jeep/Tricycle adds up. Keeping exact change or bundling trips cuts unexpected fare leakage.
4. **Loan Collection**: You have **${currencySymbol}${totalLent.toFixed(2)}** in money lent out. Follow up with borrowers before their due dates to replenish cash.

Ask me "can I afford dinner?" or "log 50 lunch" anytime!`,
      };
    }

    // ----------------------------------------------------
    // 5. SAVINGS DISCIPLINE QUERIES (Today / Week / Month)
    // ----------------------------------------------------
    if (p.includes('sav') || p.includes('ipon') || p.includes('saved')) {
      return {
        text: `💰 **Daily Necessity Savings Progress**:
• **Today's Unspent Cap**: ${currencySymbol}${savings.todaySaved.toFixed(2)}
• **Past 7 Days (Week)**: ${currencySymbol}${savings.weekSaved.toFixed(2)}
• **Past 30 Days (Month)**: ${currencySymbol}${savings.monthSaved.toFixed(2)}

🎯 **Pro-Tip**: Move this unspent daily allowance to your **Savings Safe** wallet so it doesn't get spent on wants.`,
      };
    }

    // ----------------------------------------------------
    // 6. DAILY NECESSITY & REMAINING ALLOWANCE STATUS
    // ----------------------------------------------------
    if (
      p.includes('necessity') ||
      p.includes('allowance') ||
      p.includes('cap') ||
      p.includes('natitira') ||
      p.includes('magkano pwede') ||
      (p.includes('today') && (p.includes('spend') || p.includes('budget') || p.includes('status') || p.includes('left')))
    ) {
      const budgetStatus = todayNecessity.isOverBudget
        ? `⚠️ Over budget by ${currencySymbol}${(todayNecessity.spentToday - todayNecessity.dailyCap).toFixed(2)}`
        : `✅ Within budget (${currencySymbol}${todayNecessity.remaining.toFixed(2)} remaining)`;

      return {
        text: `🎒 **Daily Necessity Status (${todayDayName})**:
• Schedule: **${todayNecessity.isWorkDay ? 'Work/School Day' : 'Rest Day'}**
• Daily Cap: **${currencySymbol}${todayNecessity.dailyCap.toFixed(2)}**
• Spent Today: **${currencySymbol}${todayNecessity.spentToday.toFixed(2)}** (${todayNecessity.percentage}%)
• Remaining Allowance: **${currencySymbol}${todayNecessity.remaining.toFixed(2)}**
• Status: ${budgetStatus}`,
      };
    }

    // ----------------------------------------------------
    // 7. WHO OWES ME MONEY / LOANS / RECEIVABLES
    // ----------------------------------------------------
    if (p.includes('owe') || p.includes('borrow') || p.includes('lent') || p.includes('loan') || p.includes('utang')) {
      if (activeLoans.length === 0) {
        return { text: '🤝 You currently have zero active receivables. No one owes you money right now.' };
      }
      const list = activeLoans
        .map((l) => `• **${l.borrowerName}**: ${currencySymbol}${l.remainingAmount.toFixed(2)} (Principal: ${currencySymbol}${l.principalAmount.toFixed(2)}${l.dueDate ? `, Due: ${l.dueDate}` : ''})`)
        .join('\n');
      return {
        text: `🤝 **Active Receivables (${activeLoans.length} borrowers)**:
Total outstanding to collect: **${currencySymbol}${totalLent.toFixed(2)}**

${list}`,
      };
    }

    // ----------------------------------------------------
    // 8. WALLET BALANCE CHECK
    // ----------------------------------------------------
    if (p.includes('balance') || p.includes('wallet') || p.includes('cash') || p.includes('pera') || p.includes('how much money')) {
      const breakdown = sortedWallets.map((w) => `• **${w.name}**: ${currencySymbol}${w.balance.toFixed(2)}`).join('\n');
      return {
        text: `💳 **Total Liquid Balance: ${currencySymbol}${totalLiquid.toFixed(2)}**\n\n${breakdown}`,
      };
    }

    // ----------------------------------------------------
    // 9. AFFORDABILITY CHECK
    // ----------------------------------------------------
    if (p.includes('afford') || p.includes('dinner') || p.includes('kakayanin') || p.includes('labas')) {
      const remaining = todayNecessity.remaining;
      const safe = remaining >= 100 || totalLiquid >= 500;
      return {
        text: safe
          ? `✅ **Yes, you can afford it.**\nYou have **${currencySymbol}${remaining.toFixed(2)}** remaining in today's allowance, and **${currencySymbol}${totalLiquid.toFixed(2)}** total liquid cash.`
          : `⚠️ **Proceed with caution.**\nYour remaining daily necessity allowance is **${currencySymbol}${remaining.toFixed(2)}**. Keep your meal affordable so you don't overspend today's cap.`,
      };
    }

    // ----------------------------------------------------
    // 10. DEFAULT INTELLIGENT GREETING & STATUS
    // ----------------------------------------------------
    return {
      text: `👋 Kumusta ${profile.fullName || 'there'}! I am Nova, your financial companion.

📊 **Quick Financial Snapshot**:
• Liquid Cash: **${currencySymbol}${totalLiquid.toFixed(2)}**
• Today's Allowance: **${currencySymbol}${todayNecessity.remaining.toFixed(2)}** left of **${currencySymbol}${todayNecessity.dailyCap.toFixed(2)}** (${todayDayName})
• 7-Day Savings: **${currencySymbol}${savings.weekSaved.toFixed(2)}** unspent allowance
• Receivables: **${currencySymbol}${totalLent.toFixed(2)}** (${activeLoans.length} borrowers)

💬 **Try asking me**:
• *"Where did my money go?"*
• *"Paano makatipid?"*
• *"Log 20 pamasahe"* or *"Earned 500 allowance"*
• *"Who owes me money?"*`,
    };
  }
}
