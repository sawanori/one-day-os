/**
 * One Day OS - Constants
 * Core constants for Identity Health (IH) calculations and notifications
 */

import i18n from 'i18next';

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

// Reflection Questions for Notifications (6 questions, one per daily notification)
// Dynamic getter for reflection questions (i18n-aware)
export const getReflectionQuestions = (): string[] => [
  i18n.t('reflection.q1'),
  i18n.t('reflection.q2'),
  i18n.t('reflection.q3'),
  i18n.t('reflection.q4'),
  i18n.t('reflection.q5'),
  i18n.t('reflection.q6'),
];

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
  JUDGMENT_LOG: 'judgment_log',
  JUDGMENT_SCHEDULE: 'daily_judgment_schedule',
  IDENTITY_BACKUP: 'identity_backup',
  INSURANCE_PURCHASES: 'insurance_purchases',
} as const;

// App States
export const APP_STATES = {
  ONBOARDING: 'onboarding',
  ACTIVE: 'active',
  DESPAIR: 'despair',
} as const;

// Judgment System Constants
export const JUDGMENT_CONSTANTS = {
  ACTIVE_HOURS: { start: 6, end: 22 },
  COUNT_PER_DAY: 5,
  MIN_INTERVAL_MINUTES: 60,
  MAX_INTERVAL_MINUTES: 240,
  IN_APP_TIMEOUT_SECONDS: 5,
  OS_NOTIFICATION_TIMEOUT_MINUTES: 5,
  ANTI_VISION_FRAGMENT_MIN_LENGTH: 50,
  /** Seconds user has to open the app after summons notification */
  SUMMONS_TIMEOUT_SECONDS: 180,
  /** IH penalty for not opening app within SUMMONS_TIMEOUT_SECONDS */
  SUMMONS_MISSED_PENALTY: 5,
  /** IH penalty for 5-second in-app timeout (silence = defeat) */
  JUDGMENT_TIMEOUT_PENALTY: 25,
  /** Minutes after scheduled time before a judgment is considered expired (auto-resolve) */
  SUMMONS_EXPIRY_MINUTES: 30,
} as const;

// Judgment Categories
export type JudgmentCategory = 'EVASION' | 'OBSERVER' | 'DISSONANCE' | 'ANTI_VISION' | 'SURVIVAL';

// Judgment Response (distinct from NotificationResponse for clarity)
export type JudgmentResponse = 'YES' | 'NO' | 'TIMEOUT' | 'IGNORED' | 'SUMMONS_EXPIRED';

// Evening Audit Constants
export const EVENING_AUDIT_CONSTANTS = {
  RESTORE_AMOUNT: 10,  // IH restored on victory
  PENALTY_AMOUNT: 20,  // IH damage on loss
} as const;

// Insurance System Constants
export const INSURANCE_CONSTANTS = {
  OFFER_TIMEOUT_SECONDS: 10,
  REVIVAL_IH: 10,
  WIPE_PAUSE_PERCENT: 95,
  PRODUCT_ID_IOS: 'com.nonturn.onedayos.identity_insurance',
  PRODUCT_ID_ANDROID: 'identity_insurance',
  PRICE_DISPLAY: '¥1,500',
} as const;
