/**
 * One Day OS - OnboardingManager
 * Manages the unified 7-step onboarding flow
 */

import { getDB, databaseInit } from '../../database/client';
import {
  OnboardingStep,
  StepData,
  OnboardingData,
  OnboardingCompleteEvent,
  StepChangeEvent,
  STEP_ORDER,
  CEREMONY_STEPS,
} from './types';
import { OnboardingValidator } from './OnboardingValidator';
import { OnboardingRepository } from './OnboardingRepository';

// Re-export types for backward compatibility
export type { OnboardingStep, StepData, OnboardingData, OnboardingCompleteEvent, StepChangeEvent };

/**
 * OnboardingManager - Singleton class for managing onboarding flow
 */
export class OnboardingManager {
  private static instance: OnboardingManager | null = null;
  private repository: OnboardingRepository | null = null;
  private currentStep: OnboardingStep = 'covenant';
  private initialized: boolean = false;
  private completeCallbacks: Array<(event: OnboardingCompleteEvent) => void> = [];
  private stepChangeCallbacks: Array<(event: StepChangeEvent) => void> = [];

  // Cache for onboarding data
  private cachedData: Partial<OnboardingData> = {};

  // Step order - imported from types.ts
  private readonly STEP_ORDER: OnboardingStep[] = STEP_ORDER;

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

    // Ensure database tables are created first
    await databaseInit();

    const db = getDB();
    this.repository = new OnboardingRepository(db);

    // Create onboarding_state table if it doesn't exist
    await this.repository.createTable();

    // Load current step from database
    const loadedStep = await this.repository.loadCurrentStep();

    if (loadedStep) {
      // Migrate old step names to new ones
      if ((loadedStep as string) === 'welcome' || (loadedStep as string) === 'anti-vision') {
        this.currentStep = 'covenant';
        await this.repository.persistCurrentStep(this.currentStep);
      } else {
        this.currentStep = loadedStep;
      }
    } else {
      // Initialize to covenant step
      this.currentStep = 'covenant';
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
    OnboardingValidator.validate(step, data);

    // Save step data to database (skip for ceremony steps)
    if (!CEREMONY_STEPS.includes(step)) {
      await this.repository!.saveStepData(step, data);
    }

    // Update cache based on step data
    this.updateCache(step, data);

    // Move to next step
    const fromStep = this.currentStep;
    const nextStepIndex = this.STEP_ORDER.indexOf(step) + 1;
    const toStep = this.STEP_ORDER[nextStepIndex];
    this.currentStep = toStep;

    // Persist current step
    await this.repository!.persistCurrentStep(this.currentStep);

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
    if (!this.repository) {
      throw new Error('Database not initialized');
    }

    // Clear cached data
    this.cachedData = {};

    // Reset data in database
    await this.repository.resetData();

    // Reset current step to covenant
    this.currentStep = 'covenant';
    await this.repository.persistCurrentStep(this.currentStep);
  }

  /**
   * Get anti-vision text
   */
  public async getAntiVision(): Promise<string | null> {
    if (!this.repository) {
      throw new Error('Database not initialized');
    }

    return this.repository.getAntiVision();
  }

  /**
   * Get identity statement
   */
  public async getIdentity(): Promise<string | null> {
    if (!this.repository) {
      throw new Error('Database not initialized');
    }

    return this.repository.getIdentity();
  }

  /**
   * Get mission statement
   */
  public async getMission(): Promise<string | null> {
    if (!this.repository) {
      throw new Error('Database not initialized');
    }

    return this.repository.getMission();
  }

  /**
   * Get quests
   */
  public async getQuests(): Promise<[string, string] | null> {
    if (!this.repository) {
      throw new Error('Database not initialized');
    }

    return this.repository.getQuests();
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

    // Otherwise, query from database via repository
    if (!this.repository) {
      throw new Error('Database not initialized');
    }

    return this.repository.getAllOnboardingData();
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
   * Update cache with step data
   */
  private updateCache(step: OnboardingStep, data: StepData): void {
    switch (step) {
      case 'excavation':
        this.cachedData.antiVision = (data as { antiVision: string }).antiVision;
        break;
      case 'identity':
        this.cachedData.identity = (data as { identity: string }).identity;
        break;
      case 'mission':
        this.cachedData.mission = (data as { mission: string }).mission;
        break;
      case 'quests':
        this.cachedData.quests = (data as { quests: [string, string] }).quests;
        break;
    }
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
