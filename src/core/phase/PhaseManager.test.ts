import { PhaseManager } from './PhaseManager';
import { Phase, PhaseChangeEvent } from './types';

describe('PhaseManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    PhaseManager.resetInstance();
  });

  afterEach(() => {
    PhaseManager.resetInstance();
    jest.useRealTimers();
  });

  describe('calculateCurrentPhase', () => {
    it('should return NIGHT for hour 0', () => {
      const date = new Date(2024, 0, 1, 0, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(date)).toBe('NIGHT');
    });

    it('should return NIGHT for hour 5', () => {
      const date = new Date(2024, 0, 1, 5, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(date)).toBe('NIGHT');
    });

    it('should return MORNING for hour 6', () => {
      const date = new Date(2024, 0, 1, 6, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(date)).toBe('MORNING');
    });

    it('should return MORNING for hour 11', () => {
      const date = new Date(2024, 0, 1, 11, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(date)).toBe('MORNING');
    });

    it('should return AFTERNOON for hour 12', () => {
      const date = new Date(2024, 0, 1, 12, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(date)).toBe('AFTERNOON');
    });

    it('should return AFTERNOON for hour 17', () => {
      const date = new Date(2024, 0, 1, 17, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(date)).toBe('AFTERNOON');
    });

    it('should return EVENING for hour 18', () => {
      const date = new Date(2024, 0, 1, 18, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(date)).toBe('EVENING');
    });

    it('should return EVENING for hour 23', () => {
      const date = new Date(2024, 0, 1, 23, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(date)).toBe('EVENING');
    });

    it('should handle midnight transition correctly', () => {
      const evening = new Date(2024, 0, 1, 23, 0, 0);
      const night = new Date(2024, 0, 2, 0, 0, 0);
      expect(PhaseManager.calculateCurrentPhase(evening)).toBe('EVENING');
      expect(PhaseManager.calculateCurrentPhase(night)).toBe('NIGHT');
    });
  });

  describe('isPhaseActive', () => {
    it('should return true for current phase and false for others', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 8, 0, 0)); // MORNING
      const manager = PhaseManager.getInstance();

      expect(manager.isPhaseActive('MORNING')).toBe(true);
      expect(manager.isPhaseActive('AFTERNOON')).toBe(false);
      expect(manager.isPhaseActive('EVENING')).toBe(false);
      expect(manager.isPhaseActive('NIGHT')).toBe(false);
    });
  });

  describe('onPhaseChange', () => {
    it('should fire callback when phase changes', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 11, 59, 0)); // MORNING
      const manager = PhaseManager.getInstance();
      manager.initialize();

      const callback = jest.fn();
      manager.onPhaseChange(callback);

      // Advance time to AFTERNOON
      jest.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
      jest.advanceTimersByTime(60000);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        previousPhase: 'MORNING',
        newPhase: 'AFTERNOON',
        timestamp: expect.any(Number),
      });
    });

    it('should NOT fire callback when phase stays the same', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 8, 0, 0)); // MORNING
      const manager = PhaseManager.getInstance();
      manager.initialize();

      const callback = jest.fn();
      manager.onPhaseChange(callback);

      // Stay in MORNING
      jest.setSystemTime(new Date(2024, 0, 1, 9, 0, 0));
      jest.advanceTimersByTime(60000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should fire multiple callbacks on phase change', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 11, 59, 0)); // MORNING
      const manager = PhaseManager.getInstance();
      manager.initialize();

      const callback1 = jest.fn();
      const callback2 = jest.fn();
      manager.onPhaseChange(callback1);
      manager.onPhaseChange(callback2);

      // Advance to AFTERNOON
      jest.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
      jest.advanceTimersByTime(60000);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('static utilities', () => {
    it('should return correct phase display name keys', () => {
      expect(PhaseManager.getPhaseDisplayName('MORNING')).toBe('phase.morning.name');
      expect(PhaseManager.getPhaseDisplayName('AFTERNOON')).toBe('phase.afternoon.name');
      expect(PhaseManager.getPhaseDisplayName('EVENING')).toBe('phase.evening.name');
      expect(PhaseManager.getPhaseDisplayName('NIGHT')).toBe('phase.night.name');
    });

    it('should return correct time range keys', () => {
      expect(PhaseManager.getPhaseTimeRange('MORNING')).toBe('phase.morning.timeRange');
      expect(PhaseManager.getPhaseTimeRange('AFTERNOON')).toBe('phase.afternoon.timeRange');
      expect(PhaseManager.getPhaseTimeRange('EVENING')).toBe('phase.evening.timeRange');
      expect(PhaseManager.getPhaseTimeRange('NIGHT')).toBe('phase.night.timeRange');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PhaseManager.getInstance();
      const instance2 = PhaseManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance and dispose', () => {
      const manager = PhaseManager.getInstance();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      manager.initialize();
      PhaseManager.resetInstance();

      expect(clearIntervalSpy).toHaveBeenCalled();

      // New instance should be different
      const newInstance = PhaseManager.getInstance();
      expect(newInstance).not.toBe(manager);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should clear interval timer', () => {
      const manager = PhaseManager.getInstance();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      manager.initialize();
      manager.dispose();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should clear all callbacks', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 11, 59, 0));
      const manager = PhaseManager.getInstance();
      manager.initialize();

      const callback = jest.fn();
      manager.onPhaseChange(callback);
      manager.dispose();

      // Re-initialize and change phase
      manager.initialize();
      jest.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
      jest.advanceTimersByTime(60000);

      // Old callback should not fire
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentPhase', () => {
    it('should return current phase', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 14, 0, 0)); // AFTERNOON
      const manager = PhaseManager.getInstance();
      expect(manager.getCurrentPhase()).toBe('AFTERNOON');
    });

    it('should update after phase change', () => {
      jest.setSystemTime(new Date(2024, 0, 1, 11, 59, 0)); // MORNING
      const manager = PhaseManager.getInstance();
      manager.initialize();

      expect(manager.getCurrentPhase()).toBe('MORNING');

      // Advance to AFTERNOON
      jest.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
      jest.advanceTimersByTime(60000);

      expect(manager.getCurrentPhase()).toBe('AFTERNOON');
    });
  });
});
