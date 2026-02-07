/**
 * One Day OS - Identity Lifecycle
 * Manages life/death cycle: health checks, damage, restoration, wipe, and insurance
 */

import { initDatabase } from '../../database/schema';
import { runInTransaction } from '../../database/transaction';
import { IHCalculator } from './IHCalculator';
import * as SQLite from 'expo-sqlite';

/**
 * IdentityLifecycle - Manages the life/death operations for Identity Health
 *
 * Receives a database reference and a syncIH callback to update the
 * in-memory IH state in IdentityEngine without import-level circular dependency.
 */
export class IdentityLifecycle {
  private db: SQLite.SQLiteDatabase;
  private syncIH: (value: number) => void;

  constructor(db: SQLite.SQLiteDatabase, syncIH: (value: number) => void) {
    this.db = db;
    this.syncIH = syncIH;
  }

  /**
   * Check current Identity Health status from database.
   * Returns health value and whether user is dead (in despair).
   */
  async checkHealth(): Promise<{ health: number; isDead: boolean }> {
    // Get identity health from identity table
    const identityResult = await this.db.getFirstAsync<{ identity_health: number }>(
      'SELECT identity_health FROM identity WHERE id = 1'
    );

    // Get app state to check if in despair mode
    const stateResult = await this.db.getFirstAsync<{ state: string }>(
      'SELECT state FROM app_state WHERE id = 1'
    );

    if (!identityResult) return { health: 100, isDead: false };

    const isDead = stateResult?.state === 'despair';

    if (identityResult.identity_health <= 0 && !isDead) {
      await this.killUser();
      return { health: 0, isDead: true };
    }

    // Sync in-memory IH with DB value
    this.syncIH(IHCalculator.clamp(identityResult.identity_health));

    return { health: identityResult.identity_health, isDead };
  }

  /**
   * Apply damage to Identity Health.
   * @param amount Damage amount (default 10 for missed notifications)
   */
  async applyDamage(amount: number = 10): Promise<{ health: number; isDead: boolean }> {
    return runInTransaction(async () => {
      await this.db.runAsync(
        'UPDATE identity SET identity_health = MAX(0, identity_health - ?), updated_at = datetime(\'now\') WHERE id = 1',
        [amount]
      );

      // Sync in-memory state
      const result = await this.db.getFirstAsync<{ identity_health: number }>(
        'SELECT identity_health FROM identity WHERE id = 1'
      );
      if (result) {
        this.syncIH(IHCalculator.clamp(result.identity_health));
      }

      return this.checkHealth();
    });
  }

  /**
   * Restore Identity Health (capped at 100).
   * @param amount Healing amount (default 5)
   */
  async restoreHealth(amount: number = 5): Promise<void> {
    return runInTransaction(async () => {
      await this.db.runAsync(
        'UPDATE identity SET identity_health = MIN(100, identity_health + ?), updated_at = datetime(\'now\') WHERE id = 1',
        [amount]
      );

      // Sync in-memory state
      const result = await this.db.getFirstAsync<{ identity_health: number }>(
        'SELECT identity_health FROM identity WHERE id = 1'
      );
      if (result) {
        this.syncIH(IHCalculator.clamp(result.identity_health));
      }
    });
  }

  /**
   * THE NUCLEAR OPTION
   * Irreversibly wipes all user content tables.
   * Sets app_state to "despair" to mark as DEAD.
   */
  async killUser(): Promise<void> {
    return runInTransaction(async () => {
      console.warn('EXECUTING IDENTITY WIPE...');

      // DELETE data from all user content tables (not DROP)
      await this.db.execAsync(`
        DELETE FROM quests;
        DELETE FROM identity;
        DELETE FROM notifications;
        DELETE FROM daily_state;
      `);

      // Mark app as in despair state
      await this.db.runAsync(
        'UPDATE app_state SET state = ?, updated_at = datetime(\'now\') WHERE id = 1',
        ['despair']
      );

      this.syncIH(0);
    });
  }

  /**
   * "Identity Insurance" Purchase (Monetization)
   * Revives the user if they are dead or near death.
   * Recreates tables and sets IH to 50%.
   */
  async useInsurance(): Promise<void> {
    return runInTransaction(async () => {
      // Re-initialize database (CREATE TABLE IF NOT EXISTS)
      await initDatabase();

      // Update app_state to active
      await this.db.runAsync(
        'UPDATE app_state SET state = ?, updated_at = datetime(\'now\') WHERE id = 1',
        ['active']
      );

      // Set identity_health to 50% using INSERT OR REPLACE
      // to handle both empty table and existing row
      await this.db.runAsync(
        `INSERT OR REPLACE INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
         VALUES (
           1,
           COALESCE((SELECT anti_vision FROM identity WHERE id = 1), ''),
           COALESCE((SELECT identity_statement FROM identity WHERE id = 1), ''),
           COALESCE((SELECT one_year_mission FROM identity WHERE id = 1), ''),
           ?,
           COALESCE((SELECT created_at FROM identity WHERE id = 1), datetime('now')),
           datetime('now')
         )`,
        [50]
      );

      this.syncIH(50);
    });
  }

  /**
   * Get current Anti-Vision content
   * Used for Anti-Vision Bleed effect
   */
  async getAntiVision(): Promise<string> {
    const result = await this.db.getFirstAsync<{ anti_vision: string }>(
      'SELECT anti_vision FROM identity WHERE id = 1'
    );
    return result?.anti_vision || '';
  }
}
