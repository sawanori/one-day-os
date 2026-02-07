
import * as SQLite from 'expo-sqlite';

export const dbResult = SQLite.openDatabaseSync('onedayos.db');

export const initDatabase = async () => {
  await dbResult.execAsync(`
    PRAGMA journal_mode = WAL;

    -- Core Identity table (unified)
    -- Stores anti-vision, identity statement, one-year mission, and identity health
    CREATE TABLE IF NOT EXISTS identity (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      anti_vision TEXT NOT NULL,
      identity_statement TEXT NOT NULL,
      one_year_mission TEXT NOT NULL,
      identity_health INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Quests table (daily tasks)
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_text TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    -- Notifications table (6 daily notifications)
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_time TEXT NOT NULL,
      responded_at TEXT,
      timeout_at TEXT,
      is_missed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Daily State table (tracks current day and reset time)
    CREATE TABLE IF NOT EXISTS daily_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_date TEXT NOT NULL,
      last_reset_at TEXT NOT NULL
    );

    -- App State table (onboarding, active, despair)
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      state TEXT NOT NULL CHECK (state IN ('onboarding', 'active', 'despair')),
      updated_at TEXT NOT NULL
    );

    -- Initialize app state to 'onboarding' if not exists
    INSERT OR IGNORE INTO app_state (id, state, updated_at)
    VALUES (1, 'onboarding', datetime('now'));

    -- Legacy table: anti_vision (kept for backward compatibility)
    CREATE TABLE IF NOT EXISTS anti_vision (
      id INTEGER PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      reflection_date TEXT NOT NULL
    );

    -- Legacy table: daily_judgments (kept for backward compatibility)
    CREATE TABLE IF NOT EXISTS daily_judgments (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      question TEXT NOT NULL,
      response TEXT CHECK(response IN ('yes', 'no', 'ignored', 'pending')) DEFAULT 'pending'
    );
  `);
};
