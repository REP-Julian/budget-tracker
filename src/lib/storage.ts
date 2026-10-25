import { get, set } from 'idb-keyval';
import { Wallet, Transaction, Loan, Asset, UserProfile } from '../types';

const STORAGE_KEYS = {
  WALLETS: 'bt_wallets',
  TRANSACTIONS: 'bt_transactions',
  LOANS: 'bt_loans',
  ASSETS: 'bt_assets',
  PROFILE: 'bt_profile',
};

async function getItem<T>(key: string, fallbackDefault: T): Promise<T> {
  try {
    const val = await get<T>(key);
    if (val !== undefined && val !== null) return val;
  } catch (err) {
    console.warn(`IndexedDB read failed for ${key}, checking localStorage:`, err);
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`localStorage read failed for ${key}:`, e);
  }

  return fallbackDefault;
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value);
  } catch (err) {
    console.warn(`IndexedDB write failed for ${key}, falling back to localStorage:`, err);
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`localStorage write failed for ${key}:`, e);
  }
}

// Clean Initial State (No fake demo transactions or loans)
export const INITIAL_WALLETS: Wallet[] = [
  {
    id: 'w-cash-01',
    name: 'Cash & Pocket',
    type: 'cash',
    balance: 0.00,
    currency: 'PHP',
    icon: 'banknote',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-savings-02',
    name: 'Savings Safe',
    type: 'savings',
    balance: 0.00,
    currency: 'PHP',
    icon: 'vault',
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_LOANS: Loan[] = [];

export const INITIAL_ASSETS: Asset[] = [];

export const INITIAL_PROFILE: UserProfile = {
  id: 'usr-guest-01',
  username: '',
  fullName: '',
  email: '',
  contactNumber: '',
  role: 'Primary Earner',
  theme: 'dark',
  currency: 'PHP',
  dailyNecessityCap: 500.00,
  activeScheduleDays: [1, 2, 4, 5, 6], // Mon, Tue, Thu, Fri, Sat
  restDayNecessityCap: 150.00,
};

// Storage helper functions
export const storageService = {
  async getWallets(): Promise<Wallet[]> {
    return getItem<Wallet[]>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
  },
  async saveWallets(wallets: Wallet[]): Promise<void> {
    await setItem(STORAGE_KEYS.WALLETS, wallets);
  },
  async getTransactions(): Promise<Transaction[]> {
    return getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  },
  async saveTransactions(txs: Transaction[]): Promise<void> {
    await setItem(STORAGE_KEYS.TRANSACTIONS, txs);
  },
  async getLoans(): Promise<Loan[]> {
    return getItem<Loan[]>(STORAGE_KEYS.LOANS, INITIAL_LOANS);
  },
  async saveLoans(loans: Loan[]): Promise<void> {
    await setItem(STORAGE_KEYS.LOANS, loans);
  },
  async getAssets(): Promise<Asset[]> {
    return getItem<Asset[]>(STORAGE_KEYS.ASSETS, INITIAL_ASSETS);
  },
  async saveAssets(assets: Asset[]): Promise<void> {
    await setItem(STORAGE_KEYS.ASSETS, assets);
  },
  async getProfile(): Promise<UserProfile> {
    return getItem<UserProfile>(STORAGE_KEYS.PROFILE, INITIAL_PROFILE);
  },
  async saveProfile(profile: UserProfile): Promise<void> {
    await setItem(STORAGE_KEYS.PROFILE, profile);
  },
  async clearAllData(): Promise<void> {
    try {
      localStorage.clear();
      await setItem(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
      await setItem(STORAGE_KEYS.TRANSACTIONS, []);
      await setItem(STORAGE_KEYS.LOANS, []);
      await setItem(STORAGE_KEYS.ASSETS, []);
    } catch {
      // ignore
    }
  },
};
