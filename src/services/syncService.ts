import { OfflineQueueManager } from '../lib/offlineQueue';
import { databaseApi } from '../lib/database';
import { storageService } from '../lib/storage';
import { Wallet, Transaction, Loan, Asset, UserProfile } from '../types';

export class SyncService {
  private static isSyncing = false;

  public static async processOfflineQueue(): Promise<{ processed: number; errors: number }> {
    if (this.isSyncing) return { processed: 0, errors: 0 };
    this.isSyncing = true;

    let processed = 0;
    let errors = 0;

    try {
      while (true) {
        const item = await OfflineQueueManager.peek();
        if (!item) break;

        let success = false;
        try {
          switch (item.entity) {
            case 'wallets':
              if (item.action === 'delete') {
                const payload = item.payload as { id: string } | string;
                const id = typeof payload === 'string' ? payload : payload.id;
                success = await databaseApi.deleteRemoteWallet(id);
              } else {
                success = await databaseApi.upsertRemoteWallet(item.payload as Wallet);
              }
              break;
            case 'transactions':
              if (item.action === 'delete') {
                const payload = item.payload as { id: string } | string;
                const id = typeof payload === 'string' ? payload : payload.id;
                success = await databaseApi.deleteRemoteTransaction(id);
              } else {
                success = await databaseApi.upsertRemoteTransaction(item.payload as Transaction);
              }
              break;
            case 'loans':
              if (item.action === 'delete') {
                const payload = item.payload as { id: string } | string;
                const id = typeof payload === 'string' ? payload : payload.id;
                success = await databaseApi.deleteRemoteLoan(id);
              } else {
                success = await databaseApi.upsertRemoteLoan(item.payload as Loan);
              }
              break;
            case 'assets':
              if (item.action === 'delete') {
                const payload = item.payload as { id: string } | string;
                const id = typeof payload === 'string' ? payload : payload.id;
                success = await databaseApi.deleteRemoteAsset(id);
              } else {
                success = await databaseApi.upsertRemoteAsset(item.payload as Asset);
              }
              break;
            case 'profile':
              success = await databaseApi.upsertRemoteProfile(item.payload as UserProfile);
              break;
            default:
              success = true;
          }
        } catch (e) {
          console.warn('Sync mutation execution error:', e);
          success = false;
        }

        if (success) {
          await OfflineQueueManager.dequeue();
          processed++;
        } else {
          item.retryCount += 1;
          if (item.retryCount >= 3) {
            // Drop unrecoverable mutation to prevent poison pill locking the queue forever
            await OfflineQueueManager.dequeue();
          } else {
            // Update retry count in storage
            const currentQueue = await OfflineQueueManager.getQueue();
            if (currentQueue.length > 0) {
              currentQueue[0].retryCount = item.retryCount;
              await OfflineQueueManager.setQueue(currentQueue);
            }
          }
          errors++;
          break; // Stop loop and retry on next interval or refresh
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { processed, errors };
  }

  /**
   * Migrate entire local guest IndexedDB repository to cloud
   */
  public static async migrateGuestToCloud(): Promise<boolean> {
    try {
      const [wallets, txs, loans, assets, profile] = await Promise.all([
        storageService.getWallets(),
        storageService.getTransactions(),
        storageService.getLoans(),
        storageService.getAssets(),
        storageService.getProfile(),
      ]);

      await Promise.all([
        ...wallets.map((w) => databaseApi.upsertRemoteWallet(w)),
        ...txs.map((t) => databaseApi.upsertRemoteTransaction(t)),
        ...loans.map((l) => databaseApi.upsertRemoteLoan(l)),
        ...assets.map((a) => databaseApi.upsertRemoteAsset(a)),
        databaseApi.upsertRemoteProfile(profile),
      ]);

      return true;
    } catch (err) {
      console.error('Guest migration error:', err);
      return false;
    }
  }
}
