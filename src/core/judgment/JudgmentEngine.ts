/**
 * One Day OS - JudgmentEngine
 * Core engine for the Judgment notification system
 * Manages judgment scheduling, response recording, and IH impact
 */

import * as SQLite from 'expo-sqlite';
import { getDB } from '../../database/client';
import { IdentityEngine } from '../identity/IdentityEngine';
import { HapticEngine } from '../HapticEngine';
import { IH_CONSTANTS, JUDGMENT_CONSTANTS, DB_TABLES } from '../../constants';
import type { JudgmentCategory, JudgmentResponse } from '../../constants';
import type { IHResponse } from '../identity/types';
import { getLocalDatetime } from '../../utils/date';

/** Judgment log record from database */
export interface JudgmentLogRecord {
  id: number;
  schedule_id: number | null;
  category: string;
  question_key: string;
  question_rendered: string | null;
  response: string;
  ih_before: number;
  ih_after: number;
  response_time_ms: number | null;
  scheduled_at: string;
  responded_at: string | null;
  created_at: string;
}

/** Schedule record from database */
export interface JudgmentScheduleRecord {
  id: number;
  scheduled_date: string;
  scheduled_time: string;
  category: string;
  notification_id: string | null;
  is_fired: number;
  created_at: string;
}

/** Result of handling a judgment response */
export interface JudgmentResult {
  success: boolean;
  response: JudgmentResponse;
  ihBefore: number;
  ihAfter: number;
  delta: number;
  wipeTriggered: boolean;
}

export class JudgmentEngine {
  private static instance: JudgmentEngine | null = null;
  private static initPromise: Promise<JudgmentEngine> | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private identityEngine: IdentityEngine | null = null;
  private initialized: boolean = false;

  private constructor() {}

  public static async getInstance(): Promise<JudgmentEngine> {
    if (!JudgmentEngine.initPromise) {
      const engine = new JudgmentEngine();
      JudgmentEngine.initPromise = engine.initialize().then(() => {
        JudgmentEngine.instance = engine;
        return engine;
      });
    }
    return JudgmentEngine.initPromise;
  }

  public static resetInstance(): void {
    JudgmentEngine.instance = null;
    JudgmentEngine.initPromise = null;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    this.db = getDB();
    this.identityEngine = await IdentityEngine.getInstance();
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db || !this.identityEngine) {
      throw new Error('JudgmentEngine not initialized. Call getInstance() first.');
    }
  }

  /**
   * Record a judgment response and apply IH penalty
   */
  public async recordResponse(
    scheduleId: number | null,
    category: JudgmentCategory,
    questionKey: string,
    questionRendered: string | null,
    response: JudgmentResponse,
    responseTimeMs: number | null,
    scheduledAt: string
  ): Promise<JudgmentResult> {
    this.ensureInitialized();

    // Get current IH before applying penalty
    const ihBefore = await this.identityEngine!.getCurrentIH();

    // Apply penalty based on response
    let ihResponse: IHResponse;
    switch (response) {
      case 'YES':
        // No penalty, but still record
        ihResponse = { previousIH: ihBefore, newIH: ihBefore, delta: 0, timestamp: Date.now() };
        break;
      case 'NO':
        ihResponse = await this.identityEngine!.applyNotificationResponse('NO');
        break;
      case 'TIMEOUT': {
        // Summons model: 5-second in-app timeout = IH -25 (silence is defeat)
        const penalty = JUDGMENT_CONSTANTS.JUDGMENT_TIMEOUT_PENALTY;
        const newIH = Math.max(0, ihBefore - penalty);
        await this.identityEngine!.setCurrentIH(newIH);
        ihResponse = { previousIH: ihBefore, newIH, delta: newIH - ihBefore, timestamp: Date.now() };
        break;
      }
      case 'IGNORED':
        ihResponse = await this.identityEngine!.applyNotificationResponse('IGNORED');
        break;
      case 'SUMMONS_EXPIRED': {
        // Auto-resolved: judgment was >30 min old, apply summons missed penalty only
        const penalty = JUDGMENT_CONSTANTS.SUMMONS_MISSED_PENALTY;
        const newIH = Math.max(0, ihBefore - penalty);
        await this.identityEngine!.setCurrentIH(newIH);
        ihResponse = { previousIH: ihBefore, newIH, delta: newIH - ihBefore, timestamp: Date.now() };
        break;
      }
      default:
        throw new Error(`Invalid response type: ${response}`);
    }

    // Trigger appropriate haptics
    switch (response) {
      case 'YES':
        await HapticEngine.judgmentYes();
        break;
      case 'NO':
        await HapticEngine.judgmentNo();
        break;
      case 'TIMEOUT':
        await HapticEngine.judgmentTimeout();
        break;
      case 'IGNORED':
      case 'SUMMONS_EXPIRED':
        // No haptic for background responses
        break;
    }

    // Record to judgment_log
    const now = getLocalDatetime();
    const respondedAt = (response === 'IGNORED' || response === 'SUMMONS_EXPIRED') ? null : now;
    await this.db!.runAsync(
      `INSERT INTO ${DB_TABLES.JUDGMENT_LOG} (schedule_id, category, question_key, question_rendered, response, ih_before, ih_after, response_time_ms, scheduled_at, responded_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scheduleId,
        category,
        questionKey,
        questionRendered,
        response,
        ihResponse.previousIH,
        ihResponse.newIH,
        responseTimeMs,
        scheduledAt,
        respondedAt,
        now,
      ]
    );

    // setCurrentIH() fires wipe callbacks when IH reaches 0;
    // wipeTriggered is determined directly from the IH result
    const wipeTriggered = ihResponse.newIH === 0;

    return {
      success: true,
      response,
      ihBefore: ihResponse.previousIH,
      ihAfter: ihResponse.newIH,
      delta: ihResponse.delta,
      wipeTriggered,
    };
  }

  /**
   * Apply the summons missed penalty (-5 IH) when user didn't open the app
   * within the 3-minute summons window.
   * This is separate from the judgment response — it penalizes tardiness,
   * not the answer itself.
   */
  public async applySummonsPenalty(
    scheduleId: number | null,
    scheduledAt: string
  ): Promise<{ wipeTriggered: boolean }> {
    this.ensureInitialized();

    const scheduledTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - scheduledTime) / 1000;

    // Only apply if the summons window has actually elapsed
    if (elapsedSeconds <= JUDGMENT_CONSTANTS.SUMMONS_TIMEOUT_SECONDS) {
      return { wipeTriggered: false };
    }

    const ihBefore = await this.identityEngine!.getCurrentIH();
    const penalty = JUDGMENT_CONSTANTS.SUMMONS_MISSED_PENALTY;
    const newIH = Math.max(0, ihBefore - penalty);
    await this.identityEngine!.setCurrentIH(newIH);

    // Log the summons penalty (separate from the judgment response log)
    // This is recorded as metadata; the actual judgment YES/NO/TIMEOUT is logged separately
    console.log(
      `[JudgmentEngine] Summons penalty applied: scheduleId=${scheduleId}, IH ${ihBefore} → ${newIH} (-${penalty})`
    );

    return { wipeTriggered: newIH === 0 };
  }

  /**
   * Generate daily judgment schedule (5 random times within active hours)
   * Call this at 6:00 AM or on first app open of the day
   */
  public async generateDailySchedule(date: string): Promise<JudgmentScheduleRecord[]> {
    this.ensureInitialized();

    // Check if schedule already exists for this date
    const existing = await this.db!.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${DB_TABLES.JUDGMENT_SCHEDULE} WHERE scheduled_date = ?`,
      [date]
    );

    if (existing && existing.count > 0) {
      // Return existing schedule
      return this.getScheduleForDate(date);
    }

    const { start, end } = JUDGMENT_CONSTANTS.ACTIVE_HOURS;
    const count = JUDGMENT_CONSTANTS.COUNT_PER_DAY;
    const minInterval = JUDGMENT_CONSTANTS.MIN_INTERVAL_MINUTES;

    // Generate random times with minimum interval constraint
    const times = this.generateRandomTimes(start, end, count, minInterval);
    const categories = this.assignCategories(count);
    const now = getLocalDatetime();
    const records: JudgmentScheduleRecord[] = [];

    for (let i = 0; i < count; i++) {
      const scheduledTime = `${String(times[i].hour).padStart(2, '0')}:${String(times[i].minute).padStart(2, '0')}`;

      const result = await this.db!.runAsync(
        `INSERT INTO ${DB_TABLES.JUDGMENT_SCHEDULE} (scheduled_date, scheduled_time, category, is_fired, created_at)
         VALUES (?, ?, ?, 0, ?)`,
        [date, scheduledTime, categories[i], now]
      );

      records.push({
        id: result.lastInsertRowId,
        scheduled_date: date,
        scheduled_time: scheduledTime,
        category: categories[i],
        notification_id: null,
        is_fired: 0,
        created_at: now,
      });
    }

    return records;
  }

  /**
   * Get a rendered question for a specific schedule entry
   * Used when firing a judgment notification
   */
  public async getRenderedQuestion(
    category: JudgmentCategory
  ): Promise<{ questionKey: string; questionRendered: string }> {
    const { JudgmentQuestionSelector } = await import('./JudgmentQuestionSelector');
    const selected = await JudgmentQuestionSelector.selectQuestion(category);
    return {
      questionKey: selected.questionKey,
      questionRendered: selected.questionRendered,
    };
  }

  /**
   * Get schedule for a specific date
   */
  public async getScheduleForDate(date: string): Promise<JudgmentScheduleRecord[]> {
    this.ensureInitialized();
    return this.db!.getAllAsync<JudgmentScheduleRecord>(
      `SELECT * FROM ${DB_TABLES.JUDGMENT_SCHEDULE} WHERE scheduled_date = ? ORDER BY scheduled_time ASC`,
      [date]
    );
  }

  /**
   * Mark a scheduled judgment as fired
   */
  public async markScheduleFired(scheduleId: number, notificationId?: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.runAsync(
      `UPDATE ${DB_TABLES.JUDGMENT_SCHEDULE} SET is_fired = 1, notification_id = ? WHERE id = ?`,
      [notificationId || null, scheduleId]
    );
  }

  /**
   * Update the notification_id for a schedule entry without marking it as fired.
   * Used when scheduling OS notifications (notification is scheduled, not yet delivered).
   */
  public async updateNotificationId(scheduleId: number, notificationId: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.runAsync(
      `UPDATE ${DB_TABLES.JUDGMENT_SCHEDULE} SET notification_id = ? WHERE id = ?`,
      [notificationId, scheduleId]
    );
  }

  /**
   * Get unfired judgments for today that should have already fired
   * Used when checking for missed judgments on app resume
   */
  public async getOverdueJudgments(date: string, currentTime: string): Promise<JudgmentScheduleRecord[]> {
    this.ensureInitialized();
    return this.db!.getAllAsync<JudgmentScheduleRecord>(
      `SELECT * FROM ${DB_TABLES.JUDGMENT_SCHEDULE}
       WHERE scheduled_date = ? AND scheduled_time <= ? AND is_fired = 0
       ORDER BY scheduled_time ASC`,
      [date, currentTime]
    );
  }

  /**
   * Get the next upcoming judgment for today
   */
  public async getNextJudgment(date: string, currentTime: string): Promise<JudgmentScheduleRecord | null> {
    this.ensureInitialized();
    const result = await this.db!.getFirstAsync<JudgmentScheduleRecord>(
      `SELECT * FROM ${DB_TABLES.JUDGMENT_SCHEDULE}
       WHERE scheduled_date = ? AND scheduled_time > ? AND is_fired = 0
       ORDER BY scheduled_time ASC LIMIT 1`,
      [date, currentTime]
    );
    return result || null;
  }

  /**
   * Get judgment log for today (for scars/tombstones display)
   */
  public async getTodayJudgmentLog(date: string): Promise<JudgmentLogRecord[]> {
    this.ensureInitialized();
    return this.db!.getAllAsync<JudgmentLogRecord>(
      `SELECT * FROM ${DB_TABLES.JUDGMENT_LOG}
       WHERE date(scheduled_at) = ?
       ORDER BY scheduled_at ASC`,
      [date]
    );
  }

  /**
   * Get recent failed judgments for ghost text display (last 48 hours)
   */
  public async getRecentFailedJudgments(): Promise<JudgmentLogRecord[]> {
    this.ensureInitialized();
    return this.db!.getAllAsync<JudgmentLogRecord>(
      `SELECT * FROM ${DB_TABLES.JUDGMENT_LOG}
       WHERE response IN ('NO', 'TIMEOUT', 'IGNORED', 'SUMMONS_EXPIRED')
       AND datetime(created_at) > datetime('now', '-48 hours')
       ORDER BY created_at DESC`
    );
  }

  /**
   * Get the most recent judgment response for today.
   * Returns null if no judgments have been responded to today.
   */
  public async getLastResponse(date: string): Promise<JudgmentLogRecord | null> {
    this.ensureInitialized();
    const result = await this.db!.getFirstAsync<JudgmentLogRecord>(
      `SELECT * FROM ${DB_TABLES.JUDGMENT_LOG}
       WHERE date(scheduled_at) = ?
       ORDER BY created_at DESC LIMIT 1`,
      [date]
    );
    return result || null;
  }

  /**
   * Reschedule an unfired judgment to a new time.
   * Only works if the judgment has not been fired yet.
   * Also clears any existing notification_id so it can be re-scheduled.
   */
  public async rescheduleJudgment(scheduleId: number, newTime: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.runAsync(
      `UPDATE ${DB_TABLES.JUDGMENT_SCHEDULE}
       SET scheduled_time = ?, notification_id = NULL
       WHERE id = ? AND is_fired = 0`,
      [newTime, scheduleId]
    );
  }

  /**
   * Get all unfired judgments that are scheduled in the future (after currentTime).
   */
  public async getUnfiredJudgments(date: string, currentTime: string): Promise<JudgmentScheduleRecord[]> {
    this.ensureInitialized();
    return this.db!.getAllAsync<JudgmentScheduleRecord>(
      `SELECT * FROM ${DB_TABLES.JUDGMENT_SCHEDULE}
       WHERE scheduled_date = ? AND scheduled_time > ? AND is_fired = 0
       ORDER BY scheduled_time ASC`,
      [date, currentTime]
    );
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  public static getTodayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Get current time in HH:MM format
   */
  public static getCurrentTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Generate random times within a range, respecting minimum interval
   */
  private generateRandomTimes(
    startHour: number,
    endHour: number,
    count: number,
    minIntervalMinutes: number
  ): Array<{ hour: number; minute: number }> {
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60;
    const totalRange = endMinutes - startMinutes;

    // Generate random minutes, sort, and ensure minimum spacing
    const times: number[] = [];
    let attempts = 0;
    const maxAttempts = 1000;

    while (times.length < count && attempts < maxAttempts) {
      const randomMinute = startMinutes + Math.floor(Math.random() * totalRange);

      // Check minimum interval against all existing times
      const valid = times.every(t => Math.abs(t - randomMinute) >= minIntervalMinutes);

      if (valid) {
        times.push(randomMinute);
      }
      attempts++;
    }

    // Fallback: if random generation failed, space evenly
    if (times.length < count) {
      times.length = 0;
      const spacing = Math.floor(totalRange / (count + 1));
      for (let i = 1; i <= count; i++) {
        times.push(startMinutes + spacing * i);
      }
    }

    // Sort chronologically
    times.sort((a, b) => a - b);

    return times.map(totalMinutes => ({
      hour: Math.floor(totalMinutes / 60),
      minute: totalMinutes % 60,
    }));
  }

  /**
   * Assign categories to scheduled judgments (basic random assignment)
   * More intelligent selection (based on context) is P6
   */
  private assignCategories(count: number): JudgmentCategory[] {
    const allCategories: JudgmentCategory[] = ['EVASION', 'OBSERVER', 'DISSONANCE', 'ANTI_VISION', 'SURVIVAL'];
    const assigned: JudgmentCategory[] = [];

    // Ensure variety: shuffle all 5 categories, then pick 'count' of them
    const shuffled = [...allCategories].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      assigned.push(shuffled[i % shuffled.length]);
    }

    return assigned;
  }
}
