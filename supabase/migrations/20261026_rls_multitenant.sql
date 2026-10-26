-- Multi-Tenant RLS Isolation for Budget Tracker
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ubtdybxvgdvgphgnspcp/sql/new

-- 1. Add user_id column with default auth.uid()
ALTER TABLE bt_wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE bt_transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE bt_loans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE bt_assets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE bt_loan_repayments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- 2. Associate existing records with Julian's account
UPDATE bt_wallets SET user_id = '01a3d1a8-4c27-4a7a-88e5-18fa464c7c9f' WHERE user_id IS NULL;
UPDATE bt_transactions SET user_id = '01a3d1a8-4c27-4a7a-88e5-18fa464c7c9f' WHERE user_id IS NULL;
UPDATE bt_loans SET user_id = '01a3d1a8-4c27-4a7a-88e5-18fa464c7c9f' WHERE user_id IS NULL;
UPDATE bt_assets SET user_id = '01a3d1a8-4c27-4a7a-88e5-18fa464c7c9f' WHERE user_id IS NULL;
UPDATE bt_loan_repayments SET user_id = '01a3d1a8-4c27-4a7a-88e5-18fa464c7c9f' WHERE user_id IS NULL;

-- 3. Replace public policies with strict per-user RLS policies
DROP POLICY IF EXISTS "Public access for bt_wallets" ON bt_wallets;
DROP POLICY IF EXISTS "Users can only access own wallets" ON bt_wallets;
CREATE POLICY "Users can only access own wallets" ON bt_wallets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public access for bt_transactions" ON bt_transactions;
DROP POLICY IF EXISTS "Users can only access own transactions" ON bt_transactions;
CREATE POLICY "Users can only access own transactions" ON bt_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public access for bt_loans" ON bt_loans;
DROP POLICY IF EXISTS "Users can only access own loans" ON bt_loans;
CREATE POLICY "Users can only access own loans" ON bt_loans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public access for bt_assets" ON bt_assets;
DROP POLICY IF EXISTS "Users can only access own assets" ON bt_assets;
CREATE POLICY "Users can only access own assets" ON bt_assets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public access for bt_loan_repayments" ON bt_loan_repayments;
DROP POLICY IF EXISTS "Users can only access own repayments" ON bt_loan_repayments;
CREATE POLICY "Users can only access own repayments" ON bt_loan_repayments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public access for bt_profiles" ON bt_profiles;
DROP POLICY IF EXISTS "Users can only access own profile" ON bt_profiles;
CREATE POLICY "Users can only access own profile" ON bt_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
