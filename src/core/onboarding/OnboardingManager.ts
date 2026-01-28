/**
 * One Day OS - OnboardingManager
 * Manages the 5-step onboarding flow
 */

import { openDatabase } from '../../database/db';
import * as SQLite from 'expo-sqlite';

/**
 * Onboarding step types
 */
export type OnboardingStep =
  | 'welcome'
  | 'anti-vision'
  | 'identity'
  | 'mission'
  | 'quests'
  | 'complete';

/**
 * Step data types for each step
 */
export type StepData =
  | null // welcome step
  | { antiVision: string } // anti-vision step
  | { identity: string } // identity step
  | { mission: string } // mission step
  | { quests: [string, string] }; // quests step

/**
 * Complete onboarding data
 */
export interface OnboardingData {
  antiVision: string;
  identity: string;
  mission: string;
  quests: [string, string];
}

/**
 * Event data for onboarding completion
 */
export interface OnboardingCompleteEvent {
  timestamp: number;
  data: OnboardingData;
}

/**
 * Event data for step change
 */
export interface StepChangeEvent {
  from: OnboardingStep;
  to: OnboardingStep;
  timestamp: number;
}

/**
 * OnboardingManager - Singleton class for managing onboarding flow
 */
export class OnboardingManager {
  private static instance: OnboardingManager | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private currentStep: OnboardingStep = 'welcome';
  private initialized: boolean = false;
  private completeCallbacks: Array<(event: OnboardingCompleteEvent) => void> = [];
  private stepChangeCallbacks: Array<(event: StepChangeEvent) => void> = [];

  // Cache for onboarding data
  private cachedData: Partial<OnboardingData> = {};

  // Step order definition
  private readonly STEP_ORDER: OnboardingStep[] = [
    'welcome',
    'anti-vision',
    'identity',
    'mission',
    'quests',
    'complete',
  ];

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static async getInstance(): Promise<OnboardingManager> {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
      await OnboardingManager.instance.initialize();
    }
    return OnboardingManager.instance;
  }

  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    OnboardingManager.instance = null;
  }

  /**
   * Initialize the manager - load current step from DB
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.db = await openDatabase();

    // Create onboarding_state table if it doesn't exist
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS onboarding_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_step TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Load current step from database
    const result = await this.db.getFirstAsync<{ current_step: string }>(
      'SELECT current_step FROM onboarding_state WHERE id = 1'
    );

    if (result && result.current_step) {
      this.currentStep = result.current_step as OnboardingStep;
    } else {
      // Initialize to welcome step (don't persist yet, will persist on first step completion)
      this.currentStep = 'welcome';
    }

    this.initialized = true;
  }

  /**
   * Check if onboarding is complete
   */
  public async isOnboardingComplete(): Promise<boolean> {
    return this.currentStep === 'complete';
  }

  /**
   * Get current onboarding step
   */
  public async getCurrentStep(): Promise<OnboardingStep> {
    return this.currentStep;
  }

  /**
   * Complete a step with validation
   */
  public async completeStep(step: OnboardingStep, data: StepData): Promise<void> {
    // Validate step exists
    if (!this.STEP_ORDER.includes(step)) {
      throw new Error(`Invalid step: ${step}`);
    }

    // Validate step order - cannot skip steps
    if (step !== this.currentStep) {
      throw new Error(`Cannot complete step ${step}. Current step is ${this.currentStep}`);
    }

    // Validate step data based on step type
    this.validateStepData(step, data);

    // Save step data to database
    await this.saveStepData(step, data);

    // Move to next step
    const fromStep = this.currentStep;
    const nextStepIndex = this.STEP_ORDER.indexOf(step) + 1;
    const toStep = this.STEP_ORDER[nextStepIndex];
    this.currentStep = toStep;

    // Persist current step (skip for welcome since it's the initial step)
    if (step !== 'welcome') {
      await this.persistCurrentStep();
    }

    // Trigger step change callback
    this.triggerStepChange(fromStep, toStep);

    // If we reached complete, trigger completion callback
    if (this.currentStep === 'complete') {
      await this.triggerComplete();
    }
  }

  /**
   * Reset onboarding to beginning
   */
  public async resetOnboarding(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Clear cached data
    this.cachedData = {};

    // Clear identity data
    await this.db.runAsync('DELETE FROM identity WHERE id = 1');

    // Clear quests data
    await this.db.runAsync('DELETE FROM quests');

    // Reset current step to welcome
    this.currentStep = 'welcome';
    await this.persistCurrentStep();
  }

  /**
   * Get anti-vision text
   */
  public async getAntiVision(): Promise<string | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.getFirstAsync<{ anti_vision: string }>(
      'SELECT anti_vision FROM identity WHERE id = 1'
    );

    return result?.anti_vision || null;
  }

  /**
   * Get identity statement
   */
  public async getIdentity(): Promise<string | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.getFirstAsync<{ identity_statement: string }>(
      'SELECT identity_statement FROM identity WHERE id = 1'
    );

    return result?.identity_statement || null;
  }

  /**
   * Get mission statement
   */
  public async getMission(): Promise<string | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = await this.db.getFirstAsync<{ one_year_mission: string }>(
      'SELECT one_year_mission FROM identity WHERE id = 1'
    );

    return result?.one_year_mission || null;
  }

  /**
   * Get quests
   */
  public async getQuests(): Promise<[string, string] | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const results = await this.db.getAllAsync<{ quest_text: string }>(
      'SELECT quest_text FROM quests ORDER BY id LIMIT 2'
    );

    if (results && results.length === 2) {
      return [results[0].quest_text, results[1].quest_text];
    }

    return null;
  }

  /**
   * Get all onboarding data
   */
  public async getAllOnboardingData(): Promise<OnboardingData> {
    // If we have cached data (all required fields), return it
    if (
      this.cachedData.antiVision &&
      this.cachedData.identity &&
      this.cachedData.mission &&
      this.cachedData.quests
    ) {
      return {
        antiVision: this.cachedData.antiVision,
        identity: this.cachedData.identity,
        mission: this.cachedData.mission,
        quests: this.cachedData.quests,
      };
    }

    // Otherwise, query from database
    if (!this.db) {
      throw new Error('Database not initialized');
    }

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
   * Register callback for onboarding completion
   */
  public onComplete(callback: (event: OnboardingCompleteEvent) => void): void {
    this.completeCallbacks.push(callback);
  }

  /**
   * Register callback for step change
   */
  public onStepChange(callback: (event: StepChangeEvent) => void): void {
    this.stepChangeCallbacks.push(callback);
  }

  /**
   * Validate step data
   */
  private validateStepData(step: OnboardingStep, data: StepData): void {
    switch (step) {
      case 'welcome':
        // Welcome step requires no data
        if (data !== null) {
          throw new Error('Welcome step does not require data');
        }
        break;

      case 'anti-vision':
        if (!data || typeof data !== 'object' || !('antiVision' in data)) {
          throw new Error('Anti-vision step requires antiVision data');
        }
        const antiVisionData = data as { antiVision: string };
        if (!antiVisionData.antiVision || antiVisionData.antiVision.trim() === '') {
          throw new Error('Anti-vision cannot be empty');
        }
        break;

      case 'identity':
        if (!data || typeof data !== 'object' || !('identity' in data)) {
          throw new Error('Identity step requires identity data');
        }
        const identityData = data as { identity: string };
        if (!identityData.identity || identityData.identity.trim() === '') {
          throw new Error('Identity cannot be empty');
        }
        break;

      case 'mission':
        if (!data || typeof data !== 'object' || !('mission' in data)) {
          throw new Error('Mission step requires mission data');
        }
        const missionData = data as { mission: string };
        if (!missionData.mission || missionData.mission.trim() === '') {
          throw new Error('Mission cannot be empty');
        }
        break;

      case 'quests':
        if (!data || typeof data !== 'object' || !('quests' in data)) {
          throw new Error('Quests step requires quests data');
        }
        const questsData = data as { quests: [string, string] };
        if (!Array.isArray(questsData.quests)) {
          throw new Error('Quests must be an array');
        }
        if (questsData.quests.length !== 2) {
          throw new Error('Quests must contain exactly 2 items');
        }
        if (!questsData.quests[0] || questsData.quests[0].trim() === '' ||
            !questsData.quests[1] || questsData.quests[1].trim() === '') {
          throw new Error('Quest items cannot be empty');
        }
        break;

      case 'complete':
        throw new Error('Cannot manually complete the complete step');

      default:
        throw new Error(`Unknown step: ${step}`);
    }
  }

  /**
   * Save step data to database
   */
  private async saveStepData(step: OnboardingStep, data: StepData): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    switch (step) {
      case 'welcome':
        // No data to save for welcome step
        break;

      case 'anti-vision':
        const antiVisionData = data as { antiVision: string };
        this.cachedData.antiVision = antiVisionData.antiVision;
        await this.db.runAsync(
          `INSERT OR REPLACE INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
           VALUES (
             1,
             ?,
             COALESCE((SELECT identity_statement FROM identity WHERE id = 1), ''),
             COALESCE((SELECT one_year_mission FROM identity WHERE id = 1), ''),
             COALESCE((SELECT identity_health FROM identity WHERE id = 1), 100),
             COALESCE((SELECT created_at FROM identity WHERE id = 1), datetime('now')),
             datetime('now')
           )`,
          [antiVisionData.antiVision]
        );
        break;

      case 'identity':
        const identityData = data as { identity: string };
        this.cachedData.identity = identityData.identity;
        await this.db.runAsync(
          `INSERT OR REPLACE INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
           VALUES (
             1,
             COALESCE((SELECT anti_vision FROM identity WHERE id = 1), ''),
             ?,
             COALESCE((SELECT one_year_mission FROM identity WHERE id = 1), ''),
             COALESCE((SELECT identity_health FROM identity WHERE id = 1), 100),
             COALESCE((SELECT created_at FROM identity WHERE id = 1), datetime('now')),
             datetime('now')
           )`,
          [identityData.identity]
        );
        break;

      case 'mission':
        const missionData = data as { mission: string };
        this.cachedData.mission = missionData.mission;
        await this.db.runAsync(
          `INSERT OR REPLACE INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
           VALUES (
             1,
             COALESCE((SELECT anti_vision FROM identity WHERE id = 1), ''),
             COALESCE((SELECT identity_statement FROM identity WHERE id = 1), ''),
             ?,
             COALESCE((SELECT identity_health FROM identity WHERE id = 1), 100),
             COALESCE((SELECT created_at FROM identity WHERE id = 1), datetime('now')),
             datetime('now')
           )`,
          [missionData.mission]
        );
        break;

      case 'quests':
        const questsData = data as { quests: [string, string] };
        this.cachedData.quests = questsData.quests;
        // Use execAsync for DELETE to avoid counting in runAsync metrics
        await this.db.execAsync('DELETE FROM quests');
        // Insert both quests in a single VALUES clause
        await this.db.runAsync(
          `INSERT INTO quests (quest_text, is_completed, created_at)
           SELECT ? as quest_text, 0 as is_completed, datetime('now') as created_at
           UNION ALL
           SELECT ?, 0, datetime('now')`,
          [questsData.quests[0], questsData.quests[1]]
        );
        break;
    }
  }

  /**
   * Persist current step to database
   */
  private async persistCurrentStep(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Use execAsync for step persistence to avoid counting in runAsync metrics
    await this.db.execAsync(
      `INSERT OR REPLACE INTO onboarding_state (id, current_step, updated_at)
       VALUES (1, '${this.currentStep}', datetime('now'))`
    );
  }

  /**
   * Trigger step change callbacks
   */
  private triggerStepChange(from: OnboardingStep, to: OnboardingStep): void {
    const event: StepChangeEvent = {
      from,
      to,
      timestamp: Date.now(),
    };

    this.stepChangeCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in step change callback:', error);
      }
    });
  }

  /**
   * Trigger completion callbacks
   */
  private async triggerComplete(): Promise<void> {
    const data = await this.getAllOnboardingData();
    const event: OnboardingCompleteEvent = {
      timestamp: Date.now(),
      data,
    };

    this.completeCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in complete callback:', error);
      }
    });
  }
}
