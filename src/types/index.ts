export type WalletType = 'cash' | 'savings' | 'emergency' | 'vault' | 'custom';

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
  icon: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  category: string;
  isNecessity: boolean; // Needs vs Wants
  date: string; // ISO string or timestamp format with date and time (e.g. '2026-10-26T21:15:00.000Z' or 'YYYY-MM-DDTHH:mm');
  notes?: string;
  tax: number;
  syncStatus: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  date: string; // ISO string or timestamp format with date and time (e.g. '2026-10-26T21:15:00.000Z' or 'YYYY-MM-DDTHH:mm');
  destinationWalletId: string;
  notes?: string;
}

export type LoanStatus = 'active' | 'partial' | 'settled' | 'defaulted';

export interface Loan {
  id: string;
  walletId: string; // Source wallet from which funds were lent
  borrowerName: string;
  borrowerContact?: string;
  principalAmount: number;
  remainingAmount: number;
  lentDate: string;
  dueDate?: string;
  status: LoanStatus;
  notes?: string;
  repayments: LoanRepayment[];
  syncStatus: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export type AssetClass = 'liquid' | 'receivable' | 'investment' | 'crypto' | 'physical';

export interface Asset {
  id: string;
  name: string;
  assetClass: AssetClass;
  value: number;
  acquisitionDate?: string;
  notes?: string;
  syncStatus: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  contactNumber: string;
  role: string;
  theme: 'dark' | 'light';
  currency: string;
  dailyNecessityCap: number; // legacy fallback or primary active day cap
  activeScheduleDays?: number[]; // [0 = Sun, 1 = Mon, ..., 6 = Sat]. Default: [1, 2, 4, 5, 6] (Mon, Tue, Thu, Fri, Sat)
  restDayNecessityCap?: number; // Off-day cap (e.g. 150)
  avatarUrl?: string; // Local base64 data URI (stored in local device storage only)
  aiBaseUrl?: string; // e.g. https://api.openai.com/v1 or https://openrouter.ai/api/v1
  aiApiKey?: string;
  aiModel?: string; // e.g. gpt-4o-mini, deepseek/deepseek-chat, or auto-detected free model
}

export interface SyncMutation {
  id: string;
  entity: 'wallets' | 'transactions' | 'loans' | 'repayments' | 'assets' | 'profile';
  action: 'insert' | 'update' | 'delete';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}
