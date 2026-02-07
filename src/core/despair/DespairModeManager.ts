/**
 * One Day OS - DespairModeManager
 * Manages despair mode state after data wipe
 *
 * Specification: "Data wipe only, immediate re-setup possible"
 * - No 24-hour lockout period
 * - After wipe: user directed to onboarding immediately
 * - Immediate re-setup is always allowed
 */

import * as SQLite from 'expo-sqlite';
import { WipeManager, WipeReason, WipeResult } from '../identity/WipeManager';
import { getAppState, updateAppState } from '../../database/client';

export type AppState = 'onboarding' | 'active' | 'despair';

export interface DespairEvent {
  timestamp: number;
  reason: WipeReason;
  previousState?: AppState;
}

export interface OnWipeResult {
  success: boolean;
  nextScreen: 'onboarding' | 'despair';
  timestamp: number;
  reason: WipeReason;
  tablesCleared?: string[];
}

type DespairEnterCallback = (event: DespairEvent) => void;
type DespairExitCallback = () => void;

export class DespairModeManager {
  private static instance: DespairModeManager | null = null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _db: SQLite.SQLiteDatabase; // Reserved for future use
  private wipeManager: WipeManager;
  private despairEnterCallbacks: DespairEnterCallback[] = [];
  private despairExitCallbacks: DespairExitCallback[] = [];

  constructor(db: SQLite.SQLiteDatabase, wipeManager: WipeManager) {
    this._db = db;
    this.wipeManager = wipeManager;
  }

  /**
   * Get singleton instance
   */
  static getInstance(db: SQLite.SQLiteDatabase, wipeManager: WipeManager): DespairModeManager {
    if (!DespairModeManager.instance) {
      DespairModeManager.instance = new DespairModeManager(db, wipeManager);
    }
    return DespairModeManager.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    DespairModeManager.instance = null;
  }

  /**
   * Handle wipe event
   * Executes wipe via WipeManager, updates state to despair, then transitions to onboarding
   */
  async onWipe(reason: WipeReason, finalIH: number): Promise<OnWipeResult> {
    try {
      // Get current state before wipe
      const previousState = await getAppState();

      // Execute wipe via WipeManager
      const wipeResult: WipeResult = await this.wipeManager.executeWipe(reason, finalIH);

      // Update app state to 'despair'
      await updateAppState('despair');

      // Create despair event
      const despairEvent: DespairEvent = {
        timestamp: wipeResult.timestamp,
        reason: wipeResult.reason,
        previousState,
      };

      // Trigger despair enter callbacks
      this.triggerDespairEnterCallbacks(despairEvent);

      // Return result with nextScreen as 'onboarding' (immediate re-setup)
      const result: OnWipeResult = {
        success: wipeResult.success,
        nextScreen: 'onboarding',
        timestamp: wipeResult.timestamp,
        reason: wipeResult.reason,
        tablesCleared: wipeResult.tablesCleared,
      };

      return result;
    } catch (error) {
      console.error('Error in onWipe:', error);

      // Return error result
      return {
        success: false,
        nextScreen: 'onboarding',
        timestamp: Date.now(),
        reason,
      };
    }
  }

  /**
   * Check if currently in despair mode
   */
  async isDespairMode(): Promise<boolean> {
    const state = await getAppState();
    return state === 'despair';
  }

  /**
   * Get current app state
   */
  async getCurrentState(): Promise<AppState> {
    return await getAppState();
  }

  /**
   * Exit despair mode and go to onboarding
   * No waiting period - immediate re-setup allowed
   */
  async exitDespairMode(): Promise<void> {
    // Update state to onboarding
    await updateAppState('onboarding');

    // Trigger despair exit callbacks
    this.triggerDespairExitCallbacks();
  }

  /**
   * Check if re-setup is allowed
   * Always returns true - immediate re-setup allowed (no lockout period)
   */
  async canResetup(): Promise<boolean> {
    return true;
  }

  /**
   * Check if there is a lockout period
   * Returns false - no lockout period, immediate re-setup allowed
   */
  hasLockoutPeriod(): boolean {
    return false;
  }

  /**
   * Get remaining lockout time in milliseconds
   * Always returns 0 - no lockout period
   */
  async getRemainingLockoutMs(): Promise<number> {
    return 0;
  }

  /**
   * Register callback for despair mode enter
   */
  onDespairEnter(callback: DespairEnterCallback): void {
    this.despairEnterCallbacks.push(callback);
  }

  /**
   * Register callback for despair mode exit
   */
  onDespairExit(callback: DespairExitCallback): void {
    this.despairExitCallbacks.push(callback);
  }

  /**
   * Trigger all despair enter callbacks
   */
  private triggerDespairEnterCallbacks(event: DespairEvent): void {
    this.despairEnterCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in despair enter callback:', error);
      }
    });
  }

  /**
   * Trigger all despair exit callbacks
   */
  private triggerDespairExitCallbacks(): void {
    this.despairExitCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in despair exit callback:', error);
      }
    });
  }
}
