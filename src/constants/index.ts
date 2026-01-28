/**
 * One Day OS - Constants
 * Core constants for Identity Health (IH) calculations and notifications
 */

// Identity Health (IH) Constants
export const IH_CONSTANTS = {
  // Penalties
  NOTIFICATION_PENALTY: 15, // -15% for NO/IGNORED notification response
  MISSED_NOTIFICATION_PENALTY: 20, // -20% for missing notification
  INCOMPLETE_QUEST_PENALTY: 20, // -20% if any quest is incomplete

  // Thresholds
  WIPE_THRESHOLD: 0, // Wipe occurs when IH reaches 0%
  INITIAL_IH: 100, // Starting IH value

  // Timeouts
  NOTIFICATION_TIMEOUT_MINUTES: 5, // 5 minutes to respond to notification
} as const;

// Notification Schedule
export const NOTIFICATION_SCHEDULE = {
  TIMES: [
    { hour: 6, minute: 0 },   // 06:00
    { hour: 9, minute: 0 },   // 09:00
    { hour: 12, minute: 0 },  // 12:00
    { hour: 15, minute: 0 },  // 15:00
    { hour: 18, minute: 0 },  // 18:00
    { hour: 21, minute: 0 },  // 21:00
  ],
  TIMEOUT_MS: IH_CONSTANTS.NOTIFICATION_TIMEOUT_MINUTES * 60 * 1000,
} as const;

// Five Questions for Notifications
export const FIVE_QUESTIONS = [
  "あなたは誰か？",
  "あなたは何をしているか？",
  "なぜそれをしているのか？",
  "それはあなたのアイデンティティと一致しているか？",
  "次に何をするか？",
  "何を避けようとしているか？",
] as const;

// Phase Time Ranges
export const PHASE_TIMES = {
  MORNING: { start: 6, end: 12 },   // 06:00 - 12:00
  AFTERNOON: { start: 12, end: 18 }, // 12:00 - 18:00
  EVENING: { start: 18, end: 24 },   // 18:00 - 24:00
  NIGHT: { start: 0, end: 6 },       // 00:00 - 06:00
} as const;

// Database Tables
export const DB_TABLES = {
  IDENTITY: 'identity',
  QUESTS: 'quests',
  NOTIFICATIONS: 'notifications',
  DAILY_STATE: 'daily_state',
} as const;

// App States
export const APP_STATES = {
  ONBOARDING: 'onboarding',
  ACTIVE: 'active',
  DESPAIR: 'despair',
} as const;
