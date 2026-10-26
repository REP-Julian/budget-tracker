import React, { useState, useEffect } from 'react';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { StatisticsScreen } from './components/stats/StatisticsScreen';
import { LoanLedgerScreen } from './components/loans/LoanLedgerScreen';
import { AssetsScreen } from './components/assets/AssetsScreen';
import { AiAssistantScreen, AiMessage } from './components/ai/AiAssistantScreen';
import { ProfileSettingsScreen } from './components/profile/ProfileSettingsScreen';
import { ProfileHeaderChip } from './components/profile/ProfileHeaderChip';
import { FloatingDock, ScreenTab } from './components/navigation/FloatingDock';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { AddLoanModal } from './components/loans/AddLoanModal';
import { AuthModal } from './components/auth/AuthModal';
import { SearchModal } from './components/modals/SearchModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { supabase } from './lib/supabase';
import { databaseApi } from './lib/database';
import { storageService, INITIAL_WALLETS, INITIAL_TRANSACTIONS, INITIAL_LOANS, INITIAL_ASSETS, INITIAL_PROFILE } from './lib/storage';
import { Wallet, Transaction, Loan, Asset, UserProfile, TransactionType, AssetClass } from './types';
import { FinanceEngine } from './services/financeEngine';
import { OfflineQueueManager } from './lib/offlineQueue';
import { SyncService } from './services/syncService';
import { useTheme } from './context/ThemeContext';
import { PullToRefresh } from './components/navigation/PullToRefresh';
import { getCurrencySymbol } from './lib/currencies';
import './styles/theme.css';
import './styles/navigation.css';

export const App: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [currentTab, setCurrentTab] = useState<ScreenTab>('home');
  const [wallets, setWallets] = useState<Wallet[]>(() => FinanceEngine.sortWallets(INITIAL_WALLETS));
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense');
  const [isLendModalOpen, setIsLendModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // In-memory volatile AI messages (persists while app runs; reset when app closes)
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      text: 'Hello. I am Nova, your AI Financial Advisor. How can I assist you with your budget or spending today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Load from IndexedDB and listen for Supabase auth state on startup
  useEffect(() => {
    async function loadData() {
      const [w, t, l, a, p, qCount] = await Promise.all([
        storageService.getWallets(),
        storageService.getTransactions(),
        storageService.getLoans(),
        storageService.getAssets(),
        storageService.getProfile(),
        OfflineQueueManager.getPendingCount(),
      ]);

      // Check current auth session
      const { data: { session } } = await supabase.auth.getSession();
      let effectiveProfile = p;

      let activeWallets = w;
      let activeTransactions = t;
      let activeLoans = l;
      let activeAssets = a;

      if (session?.user) {
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
        const [remoteProfile, rWallets, rTransactions, rLoans, rAssets] = await Promise.all([
          databaseApi.fetchRemoteProfile(session.user.id),
          databaseApi.fetchRemoteWallets(),
          databaseApi.fetchRemoteTransactions(),
          databaseApi.fetchRemoteLoans(),
          databaseApi.fetchRemoteAssets(),
        ]);
        const meta = session.user.user_metadata || {};
        const googleAvatar = meta.avatar_url || meta.picture;
        const googleName = meta.full_name || meta.name;

        if (remoteProfile) {
          effectiveProfile = {
            ...p,
            ...remoteProfile,
            fullName: remoteProfile.fullName || googleName || p.fullName || 'User',
            avatarUrl: remoteProfile.avatarUrl || googleAvatar || p.avatarUrl || undefined,
            aiBaseUrl: p.aiBaseUrl,
            aiApiKey: p.aiApiKey,
            aiModel: p.aiModel,
            activeScheduleDays: p.activeScheduleDays,
            restDayNecessityCap: p.restDayNecessityCap,
          };
          await storageService.saveProfile(effectiveProfile);
        }

        if (rWallets && rWallets.length > 0) {
          activeWallets = FinanceEngine.sortWallets(rWallets);
          await storageService.saveWallets(activeWallets);
        }
        if (rTransactions) {
          activeTransactions = rTransactions;
          await storageService.saveTransactions(rTransactions);
        }
        if (rLoans) {
          activeLoans = rLoans;
          await storageService.saveLoans(rLoans);
        }
        if (rAssets) {
          activeAssets = rAssets;
          await storageService.saveAssets(rAssets);
        }
      } else {
        // Not authenticated in Supabase - reset if profile still held an authenticated email
        if (effectiveProfile.email) {
          effectiveProfile = {
            ...INITIAL_PROFILE,
            theme: effectiveProfile.theme || 'dark',
            currency: effectiveProfile.currency || 'PHP',
            aiBaseUrl: p.aiBaseUrl,
            aiApiKey: p.aiApiKey,
            aiModel: p.aiModel,
          };
          await storageService.saveProfile(effectiveProfile);
        }
      }

      setWallets(FinanceEngine.sortWallets(activeWallets));
      setTransactions(activeTransactions);
      setLoans(activeLoans);
      setAssets(activeAssets);
      setProfile(effectiveProfile);
      if (effectiveProfile.theme && effectiveProfile.theme !== theme) {
        setTheme(effectiveProfile.theme);
      }
      setPendingSyncCount(qCount);
    }
    loadData();

    const onUserAuthenticated = async (user: { id: string; email?: string; user_metadata?: Record<string, any> }) => {
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      let remote = await databaseApi.fetchRemoteProfile(user.id);
      const meta = user.user_metadata || {};
      const googleName = meta.full_name || meta.name || user.email?.split('@')[0] || 'User';
      const googleAvatar = meta.avatar_url || meta.picture;
      const googleUsername = meta.user_name || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
      const localProfile = await storageService.getProfile();

      if (!remote) {
        remote = {
          id: user.id,
          username: googleUsername,
          fullName: googleName,
          email: user.email || '',
          contactNumber: meta.contact_number || '',
          role: meta.role || 'Primary Earner',
          theme: localProfile.theme || 'dark',
          currency: localProfile.currency || 'PHP',
          dailyNecessityCap: localProfile.dailyNecessityCap || 500,
          activeScheduleDays: localProfile.activeScheduleDays || [1, 2, 4, 5, 6],
          restDayNecessityCap: localProfile.restDayNecessityCap !== undefined ? localProfile.restDayNecessityCap : 150,
          avatarUrl: googleAvatar || localProfile.avatarUrl || undefined,
          aiBaseUrl: localProfile.aiBaseUrl,
          aiApiKey: localProfile.aiApiKey,
          aiModel: localProfile.aiModel,
        };
        await databaseApi.upsertRemoteProfile(remote);
      } else {
        // Adapt Google account fields and preserve locally configured AI settings
        remote = {
          ...remote,
          fullName: remote.fullName || googleName,
          email: remote.email || user.email || '',
          avatarUrl: remote.avatarUrl || googleAvatar || localProfile.avatarUrl || undefined,
          aiBaseUrl: localProfile.aiBaseUrl,
          aiApiKey: localProfile.aiApiKey,
          aiModel: localProfile.aiModel,
          activeScheduleDays: localProfile.activeScheduleDays || [1, 2, 4, 5, 6],
          restDayNecessityCap: localProfile.restDayNecessityCap !== undefined ? localProfile.restDayNecessityCap : 150,
        };
      }
      // 1. Process any pending offline mutations first
      try {
        await SyncService.processOfflineQueue();
      } catch (err) {
        console.warn('Sync queue error:', err);
      }

      // 2. Fetch remote records
      const [rWallets, rTransactions, rLoans, rAssets] = await Promise.all([
        databaseApi.fetchRemoteWallets(),
        databaseApi.fetchRemoteTransactions(),
        databaseApi.fetchRemoteLoans(),
        databaseApi.fetchRemoteAssets(),
      ]);

      // 3. New user check: if cloud has no transactions/loans yet, migrate local guest entries to cloud!
      const isCloudEmpty = (!rTransactions || rTransactions.length === 0) && (!rLoans || rLoans.length === 0);
      if (isCloudEmpty) {
        await SyncService.migrateGuestToCloud();
      } else {
        // Existing user: hydrate from cloud snapshot
        if (rWallets && rWallets.length > 0) {
          const sorted = FinanceEngine.sortWallets(rWallets);
          setWallets(sorted);
          await storageService.saveWallets(sorted);
        }
        if (rTransactions) {
          setTransactions(rTransactions);
          await storageService.saveTransactions(rTransactions);
        }
        if (rLoans) {
          setLoans(rLoans);
          await storageService.saveLoans(rLoans);
        }
        if (rAssets) {
          setAssets(rAssets);
          await storageService.saveAssets(rAssets);
        }
      }

      setProfile(remote);
      await storageService.saveProfile(remote);
      setIsAuthModalOpen(false);
    };

    // Listen to Supabase auth changes (e.g. OAuth redirect or signup)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && session?.user) {
        await onUserAuthenticated(session.user);
      } else if (event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        // Clear Supabase session keys from localStorage
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // ignore
        }
        // Clear all state and device storage so previous user's data does not linger
        setProfile(INITIAL_PROFILE);
        setWallets(FinanceEngine.sortWallets(INITIAL_WALLETS));
        setTransactions([]);
        setLoans([]);
        setAssets([]);
        await storageService.clearAllData();
        await OfflineQueueManager.clearQueue();
        setPendingSyncCount(0);
      }
    });

    // Setup periodic background sync
    const interval = setInterval(() => {
      SyncService.processOfflineQueue().then(() => {
        OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
      });
    }, 15000);

    const processAuthDeepLink = async (urlStr: string) => {
      if (!urlStr || (!urlStr.includes('access_token') && !urlStr.includes('code='))) {
        return;
      }
      try {
        const hashPart = urlStr.includes('#') ? urlStr.split('#')[1] : '';
        const searchPart = urlStr.includes('?') ? urlStr.split('?')[1].split('#')[0] : '';
        const hashParams = new URLSearchParams(hashPart);
        const searchParams = new URLSearchParams(searchPart);

        // 1. If PKCE code returned
        const code = searchParams.get('code') || hashParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session?.user) {
            await onUserAuthenticated(data.session.user);
            return;
          }
        }

        // 2. If implicit fragment (#access_token=...&refresh_token=...) returned
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data?.user) {
            await onUserAuthenticated(data.user);
            return;
          }
        }
      } catch (err) {
        console.warn('OAuth deep link exchange error:', err);
      }
    };

    // Deep link listener for OAuth return from default browser
    let unlistenDeepLink: (() => void) | undefined;
    const isTauriApp = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || Boolean((window as any).isTauri));
    if (isTauriApp) {
      // Check if started directly via deep link
      getCurrent().then((urls) => {
        if (urls && urls.length > 0) {
          for (const u of urls) {
            processAuthDeepLink(u);
          }
        }
      }).catch(console.warn);

      // Listen for incoming deep links while running
      onOpenUrl(async (urls) => {
        for (const urlStr of urls) {
          await processAuthDeepLink(urlStr);
        }
      }).then((unlisten) => {
        unlistenDeepLink = unlisten;
      }).catch(console.warn);
    }

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
      if (unlistenDeepLink) unlistenDeepLink();
    };
  }, []);

  // Handlers for transactions
  const handleAddTransaction = async (data: {
    walletId: string;
    type: TransactionType;
    amount: number;
    category: string;
    isNecessity: boolean;
    date?: string;
    notes?: string;
  }) => {
    const txDate = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
    const newTx: Transaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
      walletId: data.walletId,
      type: data.type,
      amount: data.amount,
      category: data.category,
      isNecessity: data.isNecessity,
      date: txDate,
      notes: data.notes,
      tax: 0,
      syncStatus: 'pending_insert',
    };

    // Update wallet balance
    const updatedWallets = FinanceEngine.sortWallets(wallets.map((w) => {
      if (w.id === data.walletId) {
        const delta = data.type === 'income' ? data.amount : -data.amount;
        return {
          ...w,
          balance: Number((w.balance + delta).toFixed(2)),
          updatedAt: new Date().toISOString(),
        };
      }
      return w;
    }));

    // Deduplicate transaction insertion
    const updatedTxs = [newTx, ...transactions.filter((t) => t.id !== newTx.id)];

    setWallets(updatedWallets);
    setTransactions(updatedTxs);

    await storageService.saveWallets(updatedWallets);
    await storageService.saveTransactions(updatedTxs);
    await OfflineQueueManager.enqueue('transactions', 'insert', newTx);
    const changedWallet = updatedWallets.find(w => w.id === data.walletId);
    if (changedWallet) {
      await OfflineQueueManager.enqueue('wallets', 'update', changedWallet);
    }
    SyncService.processOfflineQueue().then(() => {
      OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
    });
  };

  // Handler for deleting a transaction and reversing wallet balance
  const handleDeleteTransaction = async (id: string) => {
    const targetTx = transactions.find((t) => t.id === id);
    if (!targetTx) return;

    // Reverse wallet balance change
    const updatedWallets = FinanceEngine.sortWallets(wallets.map((w) => {
      if (w.id === targetTx.walletId) {
        // If it was expense, money comes back (+)
        // If it was income, money is removed (-)
        const reversalDelta = targetTx.type === 'expense' ? targetTx.amount : -targetTx.amount;
        return {
          ...w,
          balance: Number((w.balance + reversalDelta).toFixed(2)),
          updatedAt: new Date().toISOString(),
        };
      }
      return w;
    }));

    const updatedTxs = transactions.filter((t) => t.id !== id);

    setWallets(updatedWallets);
    setTransactions(updatedTxs);

    await storageService.saveWallets(updatedWallets);
    await storageService.saveTransactions(updatedTxs);
    await OfflineQueueManager.enqueue('transactions', 'delete', { id });
    const changedWallet = updatedWallets.find(w => w.id === targetTx.walletId);
    if (changedWallet) {
      await OfflineQueueManager.enqueue('wallets', 'update', changedWallet);
    }
    SyncService.processOfflineQueue().then(() => {
      OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
    });
  };

  // Handlers for lending money
  const handleLendMoney = async (data: {
    sourceWalletId: string;
    borrowerName: string;
    amount: number;
    borrowerContact?: string;
    dueDate?: string;
    notes?: string;
  }) => {
    const { updatedWallets, newLoan } = FinanceEngine.lendMoney(
      wallets,
      data.sourceWalletId,
      data.borrowerName,
      data.amount,
      data.borrowerContact,
      data.dueDate,
      data.notes
    );

    // Deduplicate loan insertion
    const updatedLoans = [newLoan, ...loans.filter((l) => l.id !== newLoan.id)];

    setWallets(FinanceEngine.sortWallets(updatedWallets));
    setLoans(updatedLoans);

    await storageService.saveWallets(FinanceEngine.sortWallets(updatedWallets));
    await storageService.saveLoans(updatedLoans);
    await OfflineQueueManager.enqueue('loans', 'insert', newLoan);
    const changedWallet = updatedWallets.find(w => w.id === data.sourceWalletId);
    if (changedWallet) {
      await OfflineQueueManager.enqueue('wallets', 'update', changedWallet);
    }
    SyncService.processOfflineQueue().then(() => {
      OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
    });
  };

  // Handlers for loan repayment
  const handleRepayLoan = async (
    loan: Loan,
    amount: number,
    destinationWalletId: string,
    notes?: string
  ) => {
    const { updatedWallets, updatedLoan } = FinanceEngine.processRepayment(
      wallets,
      loan,
      amount,
      destinationWalletId,
      notes
    );

    const updatedLoans = loans.map((l) => (l.id === updatedLoan.id ? updatedLoan : l));

    setWallets(FinanceEngine.sortWallets(updatedWallets));
    setLoans(updatedLoans);

    await storageService.saveWallets(FinanceEngine.sortWallets(updatedWallets));
    await storageService.saveLoans(updatedLoans);
    await OfflineQueueManager.enqueue('loans', 'update', updatedLoan);
    const changedWallet = updatedWallets.find(w => w.id === destinationWalletId);
    if (changedWallet) {
      await OfflineQueueManager.enqueue('wallets', 'update', changedWallet);
    }
    SyncService.processOfflineQueue().then(() => {
      OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
    });
  };

  // Handler for assets
  const handleAddAsset = async (data: {
    name: string;
    assetClass: AssetClass;
    value: number;
    notes?: string;
  }) => {
    const newAsset: Asset = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ast-${Date.now()}`,
      name: data.name,
      assetClass: data.assetClass,
      value: data.value,
      notes: data.notes,
      syncStatus: 'pending_insert',
    };

    // Deduplicate asset insertion
    const updatedAssets = [newAsset, ...assets.filter((a) => a.id !== newAsset.id)];
    setAssets(updatedAssets);

    await storageService.saveAssets(updatedAssets);
    await OfflineQueueManager.enqueue('assets', 'insert', newAsset);
    SyncService.processOfflineQueue().then(() => {
      OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
    });
  };

  // Handler for deleting a loan (borrower record)
  const handleDeleteLoan = async (loan: Loan) => {
    if (!window.confirm(`Delete borrower record for "${loan.borrowerName}"?`)) return;
    const updatedLoans = loans.filter((l) => l.id !== loan.id);
    setLoans(updatedLoans);
    await storageService.saveLoans(updatedLoans);
    await OfflineQueueManager.enqueue('loans', 'delete', { id: loan.id });
    SyncService.processOfflineQueue().then(() => {
      OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
    });
  };

  // Handler for deleting an asset
  const handleDeleteAsset = async (asset: Asset) => {
    if (!window.confirm(`Delete asset "${asset.name}"?`)) return;
    const updatedAssets = assets.filter((a) => a.id !== asset.id);
    setAssets(updatedAssets);
    await storageService.saveAssets(updatedAssets);
    await OfflineQueueManager.enqueue('assets', 'delete', { id: asset.id });
    SyncService.processOfflineQueue().then(() => {
      OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
    });
  };

  // Handler for profile updates
  const handleUpdateProfile = async (updated: UserProfile) => {
    setProfile(updated);
    await storageService.saveProfile(updated);
    await OfflineQueueManager.enqueue('profile', 'update', updated);
    SyncService.processOfflineQueue().then(() => {
      OfflineQueueManager.getPendingCount().then(setPendingSyncCount);
    });
  };

  return (
    <div className="app-shell">
      <div className="mobile-frame">
        {/* Top Header with Clickable Profile Chip */}
        <ProfileHeaderChip
          profile={profile}
          onClick={() => setCurrentTab('profile')}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          hasUnreadNotifications={
            loans.some((l) => l.status === 'active' || l.status === 'partial')
          }
        />

        {/* Screen Content Scroll Area */}
        {(() => {
          const currencySymbol = getCurrencySymbol(profile.currency || 'PHP');
          const handlePullRefresh = async () => {
            // 1. First process any pending mutations (deletes, updates, inserts)
            try {
              await SyncService.processOfflineQueue();
            } catch {
              // ignore offline network failures
            }

            // 2. If online and logged in, push complete local snapshot or merge cloud updates
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                // Ensure cloud has full snapshot of local state
                await SyncService.migrateGuestToCloud();
              }
            } catch {
              // offline
            }

            // 3. Read back latest local storage & update UI state
            const [w, t, l, a, p, qCount] = await Promise.all([
              storageService.getWallets(),
              storageService.getTransactions(),
              storageService.getLoans(),
              storageService.getAssets(),
              storageService.getProfile(),
              OfflineQueueManager.getPendingCount(),
            ]);

            // Deduplicate lists by unique ID
            const dedupWallets = Array.from(new Map(w.map((item) => [item.id, item])).values());
            const dedupTxs = Array.from(new Map(t.map((item) => [item.id, item])).values());
            const dedupLoans = Array.from(new Map(l.map((item) => [item.id, item])).values());
            const dedupAssets = Array.from(new Map(a.map((item) => [item.id, item])).values());

            setWallets(FinanceEngine.sortWallets(dedupWallets));
            setTransactions(dedupTxs);
            setLoans(dedupLoans);
            setAssets(dedupAssets);
            setProfile(p);
            setPendingSyncCount(qCount);
          };

          return (
            <>
              <PullToRefresh onRefresh={handlePullRefresh}>
                {currentTab === 'home' && (
                  <DashboardScreen
                    wallets={wallets}
                    transactions={transactions}
                    profile={profile}
                    currencySymbol={currencySymbol}
                    onAddExpense={() => {
                      setQuickAddType('expense');
                      setIsQuickAddOpen(true);
                    }}
                    onAddIncome={() => {
                      setQuickAddType('income');
                      setIsQuickAddOpen(true);
                    }}
                    onLendMoney={() => setIsLendModalOpen(true)}
                    onDeleteTransaction={handleDeleteTransaction}
                  />
                )}

                {currentTab === 'loans' && (
                  <LoanLedgerScreen
                    loans={loans}
                    wallets={wallets}
                    currencySymbol={currencySymbol}
                    onLendMoney={handleLendMoney}
                    onRepayLoan={handleRepayLoan}
                    onDeleteLoan={handleDeleteLoan}
                  />
                )}

                {currentTab === 'ai' && (
                  <AiAssistantScreen
                    wallets={wallets}
                    transactions={transactions}
                    loans={loans}
                    assets={assets}
                    profile={profile}
                    currencySymbol={currencySymbol}
                    messages={aiMessages}
                    setMessages={setAiMessages}
                    onOpenSettings={() => setCurrentTab('profile')}
                    onQuickAddTransaction={handleAddTransaction}
                  />
                )}

                {currentTab === 'stats' && (
                  <StatisticsScreen
                    transactions={transactions}
                    loans={loans}
                    currencySymbol={currencySymbol}
                  />
                )}

                {currentTab === 'assets' && (
                  <AssetsScreen
                    wallets={wallets}
                    loans={loans}
                    assets={assets}
                    currencySymbol={currencySymbol}
                    onAddAsset={handleAddAsset}
                    onDeleteAsset={handleDeleteAsset}
                  />
                )}

                {currentTab === 'profile' && (
                  <ProfileSettingsScreen
                    profile={profile}
                    onUpdateProfile={handleUpdateProfile}
                    onOpenAuth={() => setIsAuthModalOpen(true)}
                    onSignOut={async () => {
                      try {
                        await supabase.auth.signOut({ scope: 'local' });
                      } catch (err) {
                        console.warn('SignOut error:', err);
                      }
                      if (typeof window !== 'undefined' && window.history?.replaceState) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                      }
                      // Clear Supabase local storage session tokens explicitly
                      try {
                        for (let i = localStorage.length - 1; i >= 0; i--) {
                          const key = localStorage.key(i);
                          if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
                            localStorage.removeItem(key);
                          }
                        }
                      } catch {
                        // ignore
                      }
                      setProfile(INITIAL_PROFILE);
                      setWallets(FinanceEngine.sortWallets(INITIAL_WALLETS));
                      setTransactions([]);
                      setLoans([]);
                      setAssets([]);
                      await storageService.clearAllData();
                      await OfflineQueueManager.clearQueue();
                      setPendingSyncCount(0);
                      setCurrentTab('home');
                    }}
                    onResetData={async () => {
                      await storageService.clearAllData();
                      setWallets(FinanceEngine.sortWallets(INITIAL_WALLETS));
                      setTransactions([]);
                      setLoans([]);
                      setAssets([]);
                      alert('Local data reset to a clean slate.');
                    }}
                    onBack={() => setCurrentTab('home')}
                    pendingSyncCount={pendingSyncCount}
                  />
                )}
              </PullToRefresh>

              {/* Bottom Floating Dock (AI in the middle, No Settings Icon) */}
              {currentTab !== 'profile' && (
                <FloatingDock
                  currentTab={currentTab}
                  onSelectTab={setCurrentTab}
                />
              )}

              {/* Global Modals */}
              <QuickAddModal
                isOpen={isQuickAddOpen}
                initialType={quickAddType}
                wallets={wallets}
                currencySymbol={currencySymbol}
                onClose={() => setIsQuickAddOpen(false)}
                onSubmit={handleAddTransaction}
              />

              <AddLoanModal
                wallets={wallets}
                isOpen={isLendModalOpen}
                currencySymbol={currencySymbol}
                onClose={() => setIsLendModalOpen(false)}
                onSubmit={handleLendMoney}
              />

              <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onAuthSuccess={async (newProfile) => {
                  const localProfile = await storageService.getProfile();
                  const merged = {
                    ...newProfile,
                    aiBaseUrl: localProfile.aiBaseUrl,
                    aiApiKey: localProfile.aiApiKey,
                    aiModel: localProfile.aiModel,
                  };
                  setProfile(merged);
                  await storageService.saveProfile(merged);
                }}
              />

              <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                transactions={transactions}
                loans={loans}
                currencySymbol={currencySymbol}
                onDeleteTransaction={handleDeleteTransaction}
              />

              <NotificationsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                transactions={transactions}
                loans={loans}
                profile={profile}
                currencySymbol={currencySymbol}
              />
            </>
          );
        })()}
      </div>
    </div>
  );
};
