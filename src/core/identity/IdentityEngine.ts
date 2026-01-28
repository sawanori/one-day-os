/**
 * One Day OS - IdentityEngine
 * Core engine for Identity Health (IH) calculation and management
 */

import { openDatabase } from '../../database/db';
import { IH_CONSTANTS } from '../../constants';
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
  reason: 'IH_ZERO';
  finalIH: number;
  timestamp: number;
}

/**
 * Quest completion status
 */
export interface QuestCompletion {
  quest1: boolean;
  quest2: boolean;
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

    this.db = await openDatabase();

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
    } else if (response === 'NO' || response === 'IGNORED') {
      // Use NOTIFICATION_PENALTY which is 15 for NO/IGNORED responses
      delta = -IH_CONSTANTS.NOTIFICATION_PENALTY;
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
    const anyIncomplete = !completion.quest1 || !completion.quest2;
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
