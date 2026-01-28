/**
 * One Day OS - NotificationHandler
 * Handles notification responses and timeout detection
 */

import * as SQLite from 'expo-sqlite';
import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import { IdentityEngine } from '../core/identity/IdentityEngine';
import { NOTIFICATION_SCHEDULE } from '../constants';

/**
 * Notification record from database
 */
export interface NotificationRecord {
  id: number;
  scheduled_time: string;
  responded_at: string | null;
  timeout_at: string | null;
  is_missed: number;
  created_at: string;
}

/**
 * Result of handling a notification response
 */
export interface HandleResponseResult {
  success: boolean;
  ihDelta: number;
  newIH: number;
  wipeTriggered: boolean;
  delta: number;
}

/**
 * NotificationHandler - Manages notification responses and timeouts
 */
export class NotificationHandler {
  private db: SQLite.SQLiteDatabase | null = null;
  private engine: IdentityEngine | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private initialized: boolean = false;

  constructor() {}

  /**
   * Initialize the handler
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Get IdentityEngine instance
    this.engine = await IdentityEngine.getInstance();

    // Open database
    this.db = await SQLite.openDatabaseAsync('onedayos.db');

    // Register AppState listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    this.initialized = true;
  }

  /**
   * Dispose and cleanup
   */
  public async dispose(): Promise<void> {
    // Remove AppState listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.initialized = false;
    this.db = null;
    this.engine = null;
  }

  /**
   * Handle AppState changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      // Check for timeouts when app comes to foreground
      this.checkTimeoutsOnResume().catch((error) => {
        console.error('Error checking timeouts on resume:', error);
      });
    }
  };

  /**
   * Handle user response to notification
   */
  public async handleResponse(
    notificationId: string,
    response: 'YES' | 'NO'
  ): Promise<HandleResponseResult> {
    this.ensureInitialized();

    // Validate inputs
    if (!notificationId || notificationId === '') {
      throw new Error('Notification ID cannot be empty');
    }

    if (notificationId === null || notificationId === undefined) {
      throw new Error('Notification ID cannot be null or undefined');
    }

    if (response !== 'YES' && response !== 'NO') {
      throw new Error(`Invalid response type: ${response}`);
    }

    // Check if already responded
    const existing = await this.db!.getFirstAsync<NotificationRecord>(
      'SELECT * FROM notifications WHERE id = ?',
      [notificationId]
    );

    if (existing && existing.responded_at) {
      // Already responded - don't call engine again, just return success
      const currentIH = await this.engine!.getCurrentIH();
      return {
        success: true,
        ihDelta: 0,
        newIH: currentIH,
        wipeTriggered: await this.engine!.isWipeNeeded(),
        delta: 0,
      };
    }

    // Save response to DB (using ISO timestamp)
    const responseTime = new Date().toISOString();
    await this.db!.runAsync(
      'UPDATE notifications SET responded_at = ? WHERE id = ?',
      [responseTime, notificationId]
    );

    // Apply response to IdentityEngine
    const result = await this.engine!.applyNotificationResponse(response);

    // Check if wipe is needed
    const wipeTriggered = await this.engine!.isWipeNeeded();

    return {
      success: true,
      ihDelta: result.delta,
      newIH: result.newIH,
      wipeTriggered,
      delta: result.delta,
    };
  }

  /**
   * Track when a notification is fired
   */
  public async recordNotificationFired(
    _notificationId: string, // Reserved for future use
    scheduledTime: Date
  ): Promise<void> {
    this.ensureInitialized();

    const scheduledTimeISO = scheduledTime.toISOString();
    const createdAt = new Date().toISOString();
    const timeoutAt = new Date(scheduledTime.getTime() + NOTIFICATION_SCHEDULE.TIMEOUT_MS).toISOString();

    await this.db!.runAsync(
      'INSERT INTO notifications (scheduled_time, timeout_at, created_at) VALUES (?, ?, ?)',
      [scheduledTimeISO, timeoutAt, createdAt]
    );
  }

  /**
   * Check for timed-out notifications on app resume
   */
  public async checkTimeoutsOnResume(): Promise<void> {
    this.ensureInitialized();

    const now = Date.now();
    const _timeoutThreshold = now - NOTIFICATION_SCHEDULE.TIMEOUT_MS; // Reserved for future validation

    // Get all unanswered notifications
    const pending = await this.db!.getAllAsync<NotificationRecord>(
      'SELECT * FROM notifications WHERE responded_at IS NULL'
    );

    // Process each pending notification
    for (const notification of pending) {
      const scheduledTime = new Date(notification.scheduled_time).getTime();
      const elapsed = now - scheduledTime;

      // Check if timeout has occurred (strictly greater than threshold)
      if (elapsed > NOTIFICATION_SCHEDULE.TIMEOUT_MS) {
        // Mark as timed out in DB
        const timeoutTime = new Date().toISOString();
        await this.db!.runAsync(
          'UPDATE notifications SET timeout_at = ? WHERE id = ?',
          [timeoutTime, notification.id]
        );

        // Apply IGNORED penalty through IdentityEngine
        await this.engine!.applyNotificationResponse('IGNORED');
      }
    }
  }

  /**
   * Get list of pending (unanswered) notifications
   */
  public async getPendingNotifications(): Promise<NotificationRecord[]> {
    this.ensureInitialized();

    const pending = await this.db!.getAllAsync<NotificationRecord>(
      'SELECT * FROM notifications WHERE responded_at IS NULL'
    );

    // Additional client-side filtering as safety measure
    return pending.filter(n => !n.responded_at);
  }

  /**
   * Ensure handler is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.db || !this.engine) {
      throw new Error('NotificationHandler not initialized. Call initialize() first.');
    }
  }
}
