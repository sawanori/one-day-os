import { SQLiteDatabase } from 'expo-sqlite';
import { DailyStateRow } from './types';
import { getLocalDatetime } from '../../utils/date';

export class DailyStateRepository {
  constructor(private db: SQLiteDatabase) {}

  async initializeDailyState(today: string): Promise<void> {
    const now = getLocalDatetime();
    await this.db.runAsync(
      `INSERT OR IGNORE INTO daily_state (id, current_date, last_reset_at)
       VALUES (1, ?, ?)`,
      [today, now]
    );
  }

  async getDailyState(): Promise<DailyStateRow | null> {
    const result = await this.db.getFirstAsync<DailyStateRow>(
      'SELECT * FROM daily_state WHERE id = 1'
    );
    return result || null;
  }

  async updateDailyState(today: string): Promise<void> {
    const now = getLocalDatetime();
    await this.db.runAsync(
      `UPDATE daily_state SET current_date = ?, last_reset_at = ? WHERE id = 1`,
      [today, now]
    );
  }

  async getIncompleteQuestCount(date: string): Promise<{ total: number; completed: number }> {
    const result = await this.db.getFirstAsync<{ total: number; completed: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
      FROM quests WHERE DATE(created_at) = ?`,
      [date]
    );
    return {
      total: result?.total ?? 0,
      completed: result?.completed ?? 0,
    };
  }

  /**
   * Delete all quests not created on the given date (local date).
   * Uses DELETE instead of is_completed reset because morning.tsx
   * inserts fresh quests each day — old quests should be purged entirely.
   * @param today - Local date in YYYY-MM-DD format
   */
  async resetDailyQuests(today: string): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM quests WHERE DATE(created_at) != ?`,
      [today]
    );
  }
}
