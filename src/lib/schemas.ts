import { z } from 'zod';

export const WalletSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Wallet name required'),
  type: z.enum(['cash', 'savings', 'emergency', 'vault', 'custom']),
  balance: z.number(),
  currency: z.string().default('USD'),
  icon: z.string().default('wallet'),
  updatedAt: z.string(),
});

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid('Valid wallet required'),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category required'),
  isNecessity: z.boolean().default(false),
  date: z.string(),
  notes: z.string().optional(),
  tax: z.number().default(0),
  syncStatus: z.enum(['synced', 'pending_insert', 'pending_update', 'pending_delete']).default('pending_insert'),
});

export const LoanRepaymentSchema = z.object({
  id: z.string().uuid(),
  loanId: z.string().uuid(),
  amount: z.number().positive('Repayment must be positive'),
  date: z.string(),
  destinationWalletId: z.string().uuid(),
  notes: z.string().optional(),
});

export const LoanSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  borrowerName: z.string().min(1, 'Borrower name required'),
  borrowerContact: z.string().optional(),
  principalAmount: z.number().positive('Principal must be positive'),
  remainingAmount: z.number().nonnegative(),
  lentDate: z.string(),
  dueDate: z.string().optional(),
  status: z.enum(['active', 'partial', 'settled', 'defaulted']).default('active'),
  notes: z.string().optional(),
  repayments: z.array(LoanRepaymentSchema).default([]),
  syncStatus: z.enum(['synced', 'pending_insert', 'pending_update', 'pending_delete']).default('pending_insert'),
});

export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Asset name required'),
  assetClass: z.enum(['liquid', 'receivable', 'investment', 'crypto', 'physical']),
  value: z.number().nonnegative('Value must be non-negative'),
  acquisitionDate: z.string().optional(),
  notes: z.string().optional(),
  syncStatus: z.enum(['synced', 'pending_insert', 'pending_update', 'pending_delete']).default('pending_insert'),
});

export const ProfileSchema = z.object({
  id: z.string(),
  fullName: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email address'),
  contactNumber: z.string().min(1, 'Contact number required'),
  role: z.string().min(1, 'Role required'),
  theme: z.enum(['dark', 'light']).default('dark'),
  currency: z.string().default('USD'),
  dailyNecessityCap: z.number().positive('Daily cap must be positive').default(60),
});
