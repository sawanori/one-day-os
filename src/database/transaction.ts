/**
 * Database Transaction Utility
 *
 * Execute multiple DB operations in a transaction.
 * Prevents race conditions when multiple penalties/rewards are applied simultaneously.
 *
 * Usage:
 * ```typescript
 * await runInTransaction(async () => {
 *   await db.runAsync('UPDATE ...');
 *   await db.runAsync('INSERT ...');
 *   return result;
 * });
 * ```
 */
import { getDB } from './client';

/**
 * Execute operations in a transaction
 * @param operations - Async function containing DB operations
 * @returns Result of operations
 *
 * @example
 * ```typescript
 * const result = await runInTransaction(async () => {
 *   await db.runAsync('UPDATE user_status SET health = ? WHERE id = ?', [50, 1]);
 *   return { success: true };
 * });
 * ```
 */
export const runInTransaction = async <T>(
  operations: () => Promise<T>
): Promise<T> => {
  const db = getDB();

  try {
    await db.execAsync('BEGIN TRANSACTION;');
    const result = await operations();
    await db.execAsync('COMMIT;');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};
