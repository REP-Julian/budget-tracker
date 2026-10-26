import { Wallet, Transaction, Loan, Asset, LoanRepayment, UserProfile } from '../types';

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface DailySavingsRecord {
  date: string;
  isWorkDay: boolean;
  allowance: number;
  spent: number;
  saved: number;
}

export interface SavingsHistoryResult {
  todaySaved: number;
  weekSaved: number;
  monthSaved: number;
  records: DailySavingsRecord[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#00E5FF',        // Cyan
  Education: '#E8F953',   // Lime Yellow
  Transport: '#F43F5E',   // Pink
  Shop: '#A855F7',        // Purple
  Food: '#FB923C',        // Orange
  Health: '#10B981',      // Emerald Green
  Bills: '#38BDF8',       // Sky Blue
  Other: '#94A3B8',       // Slate
};

export class FinanceEngine {
  /**
   * Sorts wallets in a strict deterministic order:
   * 1. 'w-cash-01' or type === 'cash' first (index 0)
   * 2. 'w-savings-02' or type === 'savings' second (index 1)
   * 3. Any other wallets sorted deterministically by name or id
   */
  public static sortWallets(wallets: Wallet[]): Wallet[] {
    return [...wallets].sort((a, b) => {
      const isCashA = a.id === 'w-cash-01' || a.type === 'cash';
      const isCashB = b.id === 'w-cash-01' || b.type === 'cash';
      if (isCashA && !isCashB) return -1;
      if (!isCashA && isCashB) return 1;
      if (isCashA && isCashB) {
        if (a.id === 'w-cash-01' && b.id !== 'w-cash-01') return -1;
        if (a.id !== 'w-cash-01' && b.id === 'w-cash-01') return 1;
        return a.id.localeCompare(b.id);
      }

      const isSavingsA = a.id === 'w-savings-02' || a.type === 'savings';
      const isSavingsB = b.id === 'w-savings-02' || b.type === 'savings';
      if (isSavingsA && !isSavingsB) return -1;
      if (!isSavingsA && isSavingsB) return 1;
      if (isSavingsA && isSavingsB) {
        if (a.id === 'w-savings-02' && b.id !== 'w-savings-02') return -1;
        if (a.id !== 'w-savings-02' && b.id === 'w-savings-02') return 1;
        return a.id.localeCompare(b.id);
      }

      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
  }

  /**
   * Formats ISO date or datetime string to a human-readable format:
   * e.g. "Oct 26, 2026 • 9:15 PM"
   */
  public static formatTransactionDateTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const datePart = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timePart = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${datePart} • ${timePart}`;
    } catch {
      return dateStr;
    }
  }

  /**
   * Sums all liquid wallet balances
   */
  public static calculateTotalLiquidBalance(wallets: Wallet[]): number {
    return wallets.reduce((acc, w) => acc + w.balance, 0);
  }

  /**
   * Calculates monthly income and expenses.
   * STRICT SEPARATION: Money lent is an asset receivable and is never included here.
   */
  public static calculateMonthlyIncomeAndExpense(transactions: Transaction[], targetYearMonth?: string) {
    const ym = targetYearMonth || new Date().toISOString().slice(0, 7);

    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      if (tx.date.startsWith(ym)) {
        if (tx.type === 'income') {
          income += tx.amount;
        } else if (tx.type === 'expense') {
          expense += tx.amount;
        }
      }
    }

    return { income, expense, net: income - expense };
  }

  /**
   * Calculates category distribution for expenses
   */
  public static calculateCategoryBreakdown(transactions: Transaction[], targetYearMonth?: string): CategorySummary[] {
    const ym = targetYearMonth || new Date().toISOString().slice(0, 7);
    const catMap: Record<string, { amount: number; count: number }> = {};
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date.startsWith(ym)) {
        totalExpense += tx.amount;
        if (!catMap[tx.category]) {
          catMap[tx.category] = { amount: 0, count: 0 };
        }
        catMap[tx.category].amount += tx.amount;
        catMap[tx.category].count += 1;
      }
    }

    if (totalExpense === 0) return [];

    return Object.entries(catMap)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: Math.round((data.amount / totalExpense) * 100),
        color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Calculates daily necessity spend and remaining allowance with schedule awareness
   */
  public static calculateDailyNecessitySpend(
    transactions: Transaction[],
    dateStr: string = new Date().toISOString().slice(0, 10),
    dailyCap: number = 500,
    activeDays: number[] = [1, 2, 4, 5, 6], // default Mon, Tue, Thu, Fri, Sat
    restCap?: number
  ) {
    let spentToday = 0;

    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.isNecessity) {
        let matches = tx.date.startsWith(dateStr);
        if (!matches) {
          try {
            const d = new Date(tx.date);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              matches = `${y}-${m}-${day}` === dateStr;
            }
          } catch {
            // ignore
          }
        }
        if (matches) {
          spentToday += tx.amount;
        }
      }
    }

    // Determine if dateStr is active work/school day or rest day
    const dayOfWeek = new Date(dateStr).getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const isWorkDay = activeDays.includes(dayOfWeek);
    // If restCap was not explicitly specified or configured, default to dailyCap
    const effectiveCap = isWorkDay || restCap === undefined ? dailyCap : restCap;

    const remaining = Math.max(0, effectiveCap - spentToday);
    const percentage = effectiveCap > 0 ? Math.min(100, Math.round((spentToday / effectiveCap) * 100)) : 100;

    return {
      spentToday,
      dailyCap: effectiveCap,
      remaining,
      percentage,
      isOverBudget: spentToday > effectiveCap,
      isWorkDay,
      dayOfWeek,
    };
  }

  /**
   * Calculates savings history based on the daily necessity schedule:
   * For each day in the past window (today, last 7 days / week, or past 30 days / month):
   * - Active work/school day cap vs rest day cap
   * - Saved for day = Math.max(0, allowance - spent)
   * Returns todaySaved, weekSaved (past 7 days), monthSaved (past 30 days)
   */
  public static calculateSavingsHistory(
    transactions: Transaction[],
    profile: UserProfile,
    daysCount: number = 30
  ): SavingsHistoryResult {
    const activeDays = profile.activeScheduleDays && profile.activeScheduleDays.length > 0
      ? profile.activeScheduleDays
      : [1, 2, 4, 5, 6];
    const workCap = profile.dailyNecessityCap || 500;
    const restCap = profile.restDayNecessityCap !== undefined ? profile.restDayNecessityCap : 150;

    const records: DailySavingsRecord[] = [];
    const now = new Date();

    for (let i = 0; i < daysCount; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayOfWeek = targetDate.getDay();
      const isWorkDay = activeDays.includes(dayOfWeek);
      const allowance = isWorkDay ? workCap : restCap;

      let spent = 0;
      for (const tx of transactions) {
        if (tx.type === 'expense' && tx.isNecessity) {
          let matches = tx.date.startsWith(dateStr);
          if (!matches) {
            try {
              const txDate = new Date(tx.date);
              if (!isNaN(txDate.getTime())) {
                const txYear = txDate.getFullYear();
                const txMonth = String(txDate.getMonth() + 1).padStart(2, '0');
                const txDay = String(txDate.getDate()).padStart(2, '0');
                matches = `${txYear}-${txMonth}-${txDay}` === dateStr;
              }
            } catch {
              // ignore
            }
          }
          if (matches) {
            spent += tx.amount;
          }
        }
      }

      const saved = Math.max(0, allowance - spent);

      records.push({
        date: dateStr,
        isWorkDay,
        allowance,
        spent,
        saved,
      });
    }

    const todaySaved = records.length > 0 ? records[0].saved : 0;
    const weekSaved = records.slice(0, 7).reduce((acc, r) => acc + r.saved, 0);
    const monthSaved = records.slice(0, 30).reduce((acc, r) => acc + r.saved, 0);

    return {
      todaySaved,
      weekSaved,
      monthSaved,
      records,
    };
  }

  /**
   * Calculates total money lent out currently active/receivable
   */
  public static calculateTotalMoneyLent(loans: Loan[]): number {
    return loans.reduce((acc, l) => {
      if (l.status !== 'settled' && l.status !== 'defaulted') {
        return acc + l.remainingAmount;
      }
      return acc;
    }, 0);
  }

  /**
   * Calculates Total Net Worth = Liquid Wallets + Active Loans Receivable + Other Assets
   */
  public static calculateNetWorth(wallets: Wallet[], loans: Loan[], assets: Asset[]): number {
    const liquidTotal = this.calculateTotalLiquidBalance(wallets);
    const receivablesTotal = this.calculateTotalMoneyLent(loans);
    const otherAssetsTotal = assets.reduce((acc, a) => acc + a.value, 0);

    return liquidTotal + receivablesTotal + otherAssetsTotal;
  }

  /**
   * Business Logic: Lend Money out to someone.
   * Reduces source wallet balance.
   * Creates Loan receivable.
   * DOES NOT count as personal expense!
   */
  public static lendMoney(
    wallets: Wallet[],
    sourceWalletId: string,
    borrowerName: string,
    amount: number,
    borrowerContact?: string,
    dueDate?: string,
    notes?: string
  ): { updatedWallets: Wallet[]; newLoan: Loan } {
    const sourceWallet = wallets.find((w) => w.id === sourceWalletId);
    if (!sourceWallet) throw new Error('Source wallet not found');
    if (sourceWallet.balance < amount) throw new Error('Insufficient wallet balance to lend');

    const updatedWallets = wallets.map((w) =>
      w.id === sourceWalletId
        ? { ...w, balance: Number((w.balance - amount).toFixed(2)), updatedAt: new Date().toISOString() }
        : w
    );

    const newLoan: Loan = {
      id: crypto.randomUUID ? crypto.randomUUID() : `loan-${Date.now()}`,
      walletId: sourceWalletId,
      borrowerName,
      borrowerContact,
      principalAmount: amount,
      remainingAmount: amount,
      lentDate: new Date().toISOString(),
      dueDate,
      status: 'active',
      notes,
      repayments: [],
      syncStatus: 'pending_insert',
    };

    return { updatedWallets, newLoan };
  }

  /**
   * Business Logic: Process loan repayment.
   * Adds repayment funds to destination wallet.
   * Reduces loan remaining balance.
   * DOES NOT count as income!
   */
  public static processRepayment(
    wallets: Wallet[],
    loan: Loan,
    amount: number,
    destinationWalletId: string,
    notes?: string
  ): { updatedWallets: Wallet[]; updatedLoan: Loan } {
    if (amount <= 0) throw new Error('Repayment must be positive');
    if (amount > loan.remainingAmount) throw new Error('Repayment exceeds outstanding loan balance');

    const updatedWallets = wallets.map((w) =>
      w.id === destinationWalletId
        ? { ...w, balance: Number((w.balance + amount).toFixed(2)), updatedAt: new Date().toISOString() }
        : w
    );

    const newRemaining = Number((loan.remainingAmount - amount).toFixed(2));
    const repaymentRecord: LoanRepayment = {
      id: crypto.randomUUID ? crypto.randomUUID() : `rep-${Date.now()}`,
      loanId: loan.id,
      amount,
      date: new Date().toISOString(),
      destinationWalletId,
      notes,
    };

    const updatedLoan: Loan = {
      ...loan,
      remainingAmount: newRemaining,
      status: newRemaining === 0 ? 'settled' : 'partial',
      repayments: [...loan.repayments, repaymentRecord],
      syncStatus: 'pending_update',
    };

    return { updatedWallets, updatedLoan };
  }
}
