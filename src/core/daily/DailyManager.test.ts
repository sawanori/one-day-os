import { AppState, AppStateStatus } from 'react-native';
import { DailyManager } from './DailyManager';

// Mock dependencies
jest.mock('../../database/client', () => ({
  getDB: jest.fn().mockReturnValue({}),
  getAppState: jest.fn().mockResolvedValue('active'),
}));

jest.mock('../identity/IdentityEngine', () => ({
  IdentityEngine: {
    getInstance: jest.fn().mockResolvedValue({
      applyQuestPenalty: jest.fn().mockResolvedValue({
        previousIH: 100,
        newIH: 80,
        delta: -20,
        timestamp: Date.now(),
      }),
    }),
  },
}));

jest.mock('./DailyStateRepository', () => ({
  DailyStateRepository: jest.fn().mockImplementation(() => ({
    initializeDailyState: jest.fn().mockResolvedValue(undefined),
    getDailyState: jest.fn().mockResolvedValue(null),
    updateDailyState: jest.fn().mockResolvedValue(undefined),
    getIncompleteQuestCount: jest.fn().mockResolvedValue({ total: 0, completed: 0 }),
  })),
}));

// Access mocked modules
const { getAppState } = require('../../database/client');
const { IdentityEngine } = require('../identity/IdentityEngine');
const { DailyStateRepository } = require('./DailyStateRepository');

// Store AppState listener
let appStateCallback: ((state: AppStateStatus) => void) | null = null;
const mockRemove = jest.fn();

jest.spyOn(AppState, 'addEventListener').mockImplementation(
  (type: string, handler: any) => {
    appStateCallback = handler;
    return { remove: mockRemove } as any;
  }
);

describe('DailyManager', () => {
  let mockRepository: any;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 0, 15, 8, 0, 0)); // 2024-01-15 08:00

    // Reset singleton
    DailyManager.resetInstance();

    // Reset mocks
    jest.clearAllMocks();
    appStateCallback = null;

    // Create fresh mock repository
    mockRepository = {
      initializeDailyState: jest.fn().mockResolvedValue(undefined),
      getDailyState: jest.fn().mockResolvedValue(null),
      updateDailyState: jest.fn().mockResolvedValue(undefined),
      getIncompleteQuestCount: jest.fn().mockResolvedValue({ total: 0, completed: 0 }),
    };
    DailyStateRepository.mockImplementation(() => mockRepository);

    // Reset default mocks
    getAppState.mockResolvedValue('active');
    IdentityEngine.getInstance.mockResolvedValue({
      applyQuestPenalty: jest.fn().mockResolvedValue({
        previousIH: 100, newIH: 80, delta: -20, timestamp: Date.now(),
      }),
    });
  });

  afterEach(() => {
    DailyManager.resetInstance();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should create singleton instance', async () => {
      const instance1 = await DailyManager.getInstance();
      const instance2 = await DailyManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize daily_state on creation', async () => {
      await DailyManager.getInstance();
      expect(mockRepository.initializeDailyState).toHaveBeenCalledWith('2024-01-15');
    });

    it('should register AppState listener', async () => {
      await DailyManager.getInstance();
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should call checkDateChange on startup', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
      });

      await DailyManager.getInstance();

      // getDailyState is called during checkDateChange
      expect(mockRepository.getDailyState).toHaveBeenCalled();
    });
  });

  describe('date change detection', () => {
    it('should return dateChanged=false when same day', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
      });

      const manager = await DailyManager.getInstance();
      const result = await manager.checkDateChange();

      expect(result.dateChanged).toBe(false);
      expect(result.penaltyApplied).toBe(false);
    });

    it('should return dateChanged=true when date changed', async () => {
      // First call returns yesterday
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 0, completed: 0 });

      const manager = await DailyManager.getInstance();

      // Reset mock to return yesterday again for explicit check
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });

      const result = await manager.checkDateChange();

      expect(result.dateChanged).toBe(true);
      expect(result.currentDate).toBe('2024-01-15');
    });

    it('should update daily_state when date changes', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 0, completed: 0 });

      const manager = await DailyManager.getInstance();

      expect(mockRepository.updateDailyState).toHaveBeenCalledWith('2024-01-15');
    });

    it('should calculate daysMissed=2 when 3 days later', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-12', last_reset_at: '2024-01-12T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 0, completed: 0 });

      const callback = jest.fn();
      const manager = await DailyManager.getInstance();
      manager.onDateChange(callback);

      // Reset to trigger date change again
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-12', last_reset_at: '2024-01-12T08:00:00',
      });

      await manager.checkDateChange();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ daysMissed: 2 })
      );
    });
  });

  describe('quest penalty', () => {
    it('should apply penalty when incomplete quests exist', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 3, completed: 1 });

      const manager = await DailyManager.getInstance();

      const mockEngine = await IdentityEngine.getInstance();
      expect(mockEngine.applyQuestPenalty).toHaveBeenCalledWith({
        completedCount: 1,
        totalCount: 3,
      });
    });

    it('should NOT apply penalty when all quests completed', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 3, completed: 3 });

      // Clear previous calls
      IdentityEngine.getInstance.mockClear();
      const mockEngine = { applyQuestPenalty: jest.fn() };
      IdentityEngine.getInstance.mockResolvedValue(mockEngine);

      const manager = await DailyManager.getInstance();

      expect(mockEngine.applyQuestPenalty).not.toHaveBeenCalled();
    });

    it('should NOT apply penalty when no quests exist', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 0, completed: 0 });

      IdentityEngine.getInstance.mockClear();
      const mockEngine = { applyQuestPenalty: jest.fn() };
      IdentityEngine.getInstance.mockResolvedValue(mockEngine);

      const manager = await DailyManager.getInstance();

      expect(mockEngine.applyQuestPenalty).not.toHaveBeenCalled();
    });

    it('should skip penalty during onboarding', async () => {
      getAppState.mockResolvedValue('onboarding');
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 3, completed: 0 });

      IdentityEngine.getInstance.mockClear();
      const mockEngine = { applyQuestPenalty: jest.fn() };
      IdentityEngine.getInstance.mockResolvedValue(mockEngine);

      const manager = await DailyManager.getInstance();

      expect(mockEngine.applyQuestPenalty).not.toHaveBeenCalled();
      // But daily_state should still be updated
      expect(mockRepository.updateDailyState).toHaveBeenCalledWith('2024-01-15');
    });
  });

  describe('error handling', () => {
    it('should return safe result on DB error', async () => {
      // First getInstance succeeds with same-day
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
      });

      const manager = await DailyManager.getInstance();

      // Now make getDailyState throw
      mockRepository.getDailyState.mockRejectedValue(new Error('DB error'));

      const result = await manager.checkDateChange();

      expect(result.dateChanged).toBe(false);
      expect(result.penaltyApplied).toBe(false);
    });

    it('should prevent concurrent checkDateChange calls', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
      });

      const manager = await DailyManager.getInstance();

      // Make getDailyState slow
      let resolveGetState: any;
      mockRepository.getDailyState.mockImplementation(
        () => new Promise((resolve) => { resolveGetState = resolve; })
      );

      // Start two concurrent calls
      const promise1 = manager.checkDateChange();
      const promise2 = manager.checkDateChange();

      // Second should return immediately
      const result2 = await promise2;
      expect(result2.dateChanged).toBe(false);

      // Resolve first
      resolveGetState({ id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00' });
      await promise1;
    });
  });

  describe('AppState handling', () => {
    it('should trigger checkDateChange on app becoming active', async () => {
      jest.useRealTimers(); // Use real timers for this test

      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
      });

      await DailyManager.getInstance();

      expect(appStateCallback).not.toBeNull();

      // Simulate app coming to foreground
      if (appStateCallback) {
        appStateCallback('active');
      }

      // Wait for async to resolve
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockRepository.getDailyState.mock.calls.length).toBeGreaterThanOrEqual(2);

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should NOT trigger checkDateChange on background', async () => {
      jest.useRealTimers(); // Use real timers for this test

      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
      });

      await DailyManager.getInstance();
      const callCountAfterInit = mockRepository.getDailyState.mock.calls.length;

      if (appStateCallback) {
        appStateCallback('background');
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockRepository.getDailyState.mock.calls.length).toBe(callCountAfterInit);

      jest.useFakeTimers(); // Restore fake timers
    });
  });

  describe('callbacks', () => {
    it('should fire DateChangeEvent callback on date change', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 0, completed: 0 });

      const callback = jest.fn();
      const manager = await DailyManager.getInstance();
      manager.onDateChange(callback);

      // Trigger another date change check
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });

      await manager.checkDateChange();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          previousDate: '2024-01-14',
          newDate: '2024-01-15',
          questPenaltyApplied: false,
          timestamp: expect.any(Number),
        })
      );
    });

    it('should NOT fire callback when same day', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
      });

      const callback = jest.fn();
      const manager = await DailyManager.getInstance();
      manager.onDateChange(callback);

      await manager.checkDateChange();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should remove AppState listener', async () => {
      await DailyManager.getInstance();

      DailyManager.resetInstance();

      expect(mockRemove).toHaveBeenCalled();
    });

    it('should clear callbacks', async () => {
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });
      mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 0, completed: 0 });

      const callback = jest.fn();
      const manager = await DailyManager.getInstance();
      manager.onDateChange(callback);

      manager.dispose();

      // Re-trigger (would need re-initialize, but callbacks should be cleared)
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
      });

      await manager.checkDateChange();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('resetInstance', () => {
    it('should dispose and null the instance', async () => {
      const instance1 = await DailyManager.getInstance();

      DailyManager.resetInstance();

      // Setup fresh mocks for new instance
      mockRepository.getDailyState.mockResolvedValue({
        id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
      });

      const instance2 = await DailyManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });
});
