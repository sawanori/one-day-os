/**
 * One Day OS - WipeManager
 * Handles irreversible data wipe operations
 */

import * as SQLite from 'expo-sqlite';

export type WipeReason = 'IH_ZERO' | 'QUEST_FAIL' | 'USER_REQUEST';

export interface WipeResult {
  success: boolean;
  timestamp: number;
  reason: WipeReason;
  tablesCleared: string[];
  nextScreen: 'onboarding' | 'despair';
}

export interface WipeLogEntry {
  id: number;
  reason: WipeReason;
  timestamp: number;
  finalIH: number;
}

type WipeCompleteCallback = (result: {
  success: boolean;
  nextScreen: 'onboarding' | 'despair';
  timestamp: number;
}) => void;

export class WipeManager {
  private db: SQLite.SQLiteDatabase;
  private onWipeComplete?: WipeCompleteCallback;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Ensure wipe_log table exists
   */
  private async ensureWipeLogTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS wipe_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wiped_at INTEGER NOT NULL,
        reason TEXT NOT NULL,
        final_ih_value INTEGER NOT NULL
      );
    `);
  }

  /**
   * Set callback to be called when wipe completes
   */
  setOnWipeComplete(callback: WipeCompleteCallback): void {
    this.onWipeComplete = callback;
  }

  /**
   * Execute full data wipe
   */
  async executeWipe(reason: WipeReason, finalIH: number): Promise<WipeResult> {
    const timestamp = Date.now();
    const tablesCleared: string[] = [];

    try {
      // Ensure wipe_log table exists before wiping
      await this.ensureWipeLogTable();

      // Delete all data from main tables
      await this.db.execAsync(`
        DELETE FROM identity;
        DELETE FROM quests;
        DELETE FROM notifications;
        DELETE FROM daily_state;
        DELETE FROM identity_backup;
      `);

      tablesCleared.push('identity', 'quests', 'notifications', 'daily_state', 'identity_backup');

      // Log the wipe event
      await this.db.runAsync(
        'INSERT INTO wipe_log (wiped_at, reason, final_ih_value) VALUES (?, ?, ?)',
        [timestamp, reason, finalIH]
      );

      // Reset insurance state and increment life number
      await this.db.runAsync(
        'UPDATE app_state SET has_used_insurance = 0, life_number = life_number + 1 WHERE id = 1'
      );

      // Non-blocking VACUUM to prevent UI thread blocking
      setTimeout(() => {
        this.db.execAsync('VACUUM;').catch(e => console.warn('VACUUM failed:', e));
      }, 100);

      // Create success result
      const result: WipeResult = {
        success: true,
        timestamp,
        reason,
        tablesCleared,
        nextScreen: 'onboarding',
      };

      // Call completion callback if set
      if (this.onWipeComplete) {
        this.onWipeComplete({
          success: true,
          nextScreen: 'onboarding',
          timestamp,
        });
      }

      return result;
    } catch (error) {
      console.error('Wipe failed:', error);

      // Create error result
      const result: WipeResult = {
        success: false,
        timestamp,
        reason,
        tablesCleared,
        nextScreen: 'onboarding',
      };

      // Call completion callback even on error
      if (this.onWipeComplete) {
        this.onWipeComplete({
          success: false,
          nextScreen: 'onboarding',
          timestamp,
        });
      }

      return result;
    }
  }

  /**
   * Get wipe log history
   */
  async getWipeLog(): Promise<WipeLogEntry[]> {
    try {
      await this.ensureWipeLogTable();

      const rows = await this.db.getAllAsync<{
        id: number;
        reason: string;
        wiped_at: number;
        final_ih_value: number;
      }>('SELECT * FROM wipe_log ORDER BY wiped_at DESC');

      return rows.map(row => ({
        id: row.id,
        reason: row.reason as WipeReason,
        timestamp: row.wiped_at,
        finalIH: row.final_ih_value,
      }));
    } catch (error) {
      console.error('Failed to get wipe log:', error);
      return [];
    }
  }
}
