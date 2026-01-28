/**
 * One Day OS - Database Schema
 * Type definitions for database tables
 */

export interface Identity {
  id: 1; // Always 1 (single row table)
  anti_vision: string;
  identity_statement: string;
  one_year_mission: string;
  identity_health: number; // 0-100
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface Quest {
  id: number;
  quest_text: string;
  is_completed: number; // SQLite boolean (0 or 1)
  created_at: string; // ISO datetime
  completed_at: string | null; // ISO datetime
}

export interface Notification {
  id: number;
  scheduled_time: string; // ISO datetime
  responded_at: string | null; // ISO datetime
  timeout_at: string; // ISO datetime (scheduled_time + 5 minutes)
  is_missed: number; // SQLite boolean (0 or 1)
  created_at: string; // ISO datetime
}

export interface DailyState {
  id: 1; // Always 1 (single row table)
  current_date: string; // YYYY-MM-DD
  last_reset_at: string; // ISO datetime
}

export interface AppState {
  id: 1; // Always 1 (single row table)
  state: 'onboarding' | 'active' | 'despair';
  updated_at: string; // ISO datetime
}

// Helper types for insert operations (without auto-generated fields)
export type InsertIdentity = Omit<Identity, 'id' | 'identity_health'>;
export type InsertQuest = Omit<Quest, 'id' | 'is_completed' | 'completed_at'>;
export type InsertNotification = Omit<Notification, 'id' | 'responded_at' | 'is_missed'>;
