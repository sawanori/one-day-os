/**
 * One Day OS - Phase Types
 */

export type PhaseType = 'morning' | 'afternoon' | 'evening' | 'night';

export interface PhaseTimeRange {
  start: number; // Hour (0-23)
  end: number; // Hour (0-24)
}

export interface PhaseState {
  currentPhase: PhaseType;
  allowedLayers: string[];
  isTransitionPeriod: boolean;
}
