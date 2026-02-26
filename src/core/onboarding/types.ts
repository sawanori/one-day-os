/**
 * One Day OS - Onboarding Types
 * Type definitions and constants for the unified 7-step onboarding flow
 */

/**
 * Onboarding step types - unified 7-step flow
 */
export type OnboardingStep =
  | 'covenant'
  | 'excavation'
  | 'identity'
  | 'mission'
  | 'quests'
  | 'optical_calibration'
  | 'first_judgment'
  | 'complete';

/**
 * Step data types for each step
 * Ceremony steps (covenant, optical_calibration, first_judgment) use null
 */
export type StepData =
  | null // covenant, optical_calibration, first_judgment steps
  | { antiVision: string } // excavation step
  | { identity: string } // identity step
  | { mission: string } // mission step
  | { quests: [string, string] }; // quests step

/**
 * Complete onboarding data
 */
export interface OnboardingData {
  antiVision: string;
  identity: string;
  mission: string;
  quests: [string, string];
}

/**
 * Event data for onboarding completion
 */
export interface OnboardingCompleteEvent {
  timestamp: number;
  data: OnboardingData;
}

/**
 * Event data for step change
 */
export interface StepChangeEvent {
  from: OnboardingStep;
  to: OnboardingStep;
  timestamp: number;
}

/**
 * Step order definition - unified 7-step flow
 */
export const STEP_ORDER: OnboardingStep[] = [
  'covenant',
  'excavation',
  'identity',
  'mission',
  'quests',
  'optical_calibration',
  'first_judgment',
  'complete',
];

/**
 * Ceremony steps that don't save data to DB
 */
export const CEREMONY_STEPS: OnboardingStep[] = [
  'covenant',
  'optical_calibration',
  'first_judgment',
];
