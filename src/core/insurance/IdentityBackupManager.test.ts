/**
 * One Day OS - IdentityBackupManager Tests
 * Tests for identity backup/restore during insurance death flow
 */

import { IdentityBackupManager } from './IdentityBackupManager';
import { getDB } from '../../database/client';

// Mock database client
jest.mock('../../database/client', () => ({
  getDB: jest.fn(),
}));

const mockGetDB = getDB as jest.Mock;

describe('IdentityBackupManager', () => {
  let mockDb: {
    getFirstAsync: jest.Mock;
    runAsync: jest.Mock;
    getAllAsync: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };

    mockGetDB.mockReturnValue(mockDb);
  });

  describe('createBackup', () => {
    it('reads identity, deletes old backup, and inserts new backup', async () => {
      // Mock identity data exists
      mockDb.getFirstAsync.mockResolvedValueOnce({
        anti_vision: 'My anti-vision',
        identity_statement: 'I am a builder',
        one_year_mission: 'Ship the product',
        identity_health: 75,
      });
      // Mock DELETE and INSERT succeed
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const result = await IdentityBackupManager.createBackup();

      expect(result).toBe(true);

      // Verify identity was read
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT anti_vision')
      );

      // Verify old backup was deleted
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM identity_backup')
      );

      // Verify new backup was inserted with correct values
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO identity_backup'),
        ['My anti-vision', 'I am a builder', 'Ship the product', 75]
      );
    });

    it('returns false when no identity data exists', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const result = await IdentityBackupManager.createBackup();

      expect(result).toBe(false);
      // Should not attempt DELETE or INSERT
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('returns false on database error', async () => {
      mockDb.getFirstAsync.mockRejectedValueOnce(new Error('DB read error'));

      const result = await IdentityBackupManager.createBackup();

      expect(result).toBe(false);
    });
  });

  describe('getBackup', () => {
    it('returns formatted backup object when backup exists', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({
        anti_vision: 'Stored anti-vision',
        identity_statement: 'Stored identity',
        one_year_mission: 'Stored mission',
        original_ih: 60,
        backed_up_at: '2026-02-08 12:00:00',
      });

      const backup = await IdentityBackupManager.getBackup();

      expect(backup).toEqual({
        antiVision: 'Stored anti-vision',
        identityStatement: 'Stored identity',
        oneYearMission: 'Stored mission',
        originalIH: 60,
        backedUpAt: '2026-02-08 12:00:00',
      });
    });

    it('returns null when no backup exists', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const backup = await IdentityBackupManager.getBackup();

      expect(backup).toBeNull();
    });

    it('returns null on database error', async () => {
      mockDb.getFirstAsync.mockRejectedValueOnce(new Error('DB error'));

      const backup = await IdentityBackupManager.getBackup();

      expect(backup).toBeNull();
    });
  });

  describe('hasBackup', () => {
    it('returns true when backup exists', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 1 });

      const result = await IdentityBackupManager.hasBackup();

      expect(result).toBe(true);
    });

    it('returns false when no backup exists', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 0 });

      const result = await IdentityBackupManager.hasBackup();

      expect(result).toBe(false);
    });

    it('returns false on database error', async () => {
      mockDb.getFirstAsync.mockRejectedValueOnce(new Error('DB error'));

      const result = await IdentityBackupManager.hasBackup();

      expect(result).toBe(false);
    });
  });

  describe('clearBackup', () => {
    it('executes DELETE on identity_backup table', async () => {
      mockDb.runAsync.mockResolvedValueOnce({ changes: 1 });

      await IdentityBackupManager.clearBackup();

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM identity_backup')
      );
    });

    it('does not throw on database error', async () => {
      mockDb.runAsync.mockRejectedValueOnce(new Error('DB error'));

      // Should not throw
      await expect(
        IdentityBackupManager.clearBackup()
      ).resolves.toBeUndefined();
    });
  });

  describe('restoreFromBackup', () => {
    it('restores identity from backup, sets IH, marks insurance used, and clears backup', async () => {
      // First call: getBackup reads from identity_backup
      mockDb.getFirstAsync.mockResolvedValueOnce({
        anti_vision: 'Backed up vision',
        identity_statement: 'Backed up identity',
        one_year_mission: 'Backed up mission',
        original_ih: 80,
        backed_up_at: '2026-02-08 10:00:00',
      });

      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const result = await IdentityBackupManager.restoreFromBackup(10);

      expect(result).toBe(true);

      // Verify identity was restored with revivalIH
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO identity'),
        ['Backed up vision', 'Backed up identity', 'Backed up mission', 10]
      );

      // Verify app_state was updated
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE app_state'),
        ['active']
      );

      // Verify backup was cleared
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM identity_backup')
      );
    });

    it('returns false when no backup exists', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);

      const result = await IdentityBackupManager.restoreFromBackup(10);

      expect(result).toBe(false);
      // Should not attempt any writes
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('returns false on database error during restore', async () => {
      // getBackup succeeds
      mockDb.getFirstAsync.mockResolvedValueOnce({
        anti_vision: 'Vision',
        identity_statement: 'Identity',
        one_year_mission: 'Mission',
        original_ih: 50,
        backed_up_at: '2026-02-08 10:00:00',
      });

      // INSERT fails
      mockDb.runAsync.mockRejectedValueOnce(new Error('Insert failed'));

      const result = await IdentityBackupManager.restoreFromBackup(10);

      expect(result).toBe(false);
    });
  });
});
