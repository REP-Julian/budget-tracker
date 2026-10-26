import { supabase } from './supabase';
import { Wallet, Transaction, Loan, Asset, UserProfile } from '../types';

export const databaseApi = {
  async fetchRemoteWallets(): Promise<Wallet[] | null> {
    const { data, error } = await supabase.from('bt_wallets').select('*');
    if (error) {
      console.warn('Supabase fetch wallets error:', error.message);
      return null;
    }
    return (data || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      balance: Number(w.balance || 0),
      currency: w.currency || 'USD',
      icon: w.icon || 'wallet',
      updatedAt: w.updated_at || new Date().toISOString(),
    }));
  },

  async fetchRemoteTransactions(): Promise<Transaction[] | null> {
    const { data, error } = await supabase.from('bt_transactions').select('*').order('date', { ascending: false });
    if (error) {
      console.warn('Supabase fetch transactions error:', error.message);
      return null;
    }
    return (data || []).map((t: any) => ({
      id: t.id,
      walletId: t.wallet_id,
      type: t.type,
      amount: Number(t.amount || 0),
      category: t.category,
      isNecessity: Boolean(t.is_necessity),
      date: t.date,
      notes: t.notes || undefined,
      tax: Number(t.tax || 0),
      syncStatus: 'synced' as const,
    }));
  },

  async fetchRemoteLoans(): Promise<Loan[] | null> {
    const { data, error } = await supabase.from('bt_loans').select('*').order('lent_date', { ascending: false });
    if (error) {
      console.warn('Supabase fetch loans error:', error.message);
      return null;
    }
    return (data || []).map((l: any) => ({
      id: l.id,
      walletId: l.wallet_id,
      borrowerName: l.borrower_name,
      borrowerContact: l.borrower_contact || undefined,
      principalAmount: Number(l.principal_amount || 0),
      remainingAmount: Number(l.remaining_amount || 0),
      lentDate: l.lent_date,
      dueDate: l.due_date || undefined,
      status: l.status,
      notes: l.notes || undefined,
      repayments: [],
      syncStatus: 'synced' as const,
    }));
  },

  async fetchRemoteAssets(): Promise<Asset[] | null> {
    const { data, error } = await supabase.from('bt_assets').select('*');
    if (error) {
      console.warn('Supabase fetch assets error:', error.message);
      return null;
    }
    return (data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      assetClass: a.asset_class,
      value: Number(a.value || 0),
      acquisitionDate: a.acquisition_date || undefined,
      notes: a.notes || undefined,
      syncStatus: 'synced' as const,
    }));
  },

  async upsertRemoteWallet(wallet: Wallet): Promise<boolean> {
    const payload = {
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      balance: wallet.balance,
      currency: wallet.currency,
      icon: wallet.icon,
      updated_at: wallet.updatedAt || new Date().toISOString(),
    };
    const { error } = await supabase.from('bt_wallets').upsert(payload);
    if (error) {
      console.warn('Upsert wallet error:', error.message);
      return false;
    }
    return true;
  },

  async upsertRemoteTransaction(tx: Transaction): Promise<boolean> {
    const payload = {
      id: tx.id,
      wallet_id: tx.walletId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      is_necessity: tx.isNecessity,
      date: tx.date,
      notes: tx.notes || null,
      tax: tx.tax || 0,
    };
    const { error } = await supabase.from('bt_transactions').upsert(payload);
    if (error) {
      console.warn('Upsert transaction error:', error.message);
      return false;
    }
    return true;
  },

  async deleteRemoteTransaction(id: string): Promise<boolean> {
    const { error } = await supabase.from('bt_transactions').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete transaction error:', error.message);
      return false;
    }
    return true;
  },

  async upsertRemoteLoan(loan: Loan): Promise<boolean> {
    const payload = {
      id: loan.id,
      wallet_id: loan.walletId,
      borrower_name: loan.borrowerName,
      borrower_contact: loan.borrowerContact || null,
      principal_amount: loan.principalAmount,
      remaining_amount: loan.remainingAmount,
      lent_date: loan.lentDate,
      due_date: loan.dueDate || null,
      status: loan.status,
      notes: loan.notes || null,
    };
    const { error } = await supabase.from('bt_loans').upsert(payload);
    if (error) {
      console.warn('Upsert loan error:', error.message);
      return false;
    }
    return true;
  },

  async upsertRemoteAsset(asset: Asset): Promise<boolean> {
    const payload = {
      id: asset.id,
      name: asset.name,
      asset_class: asset.assetClass,
      value: asset.value,
      acquisition_date: asset.acquisitionDate || null,
      notes: asset.notes || null,
    };
    const { error } = await supabase.from('bt_assets').upsert(payload);
    if (error) {
      console.warn('Upsert asset error:', error.message);
      return false;
    }
    return true;
  },

  async upsertRemoteProfile(profile: UserProfile): Promise<boolean> {
    const { error } = await supabase.from('bt_profiles').upsert({
      id: profile.id,
      username: profile.username,
      full_name: profile.fullName,
      email: profile.email,
      contact_number: profile.contactNumber,
      role: profile.role,
      theme: profile.theme,
      currency: profile.currency,
      daily_necessity_cap: profile.dailyNecessityCap,
      updated_at: new Date().toISOString()
    });
    if (error) {
      console.warn('Upsert profile error:', error.message);
      return false;
    }
    return true;
  },

  async deleteRemoteLoan(id: string): Promise<boolean> {
    const { error } = await supabase.from('bt_loans').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete loan error:', error.message);
      return false;
    }
    return true;
  },

  async deleteRemoteAsset(id: string): Promise<boolean> {
    const { error } = await supabase.from('bt_assets').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete asset error:', error.message);
      return false;
    }
    return true;
  },

  async deleteRemoteWallet(id: string): Promise<boolean> {
    const { error } = await supabase.from('bt_wallets').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete wallet error:', error.message);
      return false;
    }
    return true;
  },

  async fetchRemoteProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.from('bt_profiles').select('*').eq('id', userId).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      username: data.username || '',
      fullName: data.full_name || '',
      email: data.email || '',
      contactNumber: data.contact_number || '',
      role: data.role || 'Primary Earner',
      theme: data.theme || 'dark',
      currency: data.currency || 'USD',
      dailyNecessityCap: Number(data.daily_necessity_cap || 60),
    };
  },
};
