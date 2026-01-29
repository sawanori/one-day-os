/**
 * One Day OS - Constants Tests
 * Simple test to verify Jest is working
 */

import { IH_CONSTANTS, NOTIFICATION_SCHEDULE, FIVE_QUESTIONS } from './index';

describe('Constants', () => {
  describe('IH_CONSTANTS', () => {
    it('should have correct penalty values', () => {
      expect(IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY).toBe(20);
      expect(IH_CONSTANTS.INCOMPLETE_QUEST_PENALTY).toBe(20);
    });

    it('should have correct thresholds', () => {
      expect(IH_CONSTANTS.WIPE_THRESHOLD).toBe(0);
      expect(IH_CONSTANTS.INITIAL_IH).toBe(100);
    });

    it('should have notification timeout of 5 minutes', () => {
      expect(IH_CONSTANTS.NOTIFICATION_TIMEOUT_MINUTES).toBe(5);
    });
  });

  describe('NOTIFICATION_SCHEDULE', () => {
    it('should have 6 notification times', () => {
      expect(NOTIFICATION_SCHEDULE.TIMES).toHaveLength(6);
    });

    it('should have correct timeout in milliseconds', () => {
      expect(NOTIFICATION_SCHEDULE.TIMEOUT_MS).toBe(5 * 60 * 1000);
    });
  });

  describe('FIVE_QUESTIONS', () => {
    it('should have exactly 6 questions', () => {
      expect(FIVE_QUESTIONS).toHaveLength(6);
    });

    it('should contain identity-focused questions in Japanese', () => {
      expect(FIVE_QUESTIONS).toContain('あなたは誰か？');
      expect(FIVE_QUESTIONS).toContain('それはあなたのアイデンティティと一致しているか？');
    });

    it('should match the notification schedule length', () => {
      expect(FIVE_QUESTIONS).toHaveLength(NOTIFICATION_SCHEDULE.TIMES.length);
    });
  });
});
