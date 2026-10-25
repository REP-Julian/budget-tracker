# Budget Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-optimized Budget Tracker replicating the reference dark UI with 99% visual parity, featuring custom manual wallets, dedicated isolated Money Lent ledger, daily necessities tracking, multi-asset portfolio, clickable profile settings, and offline-first IndexedDB sync with Supabase.

**Architecture:** React 19 + TypeScript 5.8 on Vite 6 wrapped in Tauri v2. Pure custom CSS token design system (`tokens.css`, `noir.css`, strictly no Tailwind) providing dark/light themes. Domain logic enforces accounting separation between personal expenses and loan receivables. Offline-first repository using IndexedDB cache with mutation queues and Supabase PostgreSQL RLS cloud sync.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tauri v2, Lucide React, Recharts, Zod, IndexedDB (`idb-keyval`), Supabase JS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-budget-tracker-design.md`

## Global Constraints
- React 19, TypeScript 5.8, Vite 6 floors.
- **Zero Tailwind CSS**. All layouts, components, cards, and typography must use native CSS tokens and modular styles (`tokens.css`, `noir.css`).
- High-contrast neon chartreuse (`#E8F953`) hero card with dark text (`#0D1424`), deep navy midnight backgrounds (`#0B111E`), and dark elevated surfaces (`#151D2C`).
- Bank sync removed: use custom user-defined manual wallets.
- Money lent must **never** be classified as an expense or included in monthly expense charts. Repayments must restore wallet funds without inflating monthly income.
- Bottom navigation dock must have 5 tabs: Home (`🏠`), Lent (`🤝`), Analytics (`📊`), Assets (`💎`), and Quick Add (`+`). **No settings icon on the navigation dock**.
- Top-left header profile chip is clickable and opens the dedicated Profile & Settings view.

## Review Focus
1. **Lending accounting leak**: Ensure lending transactions do not touch `totalExpenses` or category expense calculations.
2. **Offline mutation idempotency**: Verify that operations queued offline cannot double-apply on reconnection.
3. **Daily necessity cap calculation**: Verify calculation resets daily and accurately flags essential vs discretionary spending.
4. **Theme switching integrity**: Verify that toggling between Dark Mode and Light Mode cleanly updates all CSS variables without unstyled flashes or broken contrasts.
5. **Recharts responsiveness**: Dual-curve line chart and donut chart render crisply within mobile viewport boundaries (375px - 430px) without overflow.

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`

**Steps:**
- [ ] Initialize `package.json` with React 19, TypeScript 5.8, Vite 6, `lucide-react`, `recharts`, `zod`, `idb-keyval`, `@supabase/supabase-js`, `vitest`.
- [ ] Configure `vite.config.ts` and TypeScript project references.
- [ ] Create Tauri v2 configuration files (`tauri.conf.json`, `Cargo.toml`) targeting Android & desktop with notifications and opener plugins.
- [ ] Run `npm install` and verify zero vulnerabilities/conflicts.

---

### Task 2: Custom Design Token System & Noir Theme Engine

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/noir.css`
- Create: `src/styles/theme.css`
- Create: `src/context/ThemeContext.tsx`
- Test: `tests/theme.test.ts`

**Steps:**
- [ ] Implement `tokens.css` with color primitives, spacing scale, font stacks (`Inter`), border radii (`20px`, `28px`, `999px`), and transitions.
- [ ] Implement `noir.css` matching reference screenshot: `--bg-main: #0B111E`, `--card-surface: #151D2C`, `--neon-yellow: #E8F953`, `--accent-cyan: #00E5FF`, `--accent-pink: #F43F5E`, `--accent-purple: #A855F7`.
- [ ] Implement light mode token overrides inside `tokens.css` (`[data-theme="light"]`).
- [ ] Create `ThemeContext.tsx` managing `dark` vs `light` theme state with `localStorage` persistence.
- [ ] Write Vitest test verifying theme toggling applies proper attributes to DOM.

---

### Task 3: Core Schemas & Offline-First IndexedDB Repository

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/schemas.ts`
- Create: `src/lib/storage.ts`
- Create: `src/lib/offlineQueue.ts`
- Test: `tests/storage.test.ts`

**Steps:**
- [ ] Define Zod schemas and TypeScript types for `Wallet`, `Transaction`, `Loan`, `Repayment`, `Asset`, and `Profile`.
- [ ] Implement `storage.ts` using `idb-keyval` for fast local writes with localStorage fallback.
- [ ] Implement `offlineQueue.ts` for enqueueing mutations (`create_tx`, `lend_money`, `repay_loan`, etc.) with retry counter and status flags.
- [ ] Write Vitest tests verifying CRUD operations and offline queue serialization.

---

### Task 4: Personal Finance Accounting & Business Logic Engine

**Files:**
- Create: `src/services/financeEngine.ts`
- Test: `tests/financeEngine.test.ts`

**Steps:**
- [ ] Implement `calculateTotalLiquidBalance(wallets: Wallet[]): number`.
- [ ] Implement `calculateMonthlyIncomeAndExpense(transactions: Transaction[], month: string)`. Ensure loans are completely omitted.
- [ ] Implement `calculateDailyNecessitySpend(transactions: Transaction[], date: string, dailyCap: number)`.
- [ ] Implement `calculateNetWorth(wallets: Wallet[], loans: Loan[], assets: Asset[]): number`.
- [ ] Implement `processLoanRepayment(loan: Loan, repaymentAmount: number, destinationWallet: Wallet)`.
- [ ] Write Vitest unit tests asserting:
  - Lending $500 lowers wallet balance by $500, creates $500 receivable, and **zero** personal expense.
  - Partial repayment of $150 restores wallet balance, reduces loan to $350, and records **zero** income.
  - Daily necessity cap correctly reports remaining allowance.

---

### Task 5: 99% UI Replication - Dashboard Screen

**Files:**
- Create: `src/components/dashboard/DashboardScreen.tsx`
- Create: `src/components/dashboard/HeroBalanceCard.tsx`
- Create: `src/components/dashboard/WalletCarousel.tsx`
- Create: `src/components/dashboard/DailyNecessityWidget.tsx`
- Create: `src/components/dashboard/QuickActions.tsx`
- Create: `src/components/dashboard/TransactionFeed.tsx`
- Create: `src/styles/dashboard.css`
- Test: `tests/DashboardScreen.test.tsx`

**Steps:**
- [ ] Build `HeroBalanceCard` with neon yellow surface (`#E8F953`), dark typography (`#0D1424`), total liquid balance, net gain pill, and income/expense breakdown icons.
- [ ] Build `WalletCarousel` displaying user's manual wallets (Cash & Pocket, Savings Safe) with balances and custom icons.
- [ ] Build `DailyNecessityWidget` showing daily spend progress against cap with colored indicator bar.
- [ ] Build `QuickActions` pills: `- Expense`, `+ Income`, `🤝 Lend`.
- [ ] Build `TransactionFeed` listing recent personal transactions.
- [ ] Verify responsive layout and test rendering in Vitest.

---

### Task 6: 99% UI Replication - Statistics Screen

**Files:**
- Create: `src/components/stats/StatisticsScreen.tsx`
- Create: `src/components/stats/CategoryDonutChart.tsx`
- Create: `src/components/stats/CategoryGrid.tsx`
- Create: `src/components/stats/MonthlySpendingChart.tsx`
- Create: `src/components/stats/TimeframeFilter.tsx`
- Create: `src/components/stats/SmartInsightCards.tsx`
- Create: `src/styles/stats.css`
- Test: `tests/StatisticsScreen.test.tsx`

**Steps:**
- [ ] Implement tab selector: `Categories` vs `Monthly Spending`.
- [ ] Build `CategoryDonutChart` using SVG glowing segmented rings with center total and month label.
- [ ] Build `CategoryGrid` 2x2 layout matching screenshot: Rent (Cyan 36%), Education (Yellow 26%), Transport (Pink 22%), Shop (Purple 16%).
- [ ] Build `MonthlySpendingChart` using Recharts ResponsiveContainer with dual smooth curves (Income `#38BDF8`, Expense `#F43F5E`), custom dark tooltip, and grid.
- [ ] Build `TimeframeFilter` pills (`7D`, `1M`, `3M`, `6M`, `1Y`, `Custom`) and `SmartInsightCards`.
- [ ] Verify chart rendering in mobile view.

---

### Task 7: Dedicated Money Lent Ledger Screen & Repayment Flow

**Files:**
- Create: `src/components/loans/LoanLedgerScreen.tsx`
- Create: `src/components/loans/LoanCard.tsx`
- Create: `src/components/loans/AddLoanModal.tsx`
- Create: `src/components/loans/RepaymentModal.tsx`
- Create: `src/styles/loans.css`
- Test: `tests/loans.test.tsx`

**Steps:**
- [ ] Build `LoanLedgerScreen` displaying top total lent out banner (`Total Lent Out: $850.00`, active borrower count).
- [ ] Render loan cards with borrower name, initial principal, remaining balance, due dates, and status badges (`Pending Due`, `Partial Repaid`, `Fully Settled`).
- [ ] Implement `AddLoanModal` allowing lending from a specific manual wallet with borrower details, date, and notes.
- [ ] Implement `RepaymentModal` allowing partial or full repayment logged into a selected destination wallet.
- [ ] Test that repayments immediately adjust wallet and loan balances in UI.

---

### Task 8: Assets & Net Worth Portfolio Screen

**Files:**
- Create: `src/components/assets/AssetsScreen.tsx`
- Create: `src/components/assets/NetWorthHeader.tsx`
- Create: `src/components/assets/AssetClassList.tsx`
- Create: `src/components/assets/AddAssetModal.tsx`
- Create: `src/styles/assets.css`
- Test: `tests/assets.test.tsx`

**Steps:**
- [ ] Build `NetWorthHeader` showing aggregate real-time net worth with percentage change indicator.
- [ ] Render asset classes: Liquid Wallets, Money Lent Receivables, Investments & Crypto, Physical Assets.
- [ ] Build `AddAssetModal` for adding new holdings (e.g. Bitcoin, index funds, vehicles) with valuation.
- [ ] Verify live net worth recalculation when assets or loan balances update.

---

### Task 9: Dedicated Profile & Settings Screen & Dock Navigation

**Files:**
- Create: `src/components/profile/ProfileSettingsScreen.tsx`
- Create: `src/components/profile/ProfileHeaderChip.tsx`
- Create: `src/components/navigation/FloatingDock.tsx`
- Create: `src/components/modals/QuickAddModal.tsx`
- Create: `src/styles/profile.css`
- Create: `src/styles/navigation.css`
- Test: `tests/navigation.test.tsx`

**Steps:**
- [ ] Build `ProfileHeaderChip` in top header: clickable avatar pill showing name and role that opens `ProfileSettingsScreen`.
- [ ] Build `FloatingDock` with 5 navigation buttons: Home (`🏠`), Lent (`🤝`), Analytics (`📊`), Assets (`💎`), and Quick Add (`+`). Verify **no settings icon** is present on the dock.
- [ ] Build `ProfileSettingsScreen` with:
  - Editable avatar, Full Name, Email, Contact Number, Role selector.
  - System Appearance: Dark Mode / Light Mode switcher.
  - Daily necessity budget cap setting.
  - Database & Sync status indicators, JSON export/import buttons.
- [ ] Build `QuickAddModal` for fast logging of Expense, Income, or Loan.

---

### Task 10: Supabase Client & Offline Queue Synchronization

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/database.ts`
- Create: `src/services/syncService.ts`
- Test: `tests/syncService.test.ts`

**Steps:**
- [ ] Configure `supabase.ts` with Supabase client (using public config or environment variables).
- [ ] Provide SQL schema migration script in `supabase/migrations/20261025_init.sql` for `wallets`, `transactions`, `loans`, `repayments`, `assets`, and `profiles` with RLS policies.
- [ ] Implement `syncService.ts` to process offline queue items when online, updating local records from `pending_*` to `synced`.
- [ ] Implement guest-to-cloud migration bundle function.

---

### Task 11: End-to-End App Integration & Quality Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `tests/App.test.tsx`

**Steps:**
- [ ] Integrate all screens into `App.tsx` with mobile viewport frame, tab state management, and active screen routing.
- [ ] Populate initial mock seed data (Julian Agustino, $3,540.60 balance, Cash & Savings wallets, Marcus & David active loans, category breakdown matching screenshot).
- [ ] Run full Vitest test suite (`npm test`) and ensure 100% pass rate.
- [ ] Run `npm run build` and ensure TypeScript type check and production bundle build with zero errors.
