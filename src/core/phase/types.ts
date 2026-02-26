export type Phase = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface PhaseTimeRange {
  start: number;
  end: number;
}

export interface PhaseChangeEvent {
  previousPhase: Phase;
  newPhase: Phase;
  timestamp: number;
}
