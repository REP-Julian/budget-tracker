-- Budget Tracker Database Schema with Row Level Security (RLS)

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_number TEXT,
  role TEXT DEFAULT 'Primary Earner',
  theme TEXT DEFAULT 'dark',
  currency TEXT DEFAULT 'USD',
  daily_necessity_cap NUMERIC DEFAULT 60.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  icon TEXT DEFAULT 'wallet',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wallets" ON wallets
  FOR ALL USING (auth.uid() = user_id);

-- Transactions (Personal Expenses & Income)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  is_necessity BOOLEAN DEFAULT false,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  tax NUMERIC DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Loans (Money Lent - strictly separated from expenses)
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  borrower_name TEXT NOT NULL,
  borrower_contact TEXT,
  principal_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  lent_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partial', 'settled', 'defaulted')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own loans" ON loans
  FOR ALL USING (auth.uid() = user_id);

-- Loan Repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  destination_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  notes TEXT
);

ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage loan repayments" ON loan_repayments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM loans WHERE loans.id = loan_repayments.loan_id AND loans.user_id = auth.uid())
  );

-- Assets & Net Worth
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('liquid', 'receivable', 'investment', 'crypto', 'physical')),
  value NUMERIC NOT NULL DEFAULT 0.00,
  acquisition_date DATE,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own assets" ON assets
  FOR ALL USING (auth.uid() = user_id);
