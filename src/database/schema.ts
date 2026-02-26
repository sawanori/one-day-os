
import * as SQLite from 'expo-sqlite';
import { migrate001Insurance } from './migrations/001_insurance';

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

    -- Judgment Log table (records all judgment responses)
    CREATE TABLE IF NOT EXISTS judgment_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER,
      category TEXT NOT NULL,
      question_key TEXT NOT NULL,
      question_rendered TEXT,
      response TEXT NOT NULL,
      ih_before INTEGER NOT NULL,
      ih_after INTEGER NOT NULL,
      response_time_ms INTEGER,
      scheduled_at TEXT NOT NULL,
      responded_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (schedule_id) REFERENCES daily_judgment_schedule(id)
    );

    -- Daily Judgment Schedule table (pre-scheduled random judgment times)
    CREATE TABLE IF NOT EXISTS daily_judgment_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      category TEXT NOT NULL,
      notification_id TEXT,
      is_fired INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Identity backup (temporary, for insurance recovery)
    CREATE TABLE IF NOT EXISTS identity_backup (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      anti_vision TEXT NOT NULL,
      identity_statement TEXT NOT NULL,
      one_year_mission TEXT NOT NULL,
      original_ih INTEGER NOT NULL,
      backed_up_at TEXT NOT NULL
    );

    -- Insurance purchases history (permanent, survives wipe)
    CREATE TABLE IF NOT EXISTS insurance_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      price_amount REAL,
      price_currency TEXT,
      life_number INTEGER NOT NULL DEFAULT 1,
      purchased_at TEXT NOT NULL,
      ih_before INTEGER NOT NULL,
      ih_after INTEGER NOT NULL
    );
  `);

  // Run migrations
  await migrate001Insurance(dbResult);
};
