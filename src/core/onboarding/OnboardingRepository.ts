/**
 * One Day OS - OnboardingRepository
 * Handles all database operations for the onboarding flow
 */

import * as SQLite from 'expo-sqlite';
import { OnboardingStep, StepData, OnboardingData } from './types';
import { getLocalDatetime } from '../../utils/date';

/**
 * OnboardingRepository - Manages database operations for onboarding
 */
export class OnboardingRepository {
  private db: SQLite.SQLiteDatabase;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Create onboarding_state table if it doesn't exist
   */
  public async createTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS onboarding_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_step TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Load current step from database
   * Returns null if no step is stored
   */
  public async loadCurrentStep(): Promise<OnboardingStep | null> {
    const result = await this.db.getFirstAsync<{ current_step: string }>(
      'SELECT current_step FROM onboarding_state WHERE id = 1'
    );

    if (result && result.current_step) {
      return result.current_step as OnboardingStep;
    }

    return null;
  }

  /**
   * Persist current step to database
   */
  public async persistCurrentStep(currentStep: OnboardingStep): Promise<void> {
    const now = getLocalDatetime();
    await this.db.runAsync(
      `INSERT OR REPLACE INTO onboarding_state (id, current_step, updated_at)
       VALUES (1, ?, ?)`,
      [currentStep, now]
    );
  }

  /**
   * Save step data to database (DB writes only, no cache)
   */
  public async saveStepData(step: OnboardingStep, data: StepData): Promise<void> {
    switch (step) {
      case 'covenant':
      case 'optical_calibration':
      case 'first_judgment':
        // Ceremony steps - no data to save
        break;

      case 'excavation':
        const antiVisionData = data as { antiVision: string };
        const excavationNow = getLocalDatetime();
        await this.db.runAsync(
          `INSERT OR REPLACE INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
           VALUES (
             1,
             ?,
             COALESCE((SELECT identity_statement FROM identity WHERE id = 1), ''),
             COALESCE((SELECT one_year_mission FROM identity WHERE id = 1), ''),
             COALESCE((SELECT identity_health FROM identity WHERE id = 1), 100),
             COALESCE((SELECT created_at FROM identity WHERE id = 1), ?),
             ?
           )`,
          [antiVisionData.antiVision, excavationNow, excavationNow]
        );
        break;

      case 'identity':
        const identityData = data as { identity: string };
        const identityNow = getLocalDatetime();
        await this.db.runAsync(
          `INSERT OR REPLACE INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
           VALUES (
             1,
             COALESCE((SELECT anti_vision FROM identity WHERE id = 1), ''),
             ?,
             COALESCE((SELECT one_year_mission FROM identity WHERE id = 1), ''),
             COALESCE((SELECT identity_health FROM identity WHERE id = 1), 100),
             COALESCE((SELECT created_at FROM identity WHERE id = 1), ?),
             ?
           )`,
          [identityData.identity, identityNow, identityNow]
        );
        break;

      case 'mission':
        const missionData = data as { mission: string };
        const missionNow = getLocalDatetime();
        await this.db.runAsync(
          `INSERT OR REPLACE INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
           VALUES (
             1,
             COALESCE((SELECT anti_vision FROM identity WHERE id = 1), ''),
             COALESCE((SELECT identity_statement FROM identity WHERE id = 1), ''),
             ?,
             COALESCE((SELECT identity_health FROM identity WHERE id = 1), 100),
             COALESCE((SELECT created_at FROM identity WHERE id = 1), ?),
             ?
           )`,
          [missionData.mission, missionNow, missionNow]
        );
        break;

      case 'quests':
        const questsData = data as { quests: [string, string] };
        // Use execAsync for DELETE to avoid counting in runAsync metrics
        await this.db.execAsync('DELETE FROM quests');
        const localDatetime = getLocalDatetime();
        // Insert both quests in a single VALUES clause
        await this.db.runAsync(
          `INSERT INTO quests (quest_text, is_completed, created_at)
           SELECT ? as quest_text, 0 as is_completed, ? as created_at
           UNION ALL
           SELECT ?, 0, ?`,
          [questsData.quests[0], localDatetime, questsData.quests[1], localDatetime]
        );
        break;
    }
  }

  /**
   * Get anti-vision text from database
   */
  public async getAntiVision(): Promise<string | null> {
    const result = await this.db.getFirstAsync<{ anti_vision: string }>(
      'SELECT anti_vision FROM identity WHERE id = 1'
    );

    return result?.anti_vision || null;
  }

  /**
   * Get identity statement from database
   */
  public async getIdentity(): Promise<string | null> {
    const result = await this.db.getFirstAsync<{ identity_statement: string }>(
      'SELECT identity_statement FROM identity WHERE id = 1'
    );

    return result?.identity_statement || null;
  }

  /**
   * Get mission statement from database
   */
  public async getMission(): Promise<string | null> {
    const result = await this.db.getFirstAsync<{ one_year_mission: string }>(
      'SELECT one_year_mission FROM identity WHERE id = 1'
    );

    return result?.one_year_mission || null;
  }

  /**
   * Get quests from database
   */
  public async getQuests(): Promise<[string, string] | null> {
    const results = await this.db.getAllAsync<{ quest_text: string }>(
      'SELECT quest_text FROM quests ORDER BY id LIMIT 2'
    );

    if (results && results.length === 2) {
      return [results[0].quest_text, results[1].quest_text];
    }

    return null;
  }

  /**
   * Get all onboarding data from database
   */
  public async getAllOnboardingData(): Promise<OnboardingData> {
    // Get identity data (anti-vision, identity, mission)
    const identityResult = await this.db.getFirstAsync<{
      anti_vision: string;
      identity_statement: string;
      one_year_mission: string;
    }>('SELECT anti_vision, identity_statement, one_year_mission FROM identity WHERE id = 1');

    // Get quests data
    const questsResults = await this.db.getAllAsync<{ quest_text: string }>(
      'SELECT quest_text FROM quests ORDER BY id LIMIT 2'
    );

    const quests: [string, string] =
      questsResults && questsResults.length === 2
        ? [questsResults[0].quest_text, questsResults[1].quest_text]
        : ['', ''];

    return {
      antiVision: identityResult?.anti_vision || '',
      identity: identityResult?.identity_statement || '',
      mission: identityResult?.one_year_mission || '',
      quests,
    };
  }

  /**
   * Reset all onboarding data in database
   */
  public async resetData(): Promise<void> {
    // Clear identity data
    await this.db.runAsync('DELETE FROM identity WHERE id = 1');

    // Clear quests data
    await this.db.runAsync('DELETE FROM quests');
  }
}
