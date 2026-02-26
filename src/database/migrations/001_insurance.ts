/**
 * Migration 001: Insurance System
 * Adds insurance-related columns to app_state table
 */
import * as SQLite from 'expo-sqlite';

export async function migrate001Insurance(db: SQLite.SQLiteDatabase): Promise<void> {
  // Check if columns already exist (idempotent)
  const tableInfo = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(app_state)"
  );
  const existingColumns = tableInfo.map(col => col.name);

  if (!existingColumns.includes('has_used_insurance')) {
    await db.execAsync(
      'ALTER TABLE app_state ADD COLUMN has_used_insurance INTEGER NOT NULL DEFAULT 0'
    );
  }

  if (!existingColumns.includes('life_number')) {
    await db.execAsync(
      'ALTER TABLE app_state ADD COLUMN life_number INTEGER NOT NULL DEFAULT 1'
    );
  }
}
