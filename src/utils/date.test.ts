/**
 * One Day OS - Date Utility Tests
 */

import { getLocalDatetime, getTodayString } from './date';

describe('date utilities', () => {
  describe('getLocalDatetime', () => {
    it('should return YYYY-MM-DD HH:MM:SS format', () => {
      const result = getLocalDatetime(new Date(2026, 0, 15, 9, 5, 3)); // Jan 15, 2026 09:05:03
      expect(result).toBe('2026-01-15 09:05:03');
    });

    it('should pad single-digit month, day, hour, minute, second', () => {
      const result = getLocalDatetime(new Date(2026, 0, 1, 1, 2, 3)); // Jan 1, 2026 01:02:03
      expect(result).toBe('2026-01-01 01:02:03');
    });

    it('should handle end of year', () => {
      const result = getLocalDatetime(new Date(2025, 11, 31, 23, 59, 59)); // Dec 31, 2025 23:59:59
      expect(result).toBe('2025-12-31 23:59:59');
    });

    it('should default to current time when no argument provided', () => {
      const before = new Date();
      const result = getLocalDatetime();
      const after = new Date();

      // Result should be parseable and within the before/after window
      const parsed = new Date(result.replace(' ', 'T'));
      expect(parsed.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(parsed.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should not include timezone offset characters', () => {
      const result = getLocalDatetime(new Date(2026, 5, 15, 14, 30, 0));
      expect(result).not.toContain('Z');
      expect(result).not.toContain('+');
      expect(result).not.toMatch(/-\d{2}:\d{2}$/);
    });
  });

  describe('getTodayString', () => {
    it('should return YYYY-MM-DD format', () => {
      const result = getTodayString(new Date(2026, 1, 26)); // Feb 26, 2026
      expect(result).toBe('2026-02-26');
    });

    it('should pad single-digit month and day', () => {
      const result = getTodayString(new Date(2026, 0, 5)); // Jan 5, 2026
      expect(result).toBe('2026-01-05');
    });

    it('should handle end of year', () => {
      const result = getTodayString(new Date(2025, 11, 31)); // Dec 31, 2025
      expect(result).toBe('2025-12-31');
    });

    it('should default to current date when no argument provided', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(getTodayString()).toBe(expected);
    });

    it('getLocalDatetime date portion should match getTodayString for the same date', () => {
      const date = new Date(2026, 5, 15, 14, 30, 0);
      const datetime = getLocalDatetime(date);
      const today = getTodayString(date);
      expect(datetime.startsWith(today)).toBe(true);
    });
  });
});
