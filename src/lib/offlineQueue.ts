import { get, set } from 'idb-keyval';
import { SyncMutation } from '../types';

const QUEUE_KEY = 'bt_offline_mutation_queue';

export class OfflineQueueManager {
  public static async getQueue(): Promise<SyncMutation[]> {
    try {
      const q = await get<SyncMutation[]>(QUEUE_KEY);
      return q || [];
    } catch {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  }

  public static async setQueue(queue: SyncMutation[]): Promise<void> {
    try {
      await set(QUEUE_KEY, queue);
    } catch {
      // ignore
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  public static async enqueue(
    entity: SyncMutation['entity'],
    action: SyncMutation['action'],
    payload: unknown
  ): Promise<SyncMutation> {
    const mutation: SyncMutation = {
      id: crypto.randomUUID ? crypto.randomUUID() : `mut-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      entity,
      action,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const queue = await this.getQueue();
    queue.push(mutation);
    await this.setQueue(queue);
    return mutation;
  }

  public static async peek(): Promise<SyncMutation | null> {
    const queue = await this.getQueue();
    return queue.length > 0 ? queue[0] : null;
  }

  public static async dequeue(): Promise<SyncMutation | null> {
    const queue = await this.getQueue();
    if (queue.length === 0) return null;
    const item = queue.shift()!;
    await this.setQueue(queue);
    return item;
  }

  public static async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  public static async clearQueue(): Promise<void> {
    await this.setQueue([]);
  }
}
