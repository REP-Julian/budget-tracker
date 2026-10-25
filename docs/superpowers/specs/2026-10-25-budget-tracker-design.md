# Budget Tracker Specification & Architecture Design

## 1. Intent & Overview
A high-fidelity, privacy-focused, offline-first personal finance application tailored for phone devices (Android APK and desktop via Tauri v2). The application replicates the dark-mode aesthetic of the reference design (99% visual parity) featuring high-contrast neon chartreuse (`#E8F953`), deep midnight navy backgrounds (`#0B111E`), glowing segmented donut charts, dual-curve line trends, and tactile rounded surfaces without external CSS utility frameworks (no Tailwind; purely native CSS token architecture).

Beyond standard tracking, this system strictly separates **Personal Consumptive Expenses** from **Money Lent (Receivables)**, tracks **Daily Necessities (Needs vs Wants)** with dynamic daily allowance caps, aggregates **Multi-Class Assets** into true Net Worth, and provides a dedicated **Profile & Settings** hub triggered via a clickable avatar chip.

---

## 2. Technical Stack & Architectural Constraints

- **Frontend Framework**: React 19 (App) with TypeScript 5.8
- **Build Tool**: Vite 6 (`package.json`)
- **Styling Engine**: Custom design token system (`src/styles/tokens.css`, `src/styles/noir.css`). **Zero Tailwind CSS**.
- **Iconography**: Lucide React
- **Data Visualization**: Recharts (custom styled to fit noir dark aesthetic)
- **Validation**: Zod schema validation for all transactions, wallets, loans, and profile records
- **Desktop/Mobile Shell**: Tauri v2 cross-platform wrapper (Rust backend `src-tauri/Cargo.toml`, targeting Android APK `arm64-v8a`/`x86_64` and Desktop)
- **Tauri Plugins**: `@tauri-apps/plugin-notification`, `@tauri-apps/plugin-deep-link`, `@tauri-apps/plugin-opener`
- **Offline-First Storage**: Browser IndexedDB cache (`idb-keyval` or native `indexedDB`) with `localStorage` fallback (`src/lib/offlineQueue.ts`)
- **Cloud Backend**: Supabase PostgreSQL with Row Level Security (`src/lib/supabase.ts`, `src/lib/database.ts`)
- **Sync Mechanism**: Optimistic local writes, background queue with exponential backoff auto-retry, and guest-to-cloud migration
- **Testing**: Vitest unit tests, React Testing Library, Playwright end-to-end tests

---

## 3. Core Modules & Screen Specifications

### 3.1 Screen 1: Dashboard (Home)
- **Clickable Profile Header**:
  - Top-left pill displaying avatar (`JA`), User Name, and Role (`Primary Earner`).
  - Clicking this chip navigates to the dedicated **Profile & Settings** screen.
  - Quick action icons for Notifications and Search.
- **Hero Total Balance Card (`#E8F953`)**:
  - High-impact neon chartreuse card with bold dark typography (`#0D1424`).
  - Displays Total Liquid Balance (sum of all active liquid wallets).
  - Net monthly change pill (e.g. `↗ +$230`).
  - Lower row splitting `↓ Total Income` and `↑ Total Expenses` with circular icon badges.
- **Custom Wallets Carousel (No Bank Sync)**:
  - User-configurable manual wallets (e.g., "Cash & Pocket", "Savings Safe", "Emergency Reserve").
  - Displays balance, wallet type icon, and last updated timestamp.
- **Daily Necessity Tracker Widget**:
  - Real-time gauge comparing today's essential spend against the daily necessity cap (e.g., `$41.00 / $60.00`).
  - Color-coded progress bar (Green → Lime → Crimson warning).
- **Quick Action Pills**:
  - `- Expense` (Red border)
  - `+ Income` (Green border)
  - `🤝 Lend` (Cyan border, triggers loan creation modal)
- **Transactions Feed**:
  - Lists personal expense and income items with category icon, title, payment wallet, amount, and tax info.
  - Excludes money lent items to prevent expense skewing.
- **Floating Bottom Dock**:
  - 5 buttons: Home (`🏠`), Lent Money (`🤝`), Analytics (`📊`), Assets (`💎`), and Quick Add (`+`).
  - **No settings icon on dock**.

### 3.2 Screen 2: Money Lent Ledger (Receivables & Debts)
- **Strict Accounting Separation**:
  - Lending money transfers cash out of a wallet into a **Loan Receivable Asset**.
  - **Never counted as an expense** in monthly budget or category charts.
  - Receiving repayment transfers funds back into the chosen wallet without counting as income.
- **Header Summary Card**:
  - Displays Total Outstanding Lent Out (`$850.00`) and number of active borrowers.
- **Borrower Loan Cards**:
  - Borrower Name, contact info, initial principal, current outstanding balance.
  - Issue date, due date, purpose note.
  - Status Pills: `Pending Due`, `Partial Repaid`, `Overdue`, `Fully Settled`.
  - Actions: `Log Repayment` (partial or full with date/note), `Edit Loan`, `Forgive / Write-off`.

### 3.3 Screen 3: Statistics (Categories & Monthly Spending)
- **Segmented Glowing Donut Chart**:
  - Center label with total spent and selected month/year.
  - Colored arc tracks for Rent (Cyan `#00E5FF`), Education (Lime `#E8F953`), Transport (Pink `#F43F5E`), Shopping (Purple `#A855F7`), etc.
- **2x2 Category Grid**:
  - Category icon badge, name, transaction count, total expense, percentage badge, and month-over-month rate.
- **Monthly Spending Tab (Recharts Dual Curve)**:
  - Dual line charts: Income (Cyan `#38BDF8`) vs Expenses (Pink `#F43F5E`).
  - Interactive tooltip showing both amounts on hover/touch.
  - Timeframe filter pills: `7D`, `1M`, `3M`, `6M`, `1Y`, `Custom`.
  - Smart Insight Cards (e.g., "Income peaked in August at $4,200", "Saved an average of $4,120/mo").

### 3.4 Screen 4: Assets & Net Worth Portfolio
- **Net Worth Aggregator**:
  - Net Worth = Liquid Wallets + Money Lent Receivables + Investments/Crypto + Physical Assets - Liabilities.
- **Asset Class Breakdown**:
  - Liquid Cash & Wallets
  - Money Lent Receivables (auto-synced from Loan Ledger)
  - Crypto & Stock Investments
  - Physical Assets & Property (Vehicles, Electronics, Real Estate)
- **Add / Edit Asset Modal**:
  - Title, asset class, valuation, purchase date, notes.

### 3.5 Screen 5: Dedicated Profile & Settings Hub
- **Access**: Opened exclusively by clicking the profile header chip on the Home screen.
- **Personal Details Form**:
  - Full Name (text)
  - Email Address (email validation)
  - Contact Number / Phone (tel validation)
  - Role (e.g., "Primary Earner", "Household Admin", "Personal Saver")
- **Appearance & Theme**:
  - System Theme Toggle: Dark Mode (`noir.css` palette) vs Light Mode (`tokens.css` light override).
  - Currency selector (`$`, `€`, `£`, `Rp`, `¥`).
- **Database & Offline-First Controls**:
  - Supabase Cloud sync status (Connected / Offline / Syncing).
  - Offline sync queue inspector (pending operations count, manual "Sync Now" trigger).
  - Export data as JSON / Import backup.
  - Guest-to-cloud migration: Create account and push local IndexedDB records to Supabase.

---

## 4. Data Models (Zod & TypeScript)

```typescript
// Wallet (Manual, no bank)
export const WalletSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['cash', 'savings', 'emergency', 'vault', 'custom']),
  balance: z.number(),
  currency: z.string().default('USD'),
  icon: z.string().default('wallet'),
  updatedAt: z.string(),
});

// Transaction (Income & Expense)
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category: z.string(),
  isNecessity: z.boolean().default(false), // Needs vs Wants
  date: z.string(),
  notes: z.string().optional(),
  tax: z.number().default(0),
  syncStatus: z.enum(['synced', 'pending_insert', 'pending_update', 'pending_delete']),
});

// Loan (Money Lent - strictly separated from expenses)
export const LoanSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(), // Which wallet funds came from
  borrowerName: z.string().min(1),
  borrowerContact: z.string().optional(),
  principalAmount: z.number().positive(),
  remainingAmount: z.number().nonnegative(),
  lentDate: z.string(),
  dueDate: z.string().optional(),
  status: z.enum(['active', 'partial', 'settled', 'defaulted']),
  notes: z.string().optional(),
  repayments: z.array(z.object({
    id: z.string().uuid(),
    amount: z.number().positive(),
    date: z.string(),
    destinationWalletId: z.string().uuid(),
    notes: z.string().optional(),
  })).default([]),
  syncStatus: z.enum(['synced', 'pending_insert', 'pending_update', 'pending_delete']),
});

// Asset Item
export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  assetClass: z.enum(['liquid', 'receivable', 'investment', 'crypto', 'physical']),
  value: z.number(),
  acquisitionDate: z.string().optional(),
  notes: z.string().optional(),
  syncStatus: z.enum(['synced', 'pending_insert', 'pending_update', 'pending_delete']),
});

// User Profile & Preferences
export const ProfileSchema = z.object({
  id: z.string(),
  fullName: z.string().min(1),
  email: z.string().email(),
  contactNumber: z.string().min(1),
  role: z.string().min(1),
  theme: z.enum(['dark', 'light']).default('dark'),
  currency: z.string().default('USD'),
  dailyNecessityCap: z.number().positive().default(60),
});
```

---

## 5. Offline-First Sync Architecture

1. **Local-First Mutations**: Every user action (create transaction, lend money, log repayment, update asset) immediately mutates the in-memory React state and commits to IndexedDB. The UI updates with 0 latency.
2. **Mutation Queue**: Pending operations are enqueued with timestamp, retry count, and idempotent UUID keys.
3. **Background Worker**: Listens to browser `online`/`offline` events and Tauri network status. When online, flushes queued mutations to Supabase REST/PostgreSQL.
4. **Guest Migration**: Users can use the tracker 100% locally without an account. When signing in to Supabase, all local IndexedDB records are bundled and upserted into the user's RLS-protected cloud database.
