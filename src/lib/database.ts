import { supabase } from './supabase';
import { Wallet, Transaction, Loan, Asset, UserProfile } from '../types';

export const databaseApi = {
  async fetchRemoteWallets(): Promise<Wallet[] | null> {
    const { data, error } = await supabase.from('bt_wallets').select('*');
    if (error) {
      console.warn('Supabase fetch wallets error:', error.message);
      return null;
    }
    return data as Wallet[];
  },

  async upsertRemoteWallet(wallet: Wallet): Promise<boolean> {
    const { error } = await supabase.from('bt_wallets').upsert(wallet);
    return !error;
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
