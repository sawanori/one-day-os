/**
 * One Day OS - Database Module
 * SQLite database initialization and connection management
 */

import * as SQLite from 'expo-sqlite';
import { IH_CONSTANTS } from '../constants';

const DATABASE_NAME = 'onedayos.db';

/**
 * Opens or creates the database connection
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  return await SQLite.openDatabaseAsync(DATABASE_NAME);
}

/**
 * Initialize database with all required tables
 */
export async function initializeDatabase(): Promise<void> {
  const db = await openDatabase();

  // Create Identity table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS identity (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      anti_vision TEXT NOT NULL,
      identity_statement TEXT NOT NULL,
      one_year_mission TEXT NOT NULL,
      identity_health INTEGER NOT NULL DEFAULT ${IH_CONSTANTS.INITIAL_IH},
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create Quests table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_text TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  // Create Notifications table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_time TEXT NOT NULL,
      responded_at TEXT,
      timeout_at TEXT,
      is_missed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Create Daily State table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_date TEXT NOT NULL,
      last_reset_at TEXT NOT NULL
    );
  `);

  // Create App State table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      state TEXT NOT NULL CHECK (state IN ('onboarding', 'active', 'despair')),
      updated_at TEXT NOT NULL
    );
  `);

  // Initialize app state to 'onboarding' if not exists
  await db.execAsync(`
    INSERT OR IGNORE INTO app_state (id, state, updated_at)
    VALUES (1, 'onboarding', datetime('now'));
  `);

  console.log('Database initialized successfully');
}

/**
 * Reset all tables (for testing or despair mode)
 */
export async function resetDatabase(): Promise<void> {
  const db = await openDatabase();

  await db.execAsync(`
    DELETE FROM identity;
    DELETE FROM quests;
    DELETE FROM notifications;
    DELETE FROM daily_state;
    UPDATE app_state SET state = 'onboarding', updated_at = datetime('now') WHERE id = 1;
  `);

  console.log('Database reset complete');
}

/**
 * Get current app state
 */
export async function getAppState(): Promise<'onboarding' | 'active' | 'despair'> {
  const db = await openDatabase();
  const result = await db.getFirstAsync<{ state: string }>(`
    SELECT state FROM app_state WHERE id = 1
  `);

  return (result?.state as 'onboarding' | 'active' | 'despair') || 'onboarding';
}

/**
 * Update app state
 */
export async function updateAppState(state: 'onboarding' | 'active' | 'despair'): Promise<void> {
  const db = await openDatabase();

  await db.runAsync(`
    UPDATE app_state
    SET state = ?, updated_at = datetime('now')
    WHERE id = 1
  `, [state]);

  console.log(`App state updated to: ${state}`);
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  // expo-sqlite doesn't require explicit closing in newer versions
  // This function exists for API compatibility
  console.log('Database connection managed by Expo SQLite');
}
