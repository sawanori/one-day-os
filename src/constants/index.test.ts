/**
 * One Day OS - Constants Tests
 * Simple test to verify Jest is working
 */

import { IH_CONSTANTS, NOTIFICATION_SCHEDULE, getReflectionQuestions, DB_TABLES, INSURANCE_CONSTANTS } from './index';

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

  describe('getReflectionQuestions', () => {
    it('should have exactly 6 reflection questions', () => {
      expect(getReflectionQuestions()).toHaveLength(6);
    });

    it('should contain identity-focused question keys', () => {
      expect(getReflectionQuestions()).toContain('reflection.q1');
      expect(getReflectionQuestions()).toContain('reflection.q4');
    });

    it('should match the notification schedule length', () => {
      expect(getReflectionQuestions()).toHaveLength(NOTIFICATION_SCHEDULE.TIMES.length);
    });
  });

  describe('DB_TABLES', () => {
    it('should include insurance-related tables', () => {
      expect(DB_TABLES.IDENTITY_BACKUP).toBe('identity_backup');
      expect(DB_TABLES.INSURANCE_PURCHASES).toBe('insurance_purchases');
    });

    it('should include all core tables', () => {
      expect(DB_TABLES.IDENTITY).toBe('identity');
      expect(DB_TABLES.QUESTS).toBe('quests');
      expect(DB_TABLES.NOTIFICATIONS).toBe('notifications');
      expect(DB_TABLES.DAILY_STATE).toBe('daily_state');
    });
  });

  describe('INSURANCE_CONSTANTS', () => {
    it('should have correct offer timeout', () => {
      expect(INSURANCE_CONSTANTS.OFFER_TIMEOUT_SECONDS).toBe(10);
    });

    it('should have correct revival IH', () => {
      expect(INSURANCE_CONSTANTS.REVIVAL_IH).toBe(10);
    });

    it('should have correct wipe pause percent', () => {
      expect(INSURANCE_CONSTANTS.WIPE_PAUSE_PERCENT).toBe(95);
    });

    it('should have correct product IDs', () => {
      expect(INSURANCE_CONSTANTS.PRODUCT_ID_IOS).toBe('com.nonturn.onedayos.identity_insurance');
      expect(INSURANCE_CONSTANTS.PRODUCT_ID_ANDROID).toBe('identity_insurance');
    });

    it('should have correct price display', () => {
      expect(INSURANCE_CONSTANTS.PRICE_DISPLAY).toBe('¥1,500');
    });
  });
});
