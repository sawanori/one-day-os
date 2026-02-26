/**
 * One Day OS - JudgmentTimingEngine
 * Intelligent timing adjustment and context-aware category selection.
 *
 * Implements evasion detection (§4-2) and intelligent category selection (§4-3)
 * from the Judgment UX specification.
 *
 * Detection Patterns:
 *   1. Long inactivity (2h+) → fire immediately ("逃げたな")
 *   2. Quests incomplete + after 16:00 → concentrate remaining in 16:00-22:00
 *   3. Previous response NO/TIMEOUT → next within 30 min
 *   4. All YES consecutive → maintain minimum interval (obligation)
 */

import { getDB } from '../../database/client';
import { DB_TABLES, JUDGMENT_CONSTANTS } from '../../constants';
import type { JudgmentCategory, JudgmentResponse } from '../../constants';
import type { JudgmentScheduleRecord } from './JudgmentEngine';

/**
 * Minimal interface for the JudgmentEngine methods used by JudgmentTimingEngine.
 * Avoids circular dependency by not importing the class directly.
 */
interface JudgmentEngineAPI {
  getUnfiredJudgments(date: string, currentTime: string): Promise<JudgmentScheduleRecord[]>;
  getLastResponse(date: string): Promise<{ response: string } | null>;
  rescheduleJudgment(scheduleId: number, newTime: string): Promise<void>;
}

/** Context for intelligent category selection */
export interface JudgmentContext {
  questsCompleted: boolean;
  lastResponse: JudgmentResponse | null;
  currentIH: number;
  hourOfDay: number;
}

/** Timing adjustment result from evasion detection */
export interface TimingAdjustment {
  /** Whether to fire a judgment immediately on resume */
  fireImmediately: boolean;
  /** Schedule IDs to reschedule, with new times */
  reschedules: Array<{ scheduleId: number; newTime: string }>;
  /** Detection pattern that triggered the adjustment */
  reason: 'long_inactivity' | 'quests_incomplete_late' | 'previous_failure' | 'all_yes' | 'none';
}

/** Minimum inactivity duration in milliseconds to trigger "逃げたな" (2 hours) */
const LONG_INACTIVITY_MS = 2 * 60 * 60 * 1000;

/** Hour threshold for quest-incomplete concentration */
const QUEST_LATE_HOUR = 16;

/** Minutes within which to reschedule after NO/TIMEOUT */
const FAILURE_RESCHEDULE_MINUTES = 30;

export class JudgmentTimingEngine {
  /**
   * Evaluate context on foreground resume and return timing adjustments.
   *
   * @param engine - JudgmentEngine instance (or any object implementing JudgmentEngineAPI)
   * @param lastBackgroundTime - Timestamp (ms) when app went to background, or null if unknown
   * @param today - Today's date in YYYY-MM-DD format
   * @param currentTime - Current time in HH:MM format
   */
  static async evaluateOnResume(
    engine: JudgmentEngineAPI,
    lastBackgroundTime: number | null,
    today: string,
    currentTime: string
  ): Promise<TimingAdjustment> {
    const now = Date.now();

    // Get unfired future judgments
    const unfired = await engine.getUnfiredJudgments(today, currentTime);
    if (unfired.length === 0) {
      return { fireImmediately: false, reschedules: [], reason: 'none' };
    }

    // Pattern 1: Long inactivity (2h+)
    if (lastBackgroundTime !== null) {
      const inactivityMs = now - lastBackgroundTime;
      if (inactivityMs >= LONG_INACTIVITY_MS) {
        return { fireImmediately: true, reschedules: [], reason: 'long_inactivity' };
      }
    }

    // Get last response for pattern 3 check
    const lastLog = await engine.getLastResponse(today);
    const lastResponse = lastLog ? (lastLog.response as JudgmentResponse) : null;

    // Pattern 3: Previous response was NO or TIMEOUT → next within 30 min
    if (lastResponse === 'NO' || lastResponse === 'TIMEOUT') {
      const reschedules = JudgmentTimingEngine.rescheduleNextWithin(
        unfired,
        currentTime,
        FAILURE_RESCHEDULE_MINUTES
      );
      if (reschedules.length > 0) {
        return { fireImmediately: false, reschedules, reason: 'previous_failure' };
      }
    }

    // Pattern 2: Quests incomplete + after 16:00
    const currentHour = parseInt(currentTime.split(':')[0], 10);
    if (currentHour >= QUEST_LATE_HOUR) {
      const questsCompleted = await JudgmentTimingEngine.areAllQuestsCompleted();
      if (!questsCompleted) {
        const reschedules = JudgmentTimingEngine.concentrateInWindow(
          unfired,
          currentTime,
          JUDGMENT_CONSTANTS.ACTIVE_HOURS.end
        );
        if (reschedules.length > 0) {
          return { fireImmediately: false, reschedules, reason: 'quests_incomplete_late' };
        }
      }
    }

    // Pattern 4: All YES consecutive → maintain minimum interval (no adjustment needed)
    // This is an explicit "do nothing" — the obligation continues as scheduled
    if (lastResponse === 'YES') {
      return { fireImmediately: false, reschedules: [], reason: 'all_yes' };
    }

    return { fireImmediately: false, reschedules: [], reason: 'none' };
  }

  /**
   * Context-aware category selection.
   * Replaces random category assignment with intelligent selection based on user state.
   */
  static selectCategory(context: JudgmentContext): JudgmentCategory {
    const { questsCompleted, lastResponse, currentIH, hourOfDay } = context;

    // Quests incomplete + after 15:00 → EVASION
    if (!questsCompleted && hourOfDay >= 15) {
      return 'EVASION';
    }

    // Previous NO → DISSONANCE
    if (lastResponse === 'NO') {
      return 'DISSONANCE';
    }

    // IH < 50 → ANTI_VISION
    if (currentIH < 50) {
      return 'ANTI_VISION';
    }

    // Previous TIMEOUT → SURVIVAL
    if (lastResponse === 'TIMEOUT') {
      return 'SURVIVAL';
    }

    // Default → random from all 5
    const allCategories: JudgmentCategory[] = [
      'EVASION', 'OBSERVER', 'DISSONANCE', 'ANTI_VISION', 'SURVIVAL',
    ];
    return allCategories[Math.floor(Math.random() * allCategories.length)];
  }

  /**
   * Apply timing adjustments by rescheduling unfired judgments in the database.
   */
  static async applyTimingAdjustment(
    engine: JudgmentEngineAPI,
    adjustment: TimingAdjustment
  ): Promise<void> {
    for (const { scheduleId, newTime } of adjustment.reschedules) {
      await engine.rescheduleJudgment(scheduleId, newTime);
    }
  }

  /**
   * Build a JudgmentContext from current app state for category selection.
   *
   * @param engine - JudgmentEngine instance
   * @param today - Today's date in YYYY-MM-DD format
   * @param currentTime - Current time in HH:MM format
   */
  static async buildContext(
    engine: JudgmentEngineAPI,
    today: string,
    currentTime: string
  ): Promise<JudgmentContext> {
    const currentHour = parseInt(currentTime.split(':')[0], 10);

    const questsCompleted = await JudgmentTimingEngine.areAllQuestsCompleted();
    const lastLog = await engine.getLastResponse(today);
    const lastResponse = lastLog ? (lastLog.response as JudgmentResponse) : null;

    // Get current IH from identity table
    const db = getDB();
    const identity = db.getFirstSync<{ identity_health: number }>(
      `SELECT identity_health FROM ${DB_TABLES.IDENTITY} WHERE id = 1`
    );
    const currentIH = identity?.identity_health ?? 100;

    return {
      questsCompleted,
      lastResponse,
      currentIH,
      hourOfDay: currentHour,
    };
  }

  /**
   * Check if all quests for today are completed.
   */
  static async areAllQuestsCompleted(): Promise<boolean> {
    const db = getDB();
    const result = db.getFirstSync<{ total: number; completed: number }>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
       FROM ${DB_TABLES.QUESTS}`
    );

    if (!result || result.total === 0) {
      // No quests = considered "completed" (no penalty context)
      return true;
    }

    return result.completed === result.total;
  }

  /**
   * Reschedule the next unfired judgment to be within `withinMinutes` from now.
   * Only reschedules if the next judgment is farther away than the target.
   */
  private static rescheduleNextWithin(
    unfired: JudgmentScheduleRecord[],
    currentTime: string,
    withinMinutes: number
  ): Array<{ scheduleId: number; newTime: string }> {
    if (unfired.length === 0) return [];

    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const next = unfired[0];
    const [nextHour, nextMinute] = next.scheduled_time.split(':').map(Number);
    const nextTotalMinutes = nextHour * 60 + nextMinute;

    // Only reschedule if the next judgment is farther than withinMinutes
    if (nextTotalMinutes - currentTotalMinutes > withinMinutes) {
      const targetMinutes = currentTotalMinutes + withinMinutes;
      const endMinutes = JUDGMENT_CONSTANTS.ACTIVE_HOURS.end * 60;

      // Don't schedule beyond active hours
      if (targetMinutes >= endMinutes) return [];

      const newHour = Math.floor(targetMinutes / 60);
      const newMinute = targetMinutes % 60;
      const newTime = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;

      return [{ scheduleId: next.id, newTime }];
    }

    return [];
  }

  /**
   * Concentrate remaining unfired judgments evenly within a time window.
   * Used when quests are incomplete after 16:00.
   */
  private static concentrateInWindow(
    unfired: JudgmentScheduleRecord[],
    currentTime: string,
    endHour: number
  ): Array<{ scheduleId: number; newTime: string }> {
    if (unfired.length === 0) return [];

    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const endMinutes = endHour * 60;
    const availableMinutes = endMinutes - currentTotalMinutes;

    if (availableMinutes <= 0) return [];

    // Space judgments evenly within the remaining window
    const count = unfired.length;
    const spacing = Math.floor(availableMinutes / (count + 1));

    // Only reschedule if spacing is reasonable (at least 10 min)
    if (spacing < 10) return [];

    const reschedules: Array<{ scheduleId: number; newTime: string }> = [];

    for (let i = 0; i < count; i++) {
      const targetMinutes = currentTotalMinutes + spacing * (i + 1);

      // Don't exceed active hours
      if (targetMinutes >= endMinutes) break;

      const newHour = Math.floor(targetMinutes / 60);
      const newMinute = targetMinutes % 60;
      const newTime = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;

      // Only include if actually different from current schedule
      if (newTime !== unfired[i].scheduled_time) {
        reschedules.push({ scheduleId: unfired[i].id, newTime });
      }
    }

    return reschedules;
  }
}
