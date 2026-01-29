/**
 * IdentityEngine Tests
 * Focus: SQL Injection Prevention
 */
import { IdentityEngine } from './IdentityEngine';
import { getDB } from '../database/client';

// Mock database
jest.mock('../database/client', () => ({
  getDB: jest.fn(),
}));

describe('IdentityEngine - SQL Injection Prevention', () => {
  let mockDB: any;

  beforeEach(() => {
    mockDB = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue(undefined),
      getFirstAsync: jest.fn().mockResolvedValue({ identity_health: 100, is_dead: 0 }),
    };
    (getDB as jest.Mock).mockReturnValue(mockDB);
  });

  describe('applyDamage', () => {
    it('should use parameterized query instead of string interpolation', async () => {
      await IdentityEngine.applyDamage(10);

      // Should use runAsync with parameters, NOT execAsync with string interpolation
      expect(mockDB.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('?'),
        expect.arrayContaining([10])
      );
    });

    it('should reject malicious SQL injection attempt', async () => {
      const maliciousInput = "10; DROP TABLE user_status; --" as any;

      await IdentityEngine.applyDamage(maliciousInput);

      // runAsync should safely handle the malicious input as a parameter
      // The DB should still exist (not dropped)
      expect(mockDB.runAsync).toHaveBeenCalled();

      // Should NOT use execAsync with string interpolation
      const execCalls = mockDB.execAsync.mock.calls.filter((call: any[]) =>
        call[0].includes('DROP') || call[0].includes(maliciousInput)
      );
      expect(execCalls.length).toBe(0);
    });

    it('should handle negative damage values safely', async () => {
      await IdentityEngine.applyDamage(-10);

      // Should use parameterized query
      expect(mockDB.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([-10])
      );
    });

    it('should handle zero damage', async () => {
      await IdentityEngine.applyDamage(0);

      expect(mockDB.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([0])
      );
    });
  });

  describe('restoreHealth', () => {
    it('should use parameterized query', async () => {
      await IdentityEngine.restoreHealth(5);

      expect(mockDB.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('?'),
        expect.arrayContaining([5])
      );
    });

    it('should reject SQL injection in healing amount', async () => {
      const maliciousInput = "100; UPDATE user_status SET identity_health = 0; --" as any;

      await IdentityEngine.restoreHealth(maliciousInput);

      // Should safely handle as parameter
      expect(mockDB.runAsync).toHaveBeenCalled();

      // Should NOT execute the malicious UPDATE
      const dangerousCalls = mockDB.execAsync.mock.calls.filter((call: any[]) =>
        call[0].includes('identity_health = 0')
      );
      expect(dangerousCalls.length).toBe(0);
    });
  });

  describe('checkHealth', () => {
    it('should return health status', async () => {
      const result = await IdentityEngine.checkHealth();

      expect(result).toEqual({
        health: 100,
        isDead: false,
      });
    });

    it('should handle dead user', async () => {
      mockDB.getFirstAsync.mockResolvedValue({ identity_health: 0, is_dead: 1 });

      const result = await IdentityEngine.checkHealth();

      expect(result).toEqual({
        health: 0,
        isDead: true,
      });
    });

    it('should trigger killUser when IH reaches 0', async () => {
      mockDB.getFirstAsync.mockResolvedValue({ identity_health: 0, is_dead: 0 });
      const killUserSpy = jest.spyOn(IdentityEngine, 'killUser').mockResolvedValue();

      await IdentityEngine.checkHealth();

      expect(killUserSpy).toHaveBeenCalled();
    });
  });

  describe('getAntiVision', () => {
    it('should return anti-vision content from DB', async () => {
      mockDB.getFirstAsync.mockResolvedValue({ content: 'Test Anti-Vision Content' });

      const result = await IdentityEngine.getAntiVision();

      expect(result).toBe('Test Anti-Vision Content');
      expect(mockDB.getFirstAsync).toHaveBeenCalledWith(
        'SELECT content FROM anti_vision WHERE id = 1'
      );
    });

    it('should return empty string when no anti-vision exists', async () => {
      mockDB.getFirstAsync.mockResolvedValue(null);

      const result = await IdentityEngine.getAntiVision();

      expect(result).toBe('');
    });

    it('should return empty string when content is undefined', async () => {
      mockDB.getFirstAsync.mockResolvedValue({});

      const result = await IdentityEngine.getAntiVision();

      expect(result).toBe('');
    });
  });
});
