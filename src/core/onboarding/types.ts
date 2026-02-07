/**
 * One Day OS - Onboarding Types
 * Type definitions and constants for the onboarding flow
 */

/**
 * Onboarding step types
 */
export type OnboardingStep =
  | 'welcome'
  | 'anti-vision'
  | 'identity'
  | 'mission'
  | 'quests'
  | 'complete';

/**
 * Step data types for each step
 */
export type StepData =
  | null // welcome step
  | { antiVision: string } // anti-vision step
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
 * Step order definition
 */
export const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'anti-vision',
  'identity',
  'mission',
  'quests',
  'complete',
];
