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

### Build
- Updated universal release Android APK binary (`budget-tracker-release.apk`).
- Successfully verified and deployed to connected physical device via ADB streamed install.
