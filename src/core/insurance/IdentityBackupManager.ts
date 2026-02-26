/**
 * IdentityBackupManager
 *
 * Saves identity data to identity_backup table before death sequence begins.
 * Insurance purchase reads from backup to restore identity.
 * Backup is cleaned up after insurance application or wipe execution.
 */
import { getDB } from '../../database/client';
import { DB_TABLES } from '../../constants';

export interface IdentityBackup {
  antiVision: string;
  identityStatement: string;
  oneYearMission: string;
  originalIH: number;
  backedUpAt: string;
}

export class IdentityBackupManager {
  /**
   * Create a backup of current identity data before death sequence.
   * Returns true if backup was successful, false if identity data is missing.
   */
  static async createBackup(): Promise<boolean> {
    const db = getDB();
    try {
      const identity = await db.getFirstAsync<{
        anti_vision: string;
        identity_statement: string;
        one_year_mission: string;
        identity_health: number;
      }>(
        `SELECT anti_vision, identity_statement, one_year_mission, identity_health
         FROM ${DB_TABLES.IDENTITY} WHERE id = 1`
      );

      if (!identity) {
        console.warn('[IdentityBackupManager] No identity data to backup');
        return false;
      }

      // Clear any existing backup first
      await db.runAsync(`DELETE FROM ${DB_TABLES.IDENTITY_BACKUP}`);

      // Insert backup
      await db.runAsync(
        `INSERT INTO ${DB_TABLES.IDENTITY_BACKUP}
         (id, anti_vision, identity_statement, one_year_mission, original_ih, backed_up_at)
         VALUES (1, ?, ?, ?, ?, datetime('now'))`,
        [
          identity.anti_vision,
          identity.identity_statement,
          identity.one_year_mission,
          identity.identity_health,
        ]
      );

      return true;
    } catch (error) {
      console.error('[IdentityBackupManager] Backup failed:', error);
      return false;
    }
  }

  /**
   * Get the backup data for restoration during insurance purchase.
   * Returns null if no backup exists.
   */
  static async getBackup(): Promise<IdentityBackup | null> {
    const db = getDB();
    try {
      const row = await db.getFirstAsync<{
        anti_vision: string;
        identity_statement: string;
        one_year_mission: string;
        original_ih: number;
        backed_up_at: string;
      }>(
        `SELECT anti_vision, identity_statement, one_year_mission, original_ih, backed_up_at
         FROM ${DB_TABLES.IDENTITY_BACKUP} WHERE id = 1`
      );

      if (!row) return null;

      return {
        antiVision: row.anti_vision,
        identityStatement: row.identity_statement,
        oneYearMission: row.one_year_mission,
        originalIH: row.original_ih,
        backedUpAt: row.backed_up_at,
      };
    } catch (error) {
      console.error('[IdentityBackupManager] Get backup failed:', error);
      return null;
    }
  }

  /**
   * Check if a backup exists (used for interrupted death flow recovery).
   */
  static async hasBackup(): Promise<boolean> {
    const db = getDB();
    try {
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${DB_TABLES.IDENTITY_BACKUP}`
      );
      return (result?.count ?? 0) > 0;
    } catch (error) {
      console.error('[IdentityBackupManager] hasBackup check failed:', error);
      return false;
    }
  }

  /**
   * Clear the backup after insurance application or wipe.
   */
  static async clearBackup(): Promise<void> {
    const db = getDB();
    try {
      await db.runAsync(`DELETE FROM ${DB_TABLES.IDENTITY_BACKUP}`);
    } catch (error) {
      console.error('[IdentityBackupManager] Clear backup failed:', error);
    }
  }

  /**
   * Restore identity from backup and set IH to the specified value.
   * Used during insurance purchase to recover wiped identity data.
   * @param revivalIH The IH value to set after restoration (typically 10)
   * @returns true if restoration was successful
   */
  static async restoreFromBackup(revivalIH: number): Promise<boolean> {
    const db = getDB();
    try {
      const backup = await IdentityBackupManager.getBackup();
      if (!backup) {
        console.error('[IdentityBackupManager] No backup to restore from');
        return false;
      }

      // Restore identity with backup data and new IH
      await db.runAsync(
        `INSERT OR REPLACE INTO ${DB_TABLES.IDENTITY}
         (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          backup.antiVision,
          backup.identityStatement,
          backup.oneYearMission,
          revivalIH,
        ]
      );

      // Mark insurance as used and restore active state
      await db.runAsync(
        "UPDATE app_state SET state = ?, has_used_insurance = 1, updated_at = datetime('now') WHERE id = 1",
        ['active']
      );

      // Clean up backup
      await IdentityBackupManager.clearBackup();

      return true;
    } catch (error) {
      console.error('[IdentityBackupManager] Restore failed:', error);
      return false;
    }
  }
}
