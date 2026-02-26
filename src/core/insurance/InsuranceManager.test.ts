/**
 * One Day OS - InsuranceManager Tests
 * Tests for insurance business logic: eligibility, application, and history
 */

import { InsuranceManager } from './InsuranceManager';
import { getDB } from '../../database/client';
import { isFeatureEnabled } from '../../config/features';
import { IAPService } from './IAPService';
import { IdentityBackupManager } from './IdentityBackupManager';

// Mock dependencies
jest.mock('../../database/client', () => ({
  getDB: jest.fn(),
}));

jest.mock('../../config/features', () => ({
  isFeatureEnabled: jest.fn(),
}));

jest.mock('./IAPService', () => ({
  IAPService: { getInstance: jest.fn() },
}));

jest.mock('./IdentityBackupManager', () => ({
  IdentityBackupManager: {
    hasBackup: jest.fn(),
    restoreFromBackup: jest.fn(),
    clearBackup: jest.fn(),
  },
}));

const mockGetDB = getDB as jest.Mock;
const mockIsFeatureEnabled = isFeatureEnabled as jest.Mock;
const mockIAPGetInstance = IAPService.getInstance as jest.Mock;
const mockHasBackup = IdentityBackupManager.hasBackup as jest.Mock;
const mockRestoreFromBackup =
  IdentityBackupManager.restoreFromBackup as jest.Mock;

describe('InsuranceManager', () => {
  let mockDb: {
    getFirstAsync: jest.Mock;
    runAsync: jest.Mock;
    getAllAsync: jest.Mock;
  };

  let mockIAPInstance: {
    isAvailable: jest.Mock;
    getProduct: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      getAllAsync: jest.fn(),
    };
    mockGetDB.mockReturnValue(mockDb);

    mockIAPInstance = {
      isAvailable: jest.fn().mockReturnValue(true),
      getProduct: jest.fn().mockResolvedValue(null),
    };
    mockIAPGetInstance.mockReturnValue(mockIAPInstance);
  });

  describe('checkEligibility', () => {
    it('returns feature_disabled when INSURANCE_ENABLED is off', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);

      const result = await InsuranceManager.checkEligibility();

      expect(result).toEqual({ eligible: false, reason: 'feature_disabled' });
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('INSURANCE_ENABLED');
    });

    it('returns already_revived when has_used_insurance is 1', async () => {
      mockIsFeatureEnabled.mockReturnValue(true);
      mockDb.getFirstAsync.mockResolvedValueOnce({ has_used_insurance: 1 });

      const result = await InsuranceManager.checkEligibility();

      expect(result).toEqual({ eligible: false, reason: 'already_revived' });
    });

    it('returns iap_unavailable when IAP is not available', async () => {
      mockIsFeatureEnabled.mockReturnValue(true);
      mockDb.getFirstAsync.mockResolvedValueOnce({ has_used_insurance: 0 });
      mockIAPInstance.isAvailable.mockReturnValue(false);

      const result = await InsuranceManager.checkEligibility();

      expect(result).toEqual({ eligible: false, reason: 'iap_unavailable' });
    });

    it('returns backup_failed when no backup exists', async () => {
      mockIsFeatureEnabled.mockReturnValue(true);
      mockDb.getFirstAsync.mockResolvedValueOnce({ has_used_insurance: 0 });
      mockIAPInstance.isAvailable.mockReturnValue(true);
      mockHasBackup.mockResolvedValueOnce(false);

      const result = await InsuranceManager.checkEligibility();

      expect(result).toEqual({ eligible: false, reason: 'backup_failed' });
    });

    it('returns eligible when all conditions are met', async () => {
      mockIsFeatureEnabled.mockReturnValue(true);
      mockDb.getFirstAsync.mockResolvedValueOnce({ has_used_insurance: 0 });
      mockIAPInstance.isAvailable.mockReturnValue(true);
      mockHasBackup.mockResolvedValueOnce(true);

      const result = await InsuranceManager.checkEligibility();

      expect(result).toEqual({ eligible: true });
    });
  });

  describe('applyInsurance', () => {
    const mockProduct = {
      productId: 'com.nonturn.onedayos.identity_insurance',
      localizedPrice: '¥1,500',
      currency: 'JPY',
      priceAmount: 1500,
    };

    it('restores from backup and records purchase on success', async () => {
      mockRestoreFromBackup.mockResolvedValueOnce(true);
      mockDb.getFirstAsync.mockResolvedValueOnce({ life_number: 2 });
      mockDb.runAsync.mockResolvedValueOnce({ changes: 1 });

      const result = await InsuranceManager.applyInsurance(
        'txn_abc123',
        mockProduct
      );

      expect(result).toBe(true);

      // Verify restore was called with revival IH (10)
      expect(mockRestoreFromBackup).toHaveBeenCalledWith(10);

      // Verify purchase was recorded (includes local datetime for purchased_at)
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO insurance_purchases'),
        [
          'txn_abc123',
          'com.nonturn.onedayos.identity_insurance',
          1500,
          'JPY',
          2,
          expect.any(String),
          10,
        ]
      );
    });

    it('returns false when restore fails', async () => {
      mockRestoreFromBackup.mockResolvedValueOnce(false);

      const result = await InsuranceManager.applyInsurance(
        'txn_abc123',
        mockProduct
      );

      expect(result).toBe(false);
      // Should not attempt to record purchase
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('handles null product gracefully', async () => {
      mockRestoreFromBackup.mockResolvedValueOnce(true);
      mockDb.getFirstAsync.mockResolvedValueOnce({ life_number: 1 });
      mockDb.runAsync.mockResolvedValueOnce({ changes: 1 });

      const result = await InsuranceManager.applyInsurance('txn_xyz', null);

      expect(result).toBe(true);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO insurance_purchases'),
        ['txn_xyz', 'unknown', null, null, 1, expect.any(String), 10]
      );
    });

    it('returns false when DB insert throws', async () => {
      mockRestoreFromBackup.mockResolvedValueOnce(true);
      mockDb.getFirstAsync.mockResolvedValueOnce({ life_number: 1 });
      mockDb.runAsync.mockRejectedValueOnce(new Error('Insert failed'));

      const result = await InsuranceManager.applyInsurance(
        'txn_abc123',
        mockProduct
      );

      expect(result).toBe(false);
    });
  });

  describe('getTotalPurchaseCount', () => {
    it('returns count from database', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 3 });

      const result = await InsuranceManager.getTotalPurchaseCount();

      expect(result).toBe(3);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)')
      );
    });

    it('returns 0 when no records exist', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 0 });

      const result = await InsuranceManager.getTotalPurchaseCount();

      expect(result).toBe(0);
    });

    it('returns 0 on database error', async () => {
      mockDb.getFirstAsync.mockRejectedValueOnce(new Error('DB error'));

      const result = await InsuranceManager.getTotalPurchaseCount();

      expect(result).toBe(0);
    });
  });

  describe('hasEverUsedInsurance', () => {
    it('returns true when purchase count > 0', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 1 });

      const result = await InsuranceManager.hasEverUsedInsurance();

      expect(result).toBe(true);
    });

    it('returns false when purchase count is 0', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 0 });

      const result = await InsuranceManager.hasEverUsedInsurance();

      expect(result).toBe(false);
    });
  });

  describe('getPurchaseHistory', () => {
    it('returns mapped purchase records', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([
        {
          id: 1,
          transaction_id: 'txn_001',
          product_id: 'identity_insurance',
          price_amount: 1500,
          price_currency: 'JPY',
          life_number: 1,
          purchased_at: '2026-02-08 12:00:00',
          ih_before: 0,
          ih_after: 10,
        },
        {
          id: 2,
          transaction_id: 'txn_002',
          product_id: 'identity_insurance',
          price_amount: 1500,
          price_currency: 'JPY',
          life_number: 2,
          purchased_at: '2026-02-08 18:00:00',
          ih_before: 0,
          ih_after: 10,
        },
      ]);

      const history = await InsuranceManager.getPurchaseHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        id: 1,
        transactionId: 'txn_001',
        productId: 'identity_insurance',
        priceAmount: 1500,
        priceCurrency: 'JPY',
        lifeNumber: 1,
        purchasedAt: '2026-02-08 12:00:00',
        ihBefore: 0,
        ihAfter: 10,
      });
      expect(history[1].transactionId).toBe('txn_002');
    });

    it('returns empty array when no records exist', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);

      const history = await InsuranceManager.getPurchaseHistory();

      expect(history).toEqual([]);
    });

    it('returns empty array on database error', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('DB error'));

      const history = await InsuranceManager.getPurchaseHistory();

      expect(history).toEqual([]);
    });
  });

  describe('getProduct', () => {
    it('delegates to IAPService.getProduct', async () => {
      const mockProduct = {
        productId: 'test',
        localizedPrice: '¥1,500',
        currency: 'JPY',
        priceAmount: 1500,
      };
      mockIAPInstance.getProduct.mockResolvedValueOnce(mockProduct);

      const result = await InsuranceManager.getProduct();

      expect(result).toBe(mockProduct);
      expect(mockIAPInstance.getProduct).toHaveBeenCalled();
    });

    it('returns null when IAPService returns null', async () => {
      mockIAPInstance.getProduct.mockResolvedValueOnce(null);

      const result = await InsuranceManager.getProduct();

      expect(result).toBeNull();
    });
  });
});
