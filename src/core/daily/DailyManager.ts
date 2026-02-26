import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import { getDB, getAppState } from '../../database/client';
import { IdentityEngine } from '../identity/IdentityEngine';
import { DailyStateRepository } from './DailyStateRepository';
import { DailyCheckResult, DateChangeEvent } from './types';

export class DailyManager {
  private static instance: DailyManager | null = null;

  private repository: DailyStateRepository;
  private appStateSubscription: NativeEventSubscription | null = null;
  private callbacks: Array<(event: DateChangeEvent) => void> = [];
  private checking: boolean = false;

  private constructor(repository: DailyStateRepository) {
    this.repository = repository;
  }

  static async getInstance(): Promise<DailyManager> {
    if (!DailyManager.instance) {
      const db = getDB();
      const repository = new DailyStateRepository(db);
      DailyManager.instance = new DailyManager(repository);
      await DailyManager.instance.initialize();
    }
    return DailyManager.instance;
  }

  static resetInstance(): void {
    if (DailyManager.instance) {
      DailyManager.instance.dispose();
    }
    DailyManager.instance = null;
  }

  private async initialize(): Promise<void> {
    const today = this.getTodayString();
    await this.repository.initializeDailyState(today);

    // Register AppState listener
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    // Check on startup
    await this.checkDateChange();
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      this.checkDateChange().catch((error) => {
        console.error('DailyManager checkDateChange error on resume:', error);
      });
    }
  };

  async checkDateChange(): Promise<DailyCheckResult> {
    const today = this.getTodayString();

    if (this.checking) {
      return { dateChanged: false, previousDate: null, currentDate: today, penaltyApplied: false };
    }

    this.checking = true;

    try {
      const state = await this.repository.getDailyState();
      const previousDate = state?.current_date ?? null;

      if (previousDate === today) {
        return { dateChanged: false, previousDate, currentDate: today, penaltyApplied: false };
      }

      // Date has changed
      let penaltyApplied = false;

      // Check if we're in onboarding - skip penalty if so
      const appState = await getAppState();

      if (appState !== 'onboarding' && previousDate) {
        // Check previous day's quests
        const questCount = await this.repository.getIncompleteQuestCount(previousDate);

        if (questCount.total > 0 && questCount.completed < questCount.total) {
          // Has incomplete quests - apply penalty
          const engine = await IdentityEngine.getInstance();
          await engine.applyQuestPenalty({
            completedCount: questCount.completed,
            totalCount: questCount.total,
          });
          penaltyApplied = true;
        }
      }

      // Update daily_state to today
      await this.repository.updateDailyState(today);

      // Calculate days missed
      const daysMissed = previousDate
        ? Math.max(0, Math.floor(
            (new Date(today).getTime() - new Date(previousDate).getTime()) / (1000 * 60 * 60 * 24)
          ) - 1)
        : 0;

      // Fire callbacks
      const event: DateChangeEvent = {
        previousDate: previousDate || today,
        newDate: today,
        daysMissed,
        questPenaltyApplied: penaltyApplied,
        timestamp: Date.now(),
      };
      this.callbacks.forEach(cb => cb(event));

      return { dateChanged: true, previousDate, currentDate: today, penaltyApplied };
    } catch (error) {
      console.error('DailyManager checkDateChange error:', error);
      return { dateChanged: false, previousDate: null, currentDate: today, penaltyApplied: false };
    } finally {
      this.checking = false;
    }
  }

  onDateChange(cb: (event: DateChangeEvent) => void): void {
    this.callbacks.push(cb);
  }

  dispose(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.callbacks = [];
  }

  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
