/**
 * One Day OS - IdentityEngine
 * Core engine for Identity Health (IH) calculation and management
 */

import { getDB } from '../../database/client';
import { IH_CONSTANTS } from '../../constants';
import { initDatabase } from '../../database/schema';
import { runInTransaction } from '../../database/transaction';
import * as SQLite from 'expo-sqlite';

/**
 * Response from notification or quest penalty application
 */
export interface IHResponse {
  previousIH: number;
  newIH: number;
  delta: number;
  timestamp: number;
}

/**
 * Event triggered when IH reaches 0 (wipe condition)
 */
export interface WipeEvent {
  reason: 'IH_ZERO' | 'QUEST_FAIL' | 'USER_REQUEST';
  finalIH: number;
  timestamp: number;
}

/**
 * Quest completion status - dynamic, supports any number of quests
 */
export interface QuestCompletion {
  completedCount: number;
  totalCount: number;
}

/**
 * Notification response types
 */
export type NotificationResponse = 'YES' | 'NO' | 'IGNORED';

/**
 * IdentityEngine - Singleton class for managing Identity Health
 */
export class IdentityEngine {
  private static instance: IdentityEngine | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private currentIH: number = IH_CONSTANTS.INITIAL_IH;
  private wipeCallbacks: Array<(event: WipeEvent) => void> = [];
  private initialized: boolean = false;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static async getInstance(): Promise<IdentityEngine> {
    if (!IdentityEngine.instance) {
      IdentityEngine.instance = new IdentityEngine();
      await IdentityEngine.instance.initialize();
    }
    return IdentityEngine.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    IdentityEngine.instance = null;
  }

  /**
   * Initialize the engine - load IH from DB or set to initial value
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.db = getDB();

    // Try to load existing IH from database
    const result = await this.db.getFirstAsync<{ identity_health: number }>(
      'SELECT identity_health FROM identity WHERE id = 1'
    );

    if (result && typeof result.identity_health === 'number') {
      this.currentIH = this.clampIH(result.identity_health);
    } else {
      this.currentIH = IH_CONSTANTS.INITIAL_IH;
      await this.persistIH();
    }

    this.initialized = true;
  }

  /**
   * Get current Identity Health value
   */
  public async getCurrentIH(): Promise<number> {
    return this.currentIH;
  }

  /**
   * Set current Identity Health value (for testing and internal use)
   */
  public async setCurrentIH(value: number): Promise<void> {
    const _previousIH = this.currentIH; // Reserved for future auditing
    this.currentIH = this.clampIH(value);
    await this.persistIH();

    // Don't trigger wipe callback from setCurrentIH
    // Only trigger from applyNotificationResponse and applyQuestPenalty
  }

  /**
   * Apply notification response
   */
  public async applyNotificationResponse(
    response: NotificationResponse
  ): Promise<IHResponse> {
    // Validate response
    if (response !== 'YES' && response !== 'NO' && response !== 'IGNORED') {
      throw new Error(`Invalid notification response: ${response}`);
    }

    const previousIH = this.currentIH;
    let delta = 0;

    // Calculate delta based on response
    if (response === 'YES') {
      delta = 0; // No penalty for YES
    } else if (response === 'NO') {
      delta = -IH_CONSTANTS.NOTIFICATION_PENALTY; // -15 for explicit NO
    } else if (response === 'IGNORED') {
      delta = -IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY; // -20 for timeout/ignored
    }

    // Apply delta and clamp
    const newIH = this.clampIH(previousIH + delta);
    this.currentIH = newIH;
    await this.persistIH();

    // Check for wipe trigger
    if (newIH === 0 && previousIH > 0) {
      this.triggerWipe();
    }

    return {
      previousIH,
      newIH,
      delta,
      timestamp: Date.now(),
    };
  }

  /**
   * Apply quest penalty
   */
  public async applyQuestPenalty(
    completion: QuestCompletion
  ): Promise<IHResponse> {
    const previousIH = this.currentIH;
    let delta = 0;

    // If ANY quest is incomplete, apply penalty once
    const anyIncomplete = completion.completedCount < completion.totalCount;
    if (anyIncomplete) {
      delta = -IH_CONSTANTS.INCOMPLETE_QUEST_PENALTY;
    }

    // Apply delta and clamp
    const newIH = this.clampIH(previousIH + delta);
    this.currentIH = newIH;
    await this.persistIH();

    // Check for wipe trigger
    if (newIH === 0 && previousIH > 0) {
      this.triggerWipe();
    }

    return {
      previousIH,
      newIH,
      delta,
      timestamp: Date.now(),
    };
  }

  /**
   * Apply onboarding stagnation penalty (-5% IH)
   * Used when user fails to input during onboarding excavation phase
   */
  public async applyOnboardingStagnationPenalty(): Promise<IHResponse> {
    const previousIH = this.currentIH;
    const delta = -5; // Fixed 5% penalty for onboarding stagnation

    // Apply delta and clamp
    const newIH = this.clampIH(previousIH + delta);
    this.currentIH = newIH;
    await this.persistIH();

    // Check for wipe trigger
    if (newIH === 0 && previousIH > 0) {
      this.triggerWipe();
    }

    return {
      previousIH,
      newIH,
      delta,
      timestamp: Date.now(),
    };
  }

  /**
   * Check current Identity Health status from database.
   * Returns health value and whether user is dead (in despair).
   */
  public async checkHealth(): Promise<{ health: number; isDead: boolean }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

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
    this.currentIH = this.clampIH(identityResult.identity_health);

    return { health: identityResult.identity_health, isDead };
  }

  /**
   * Apply damage to Identity Health.
   * @param amount Damage amount (default 10 for missed notifications)
   */
  public async applyDamage(amount: number = 10): Promise<{ health: number; isDead: boolean }> {
    return runInTransaction(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      await this.db.runAsync(
        'UPDATE identity SET identity_health = MAX(0, identity_health - ?), updated_at = datetime(\'now\') WHERE id = 1',
        [amount]
      );

      // Sync in-memory state
      const result = await this.db.getFirstAsync<{ identity_health: number }>(
        'SELECT identity_health FROM identity WHERE id = 1'
      );
      if (result) {
        this.currentIH = this.clampIH(result.identity_health);
      }

      return this.checkHealth();
    });
  }

  /**
   * Restore Identity Health (capped at 100).
   * @param amount Healing amount (default 5)
   */
  public async restoreHealth(amount: number = 5): Promise<void> {
    return runInTransaction(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      await this.db.runAsync(
        'UPDATE identity SET identity_health = MIN(100, identity_health + ?), updated_at = datetime(\'now\') WHERE id = 1',
        [amount]
      );

      // Sync in-memory state
      const result = await this.db.getFirstAsync<{ identity_health: number }>(
        'SELECT identity_health FROM identity WHERE id = 1'
      );
      if (result) {
        this.currentIH = this.clampIH(result.identity_health);
      }
    });
  }

  /**
   * THE NUCLEAR OPTION
   * Irreversibly wipes all user content tables.
   * Sets app_state to "despair" to mark as DEAD.
   */
  public async killUser(): Promise<void> {
    return runInTransaction(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
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

      this.currentIH = 0;
    });
  }

  /**
   * "Identity Insurance" Purchase (Monetization)
   * Revives the user if they are dead or near death.
   * Recreates tables and sets IH to 50%.
   */
  public async useInsurance(): Promise<void> {
    return runInTransaction(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

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

      this.currentIH = 50;
    });
  }

  /**
   * Get current Anti-Vision content
   * Used for Anti-Vision Bleed effect
   */
  public async getAntiVision(): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const result = await this.db.getFirstAsync<{ anti_vision: string }>(
      'SELECT anti_vision FROM identity WHERE id = 1'
    );
    return result?.anti_vision || '';
  }

  /**
   * Check if wipe is needed (IH === 0)
   */
  public async isWipeNeeded(): Promise<boolean> {
    return this.currentIH === 0;
  }

  /**
   * Register callback for wipe trigger
   */
  public onWipeTrigger(callback: (event: WipeEvent) => void): void {
    this.wipeCallbacks.push(callback);
  }

  /**
   * Trigger wipe event
   */
  private triggerWipe(): void {
    const event: WipeEvent = {
      reason: 'IH_ZERO',
      finalIH: this.currentIH,
      timestamp: Date.now(),
    };

    // Call all registered callbacks
    this.wipeCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in wipe callback:', error);
      }
    });
  }

  /**
   * Clamp IH value to valid range [0, 100]
   */
  private clampIH(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  /**
   * Persist current IH to database
   */
  private async persistIH(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Use INSERT OR REPLACE to handle both insert and update
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
      [this.currentIH]
    );
  }
}
