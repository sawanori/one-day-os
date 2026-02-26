/**
 * One Day OS - IdentityEngine
 * Core engine for Identity Health (IH) calculation and management
 */

import { getDB } from '../../database/client';
import { IH_CONSTANTS } from '../../constants';
import * as SQLite from 'expo-sqlite';
import type { IHResponse, WipeEvent, QuestCompletion, NotificationResponse } from './types';
import { IHCalculator } from './IHCalculator';
import { IdentityLifecycle } from './IdentityLifecycle';

// Re-export types for backward compatibility
export type { IHResponse, WipeEvent, QuestCompletion, NotificationResponse };

/**
 * IdentityEngine - Singleton class for managing Identity Health
 */
export class IdentityEngine {
  private static instance: IdentityEngine | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private currentIH: number = IH_CONSTANTS.INITIAL_IH;
  private wipeCallbacks: Array<(event: WipeEvent) => void> = [];
  private initialized: boolean = false;
  private wipeInProgress: boolean = false;
  private lifecycle: IdentityLifecycle | null = null;

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
    this.lifecycle = new IdentityLifecycle(this.db, (v) => { this.currentIH = v; });

    // Try to load existing IH from database
    const result = await this.db.getFirstAsync<{ identity_health: number }>(
      'SELECT identity_health FROM identity WHERE id = 1'
    );

    if (result && typeof result.identity_health === 'number') {
      this.currentIH = IHCalculator.clamp(result.identity_health);
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
    const previousIH = this.currentIH;
    this.currentIH = IHCalculator.clamp(value);
    await this.persistIH();

    // Trigger wipe when IH reaches 0 for the first time (prevent double-fire)
    if (this.currentIH === 0 && previousIH > 0 && !this.wipeInProgress) {
      this.wipeInProgress = true;
      this.triggerWipe();
    }
  }

  /**
   * Apply notification response
   */
  public async applyNotificationResponse(
    response: NotificationResponse
  ): Promise<IHResponse> {
    const previousIH = this.currentIH;
    const delta = IHCalculator.notificationDelta(response);

    // Apply delta and clamp, delegating wipe check to setCurrentIH
    const newIH = IHCalculator.applyDelta(previousIH, delta);
    await this.setCurrentIH(newIH);

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
    const delta = IHCalculator.questDelta(completion);

    // Apply delta and clamp, delegating wipe check to setCurrentIH
    const newIH = IHCalculator.applyDelta(previousIH, delta);
    await this.setCurrentIH(newIH);

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
    const delta = IHCalculator.onboardingStagnationDelta();

    // Apply delta and clamp, delegating wipe check to setCurrentIH
    const newIH = IHCalculator.applyDelta(previousIH, delta);
    await this.setCurrentIH(newIH);

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
    if (!this.lifecycle) {
      throw new Error('Database not initialized');
    }
    return this.lifecycle.checkHealth();
  }

  /**
   * Apply damage to Identity Health.
   * @param amount Damage amount (default 10 for missed notifications)
   */
  public async applyDamage(amount: number = 10): Promise<{ health: number; isDead: boolean }> {
    if (!this.lifecycle) {
      throw new Error('Database not initialized');
    }
    return this.lifecycle.applyDamage(amount);
  }

  /**
   * Restore Identity Health (capped at 100).
   * @param amount Healing amount (default 5)
   */
  public async restoreHealth(amount: number = 5): Promise<void> {
    if (!this.lifecycle) {
      throw new Error('Database not initialized');
    }
    return this.lifecycle.restoreHealth(amount);
  }

  /**
   * THE NUCLEAR OPTION
   * Irreversibly wipes all user content tables.
   * Sets app_state to "despair" to mark as DEAD.
   */
  public async killUser(): Promise<void> {
    if (!this.lifecycle) {
      throw new Error('Database not initialized');
    }
    return this.lifecycle.killUser();
  }

  /**
   * "Identity Insurance" Purchase (Monetization)
   * Revives the user if they are dead or near death.
   * Recreates tables and sets IH to 50%.
   */
  public async useInsurance(): Promise<void> {
    if (!this.lifecycle) {
      throw new Error('Database not initialized');
    }
    return this.lifecycle.useInsurance();
  }

  /**
   * Get current Anti-Vision content
   * Used for Anti-Vision Bleed effect
   */
  public async getAntiVision(): Promise<string> {
    if (!this.lifecycle) {
      throw new Error('Database not initialized');
    }
    return this.lifecycle.getAntiVision();
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
