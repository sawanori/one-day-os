
import * as SQLite from 'expo-sqlite';

export const dbResult = SQLite.openDatabaseSync('onedayos_master.db');

export const initDatabase = async () => {
  await dbResult.execAsync(`
    PRAGMA journal_mode = WAL;

    -- Identity Health & Global Status
    CREATE TABLE IF NOT EXISTS user_status (
      id INTEGER PRIMARY KEY NOT NULL,
      identity_health INTEGER DEFAULT 100, -- 0-100
      current_lens REAL DEFAULT 1.0, -- 0.5, 1.0, 2.0
      survival_streak INTEGER DEFAULT 0,
      is_dead INTEGER DEFAULT 0
    );

    -- The "Anti-Vision" (Fear Fuel)
    CREATE TABLE IF NOT EXISTS anti_vision (
      id INTEGER PRIMARY KEY NOT NULL,
      title TEXT NOT NULL, -- e.g. "5 Years Later: Stagnation"
      content TEXT NOT NULL,
      reflection_date TEXT NOT NULL
    );

    -- The "New Identity" (3-Year Ideal)
    CREATE TABLE IF NOT EXISTS identity_core (
      id INTEGER PRIMARY KEY NOT NULL,
      statement TEXT NOT NULL, -- "I am a person who..."
      ideal_tuesday_scenario TEXT,
      weekly_one_thing TEXT
    );

    -- Quests (Daily Actions)
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
      type TEXT CHECK(type IN ('boss', 'minion', 'quest')) DEFAULT 'quest'
    );

    -- The 5 Daily Judgments
    CREATE TABLE IF NOT EXISTS daily_judgments (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL, -- "11:00", "13:30", etc.
      question TEXT NOT NULL,
      response TEXT CHECK(response IN ('yes', 'no', 'ignored', 'pending')) DEFAULT 'pending'
    );

    -- Initialize user_status if empty
    INSERT OR IGNORE INTO user_status (id, identity_health) VALUES (1, 100);
  `);
};
