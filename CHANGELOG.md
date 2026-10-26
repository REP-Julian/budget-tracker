# Release Changelog

## [1.0.1] - 2026-10-26

### Fixed
- **Persistent Sign Out Across Page Refresh**:
  - Fixed issue where refreshing the app after signing out restored the user account as logged in.
  - Reset profile state to `INITIAL_PROFILE` in IndexedDB upon data clearing and user sign out.
  - Added URL parameter sanitization using `window.history.replaceState` to strip `#access_token` and `?code=` OAuth parameters immediately after login, preventing browsers from re-authenticating callback URLs on reload.
  - Added fallback check on startup to revert to guest profile whenever Supabase session is null.
  - Set `supabase.auth.signOut({ scope: 'local' })` to guarantee client-side session eviction.

- **AI Custom Provider API Key & Base URL Persistence**:
  - Fixed issue where custom Base URL, API key, and model name were not persisting.
  - Implemented dedicated local device store `bt_ai_config` (`AI_CONFIG`) in `storageService` to protect user API credentials from being overwritten by Supabase cloud profile syncs.
  - Added `onBlur` auto-save to Base URL, API Key, and Model inputs.
  - Added auto-save on back button navigation (`handleBack`) so leaving settings never discards entered values.
  - Added auto-save upon model auto-detection.
  - Added dedicated **Save AI Configuration** action button in Section 3 of Profile & Settings with visual confirmation.
  - Fixed stale closure in `onUserAuthenticated` and `onAuthSuccess` to read fresh credentials from device storage.

- **Multi-Tenant Database Row Level Security (RLS)**:
  - Added `user_id UUID REFERENCES auth.users(id)` across `bt_wallets`, `bt_transactions`, `bt_loans`, `bt_assets`, and `bt_loan_repayments`.
  - Enabled strict RLS policies on all tables (`auth.uid() = user_id`) to isolate data per authenticated student.
  - Updated client database layer in `database.ts` to attach active Supabase user ID on all upsert mutations.
  - Users can now safely share the same application and backend without data contamination or unauthorized access.

- **Borrower Account & Asset Portfolio Deletion**:
  - Added delete actions (`Trash2`) on borrower loan cards in `LoanLedgerScreen`.
  - Added delete actions (`Trash2`) on custom asset holdings in `AssetsScreen`.
  - Connected deletions to local state, IndexedDB storage, and immediate cloud sync delete operations (`bt_loans`, `bt_assets`).

- **Cloud Database Hydration on Login & Instant Mutation Sync**:
  - Fixed issue where logging in after logging out reset local data and failed to restore cloud data.
  - Implemented automatic full cloud fetch (`fetchRemoteWallets`, `fetchRemoteTransactions`, `fetchRemoteLoans`, `fetchRemoteAssets`) upon login (`onUserAuthenticated`) and on app launch (`loadData`).
  - Added instant wallet balance mutation sync whenever transactions, loans, and repayments are added or deleted.
  - Enabled immediate offline-queue processing triggers after every database mutation.

- **Modal Bottom-Sheet Layout & Android WebView Viewport Fit**:
  - Fixed issue where modal dialogs (Lend Money, Add Asset, Repayments, Quick Add, Search, Notifications, Auth) floated in the top half of the screen with a large empty black space underneath.
  - Ported all modals to mount directly into `document.body` via React's `createPortal`, decoupling them from internal scroll containers (`PullToRefresh` / `screen-scroll-container`).
  - Updated sheet overlay styles to `height: 100dvh` and pinned bottom sheets with `max-height: 88dvh` and safe-area padding (`env(safe-area-inset-bottom)`), eliminating empty screen gaps and cramped internal form scrolling.

### Build
- Updated universal release Android APK binary (`budget-tracker-release.apk`).
- Successfully verified and deployed to connected physical device via ADB streamed install.
