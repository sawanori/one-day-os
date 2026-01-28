/**
 * One Day OS - Identity Types
 */

export interface IdentityData {
  antiVision: string;
  identityStatement: string;
  oneYearMission: string;
  identityHealth: number;
}

export interface WipeEvent {
  timestamp: string;
  finalIH: number;
  reason: 'missed_notifications' | 'incomplete_quests' | 'manual';
}

export interface IdentityHealthChange {
  previousIH: number;
  newIH: number;
  change: number;
  reason: string;
  timestamp: string;
}
