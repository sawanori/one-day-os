export interface DailyStateRow {
  id: number;
  current_date: string;   // YYYY-MM-DD
  last_reset_at: string;  // ISO datetime
}

export interface DateChangeEvent {
  previousDate: string;
  newDate: string;
  daysMissed: number;
  questPenaltyApplied: boolean;
  timestamp: number;
}

export interface DailyCheckResult {
  dateChanged: boolean;
  previousDate: string | null;
  currentDate: string;
  penaltyApplied: boolean;
}
