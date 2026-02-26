/**
 * One Day OS - IAPService Tests
 * Tests for react-native-iap wrapper with graceful fallback
 */

import { IAPService } from './IAPService';

// Mock react-native-iap as a virtual module (package not installed)
// The factory returns a module that throws on import to simulate missing package
jest.mock(
  'react-native-iap',
  () => {
    throw new Error('Cannot find module react-native-iap');
  },
  { virtual: true }
);

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('IAPService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    IAPService.resetInstance();
  });

  describe('singleton', () => {
    it('returns same instance on multiple calls', () => {
      const a = IAPService.getInstance();
      const b = IAPService.getInstance();
      expect(a).toBe(b);
    });

    it('returns new instance after resetInstance', () => {
      const a = IAPService.getInstance();
      IAPService.resetInstance();
      const b = IAPService.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('isAvailable', () => {
    it('returns false before initialization', () => {
      const iap = IAPService.getInstance();
      expect(iap.isAvailable()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('returns false when react-native-iap is not available', async () => {
      const iap = IAPService.getInstance();
      const result = await iap.initialize();

      expect(result).toBe(false);
      expect(iap.isAvailable()).toBe(false);
    });

    it('returns cached result on subsequent calls', async () => {
      const iap = IAPService.getInstance();
      await iap.initialize();
      const result = await iap.initialize();

      expect(result).toBe(false);
    });
  });

  describe('getProduct', () => {
    it('returns null when not available', async () => {
      const iap = IAPService.getInstance();
      const product = await iap.getProduct();

      expect(product).toBeNull();
    });
  });

  describe('purchase', () => {
    it('returns error when not available', async () => {
      const iap = IAPService.getInstance();
      const result = await iap.purchase();

      expect(result).toEqual({
        success: false,
        error: 'IAP not available',
      });
    });
  });

  describe('finishTransaction', () => {
    it('does not throw when not available', async () => {
      const iap = IAPService.getInstance();
      await expect(
        iap.finishTransaction('txn_123')
      ).resolves.toBeUndefined();
    });
  });

  describe('checkPendingTransactions', () => {
    it('returns empty array when not available', async () => {
      const iap = IAPService.getInstance();
      const result = await iap.checkPendingTransactions();

      expect(result).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('runs without error when not available', async () => {
      const iap = IAPService.getInstance();
      await expect(iap.dispose()).resolves.toBeUndefined();
    });

    it('resets initialized and available state', async () => {
      const iap = IAPService.getInstance();
      await iap.initialize();
      await iap.dispose();

      // After dispose, getInstance should return a new instance
      // because dispose sets instance to null
      const newIap = IAPService.getInstance();
      expect(newIap.isAvailable()).toBe(false);
    });
  });
});
