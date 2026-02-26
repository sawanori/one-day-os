/**
 * InsuranceManager - Insurance business logic
 *
 * Handles eligibility checks, insurance application, purchase recording,
 * and purchase history queries. Orchestrates IAPService, IdentityBackupManager,
 * and IdentityEngine.
 */
import { getDB } from '../../database/client';
import { DB_TABLES, INSURANCE_CONSTANTS } from '../../constants';
import { isFeatureEnabled } from '../../config/features';
import { IAPService } from './IAPService';
import { IdentityBackupManager } from './IdentityBackupManager';
import type {
  InsuranceEligibility,
  InsurancePurchaseRecord,
  InsuranceProduct,
} from './types';

export class InsuranceManager {
  /**
   * Check if the user is eligible for insurance in the current death sequence.
   * Must pass ALL conditions:
   * 1. INSURANCE_ENABLED feature flag is on
   * 2. User has NOT already used insurance in this life
   * 3. IAP is available (store reachable)
   * 4. Identity backup was created successfully
   */
  static async checkEligibility(): Promise<InsuranceEligibility> {
    // Check 1: Feature flag
    if (!isFeatureEnabled('INSURANCE_ENABLED')) {
      return { eligible: false, reason: 'feature_disabled' };
    }

    // Check 2: Already used insurance this life
    const db = getDB();
    const appState = await db.getFirstAsync<{ has_used_insurance: number }>(
      'SELECT has_used_insurance FROM app_state WHERE id = 1'
    );
    if (appState?.has_used_insurance === 1) {
      return { eligible: false, reason: 'already_revived' };
    }

    // Check 3: IAP available
    const iap = IAPService.getInstance();
    if (!iap.isAvailable()) {
      return { eligible: false, reason: 'iap_unavailable' };
    }

    // Check 4: Backup exists
    const hasBackup = await IdentityBackupManager.hasBackup();
    if (!hasBackup) {
      return { eligible: false, reason: 'backup_failed' };
    }

    return { eligible: true };
  }

  /**
   * Apply insurance: restore identity from backup and set IH to revival value.
   * Records the purchase in insurance_purchases table.
   *
   * @param transactionId The IAP transaction ID
   * @param product The product info (for price recording)
   * @returns true if application was successful
   */
  static async applyInsurance(
    transactionId: string,
    product: InsuranceProduct | null
  ): Promise<boolean> {
    const db = getDB();

    try {
      const revivalIH = INSURANCE_CONSTANTS.REVIVAL_IH;

      // Restore identity from backup (also sets has_used_insurance = 1)
      const restored =
        await IdentityBackupManager.restoreFromBackup(revivalIH);
      if (!restored) {
        return false;
      }

      // Get current life number for recording
      const appState = await db.getFirstAsync<{ life_number: number }>(
        'SELECT life_number FROM app_state WHERE id = 1'
      );
      const lifeNumber = appState?.life_number ?? 1;

      // Record the purchase
      await db.runAsync(
        `INSERT INTO ${DB_TABLES.INSURANCE_PURCHASES}
         (transaction_id, product_id, price_amount, price_currency, life_number, purchased_at, ih_before, ih_after)
         VALUES (?, ?, ?, ?, ?, datetime('now'), 0, ?)`,
        [
          transactionId,
          product?.productId || 'unknown',
          product?.priceAmount ?? null,
          product?.currency ?? null,
          lifeNumber,
          revivalIH,
        ]
      );

      return true;
    } catch (error) {
      console.error('[InsuranceManager] applyInsurance failed:', error);
      return false;
    }
  }

  /**
   * Get total number of insurance purchases ever made (across all lives).
   * Used for "PAID IDENTITY" shame level display.
   */
  static async getTotalPurchaseCount(): Promise<number> {
    const db = getDB();
    try {
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${DB_TABLES.INSURANCE_PURCHASES}`
      );
      return result?.count ?? 0;
    } catch (error) {
      console.error('[InsuranceManager] getTotalPurchaseCount failed:', error);
      return 0;
    }
  }

  /**
   * Check if user has ever used insurance (any life).
   * Used for permanent "PAID IDENTITY" watermark.
   */
  static async hasEverUsedInsurance(): Promise<boolean> {
    return (await InsuranceManager.getTotalPurchaseCount()) > 0;
  }

  /**
   * Get all purchase records (for analytics/debugging).
   */
  static async getPurchaseHistory(): Promise<InsurancePurchaseRecord[]> {
    const db = getDB();
    try {
      const rows = await db.getAllAsync<{
        id: number;
        transaction_id: string;
        product_id: string;
        price_amount: number | null;
        price_currency: string | null;
        life_number: number;
        purchased_at: string;
        ih_before: number;
        ih_after: number;
      }>(
        `SELECT * FROM ${DB_TABLES.INSURANCE_PURCHASES} ORDER BY purchased_at DESC`
      );

      return rows.map((row) => ({
        id: row.id,
        transactionId: row.transaction_id,
        productId: row.product_id,
        priceAmount: row.price_amount,
        priceCurrency: row.price_currency,
        lifeNumber: row.life_number,
        purchasedAt: row.purchased_at,
        ihBefore: row.ih_before,
        ihAfter: row.ih_after,
      }));
    } catch (error) {
      console.error('[InsuranceManager] getPurchaseHistory failed:', error);
      return [];
    }
  }

  /**
   * Get the insurance product with localized pricing.
   * Convenience wrapper around IAPService.getProduct().
   */
  static async getProduct(): Promise<InsuranceProduct | null> {
    const iap = IAPService.getInstance();
    return iap.getProduct();
  }
}
