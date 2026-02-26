/**
 * One Day OS - IH Calculator
 * Stateless calculation logic for Identity Health (IH)
 */

import { IH_CONSTANTS } from '../../constants';
import type { NotificationResponse, QuestCompletion } from './types';

/**
 * IHCalculator - Pure stateless calculation methods for Identity Health
 * All methods are static and have no side effects.
 */
export class IHCalculator {
  /**
   * Clamp IH value to valid range [0, 100]
   */
  static clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  /**
   * Calculate delta for notification response
   * @returns negative delta or 0
   */
  static notificationDelta(response: NotificationResponse): number {
    if (response === 'YES') {
      return 0;
    } else if (response === 'NO') {
      return -IH_CONSTANTS.NOTIFICATION_PENALTY;
    } else if (response === 'IGNORED') {
      return -IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY;
    } else if (response === 'TIMEOUT') {
      return -IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY;
    }
    throw new Error(`Invalid notification response: ${response}`);
  }

  /**
   * Calculate delta for quest penalty
   * @returns -INCOMPLETE_QUEST_PENALTY if any quest incomplete, 0 otherwise
   */
  static questDelta(completion: QuestCompletion): number {
    const anyIncomplete = completion.completedCount < completion.totalCount;
    return anyIncomplete ? -IH_CONSTANTS.INCOMPLETE_QUEST_PENALTY : 0;
  }

  /**
   * Calculate delta for onboarding stagnation penalty
   * @returns -5 (fixed penalty)
   */
  static onboardingStagnationDelta(): number {
    return -5;
  }

  /**
   * Apply a delta to current IH, returning clamped result
   */
  static applyDelta(currentIH: number, delta: number): number {
    return IHCalculator.clamp(currentIH + delta);
  }
}
