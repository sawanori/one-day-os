/**
 * One Day OS - Identity Engine Type Definitions
 * Shared types for Identity Health (IH) system
 */

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
export type NotificationResponse = 'YES' | 'NO' | 'IGNORED' | 'TIMEOUT';
