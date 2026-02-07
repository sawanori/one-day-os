/**
 * One Day OS - IHCalculator Tests
 * Unit tests for pure stateless IH calculation logic
 */

import { IHCalculator } from './IHCalculator';
import { IH_CONSTANTS } from '../../constants';

describe('IHCalculator', () => {
  describe('clamp', () => {
    test('returns value unchanged when within range [0, 100]', () => {
      expect(IHCalculator.clamp(50)).toBe(50);
      expect(IHCalculator.clamp(0)).toBe(0);
      expect(IHCalculator.clamp(100)).toBe(100);
      expect(IHCalculator.clamp(1)).toBe(1);
      expect(IHCalculator.clamp(99)).toBe(99);
    });

    test('clamps negative values to 0', () => {
      expect(IHCalculator.clamp(-1)).toBe(0);
      expect(IHCalculator.clamp(-100)).toBe(0);
      expect(IHCalculator.clamp(-0.5)).toBe(0);
    });

    test('clamps values above 100 to 100', () => {
      expect(IHCalculator.clamp(101)).toBe(100);
      expect(IHCalculator.clamp(200)).toBe(100);
      expect(IHCalculator.clamp(100.5)).toBe(100);
    });
  });

  describe('notificationDelta', () => {
    test('returns 0 for YES response', () => {
      expect(IHCalculator.notificationDelta('YES')).toBe(0);
    });

    test('returns -NOTIFICATION_PENALTY for NO response', () => {
      expect(IHCalculator.notificationDelta('NO')).toBe(-IH_CONSTANTS.NOTIFICATION_PENALTY);
      expect(IHCalculator.notificationDelta('NO')).toBe(-15);
    });

    test('returns -MISSED_NOTIFICATION_PENALTY for IGNORED response', () => {
      expect(IHCalculator.notificationDelta('IGNORED')).toBe(-IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY);
      expect(IHCalculator.notificationDelta('IGNORED')).toBe(-20);
    });

    test('throws for invalid response', () => {
      // @ts-expect-error Testing invalid input
      expect(() => IHCalculator.notificationDelta('INVALID')).toThrow(
        'Invalid notification response: INVALID'
      );
    });
  });

  describe('questDelta', () => {
    test('returns 0 when all quests are completed', () => {
      expect(IHCalculator.questDelta({ completedCount: 3, totalCount: 3 })).toBe(0);
      expect(IHCalculator.questDelta({ completedCount: 5, totalCount: 5 })).toBe(0);
      expect(IHCalculator.questDelta({ completedCount: 1, totalCount: 1 })).toBe(0);
    });

    test('returns -INCOMPLETE_QUEST_PENALTY when any quest is incomplete', () => {
      expect(IHCalculator.questDelta({ completedCount: 0, totalCount: 3 })).toBe(-IH_CONSTANTS.INCOMPLETE_QUEST_PENALTY);
      expect(IHCalculator.questDelta({ completedCount: 2, totalCount: 3 })).toBe(-20);
      expect(IHCalculator.questDelta({ completedCount: 4, totalCount: 5 })).toBe(-20);
    });

    test('penalty is fixed regardless of how many quests are incomplete', () => {
      const oneIncomplete = IHCalculator.questDelta({ completedCount: 4, totalCount: 5 });
      const allIncomplete = IHCalculator.questDelta({ completedCount: 0, totalCount: 5 });
      expect(oneIncomplete).toBe(allIncomplete);
    });
  });

  describe('onboardingStagnationDelta', () => {
    test('returns -5 (fixed penalty)', () => {
      expect(IHCalculator.onboardingStagnationDelta()).toBe(-5);
    });
  });

  describe('applyDelta', () => {
    test('applies positive delta correctly', () => {
      expect(IHCalculator.applyDelta(50, 10)).toBe(60);
    });

    test('applies negative delta correctly', () => {
      expect(IHCalculator.applyDelta(50, -15)).toBe(35);
    });

    test('clamps result to 0 when delta would go negative', () => {
      expect(IHCalculator.applyDelta(10, -20)).toBe(0);
    });

    test('clamps result to 100 when delta would exceed max', () => {
      expect(IHCalculator.applyDelta(95, 10)).toBe(100);
    });

    test('returns 0 for zero delta on 0', () => {
      expect(IHCalculator.applyDelta(0, 0)).toBe(0);
    });

    test('returns 100 for zero delta on 100', () => {
      expect(IHCalculator.applyDelta(100, 0)).toBe(100);
    });
  });
});
