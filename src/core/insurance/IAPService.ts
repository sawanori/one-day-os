/**
 * IAPService - react-native-iap wrapper
 *
 * Handles all interactions with the App Store / Google Play billing system.
 * Designed to fail gracefully when react-native-iap is not available.
 */
import { Platform } from 'react-native';
import { INSURANCE_CONSTANTS } from '../../constants';
import type { InsuranceProduct, PurchaseResult } from './types';

export class IAPService {
  private static instance: IAPService | null = null;
  private initialized: boolean = false;
  private available: boolean = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): IAPService {
    if (!IAPService.instance) {
      IAPService.instance = new IAPService();
    }
    return IAPService.instance;
  }

  static resetInstance(): void {
    if (IAPService.instance) {
      IAPService.instance.initialized = false;
      IAPService.instance.available = false;
      IAPService.instance.initPromise = null;
    }
    IAPService.instance = null;
  }

  /**
   * Initialize IAP connection.
   * Must be called on app startup (from _layout.tsx).
   * Fails gracefully if react-native-iap is not installed.
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return this.available;

    // Guard against concurrent calls: reuse in-flight promise
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<boolean> {
    try {
      const RNIap = await import('react-native-iap').catch(() => null);
      if (!RNIap) {
        console.warn('[IAPService] react-native-iap not available');
        this.initialized = true;
        this.available = false;
        return false;
      }

      await RNIap.initConnection();
      this.available = true;
      this.initialized = true;

      return true;
    } catch (error) {
      console.warn('[IAPService] IAP initialization failed:', error);
      this.initialized = true;
      this.available = false;
      return false;
    }
  }

  /**
   * Check if IAP is available (initialized and store is reachable)
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Get the insurance product with localized pricing from the store.
   * Returns null if IAP is unavailable or product not found.
   */
  async getProduct(): Promise<InsuranceProduct | null> {
    if (!this.available) return null;

    try {
      const RNIap = await import('react-native-iap').catch(() => null);
      if (!RNIap) return null;

      const productId =
        Platform.OS === 'ios'
          ? INSURANCE_CONSTANTS.PRODUCT_ID_IOS
          : INSURANCE_CONSTANTS.PRODUCT_ID_ANDROID;

      const products = await RNIap.fetchProducts({
        skus: [productId],
        type: 'in-app',
      });

      if (!products || products.length === 0) {
        console.warn('[IAPService] Product not found:', productId);
        return null;
      }

      const product = products[0];
      return {
        productId: product.id,
        localizedPrice:
          product.displayPrice || INSURANCE_CONSTANTS.PRICE_DISPLAY,
        currency: product.currency || 'JPY',
        priceAmount: Number(product.price) || 1500,
      };
    } catch (error) {
      console.error('[IAPService] getProduct failed:', error);
      return null;
    }
  }

  /**
   * Request a purchase of the insurance product.
   * Returns the purchase result with transaction ID.
   *
   * Uses event-listener-based approach (per react-native-iap v14 docs) because
   * requestPurchase() is fire-and-forget - results come through listeners, not
   * the returned promise.
   *
   * Important: After success, caller MUST call finishTransaction() to
   * acknowledge the transaction with the store.
   */
  async purchase(): Promise<PurchaseResult> {
    if (!this.available) {
      return { success: false, error: 'IAP not available' };
    }

    try {
      const RNIap = await import('react-native-iap').catch(() => null);
      if (!RNIap) {
        return { success: false, error: 'react-native-iap not installed' };
      }

      const productId =
        Platform.OS === 'ios'
          ? INSURANCE_CONSTANTS.PRODUCT_ID_IOS
          : INSURANCE_CONSTANTS.PRODUCT_ID_ANDROID;

      // Event-based purchase handling (per react-native-iap v14 docs).
      // requestPurchase() may never resolve its own promise; results arrive
      // via purchaseUpdatedListener / purchaseErrorListener instead.
      return new Promise<PurchaseResult>((resolve) => {
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout>;
        let updateSub: { remove: () => void } | null = null;
        let errorSub: { remove: () => void } | null = null;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          updateSub?.remove();
          errorSub?.remove();
        };

        const settle = (result: PurchaseResult) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(result);
        };

        // Listen for successful purchase
        updateSub = RNIap.purchaseUpdatedListener((purchase) => {
          const transactionId = purchase?.transactionId;
          if (transactionId) {
            settle({ success: true, transactionId });
          } else {
            settle({ success: false, error: 'No transaction ID returned' });
          }
        });

        // Listen for purchase errors
        errorSub = RNIap.purchaseErrorListener((error: any) => {
          if (error?.code === 'E_USER_CANCELLED') {
            settle({ success: false, error: 'cancelled' });
          } else {
            console.error('[IAPService] Purchase error via listener:', error);
            settle({ success: false, error: error?.message || 'Purchase failed' });
          }
        });

        // Safety timeout - resolve after 15 s if no event arrives
        timeoutId = setTimeout(() => {
          settle({ success: false, error: 'timeout' });
        }, 15000);

        // Fire the purchase request; results come through the listeners above
        RNIap.requestPurchase({
          request: {
            apple: { sku: productId },
            google: { skus: [productId] },
          },
          type: 'in-app',
        }).catch((err: any) => {
          // Some platforms may reject the promise directly (e.g. immediate errors)
          if (err?.code === 'E_USER_CANCELLED') {
            settle({ success: false, error: 'cancelled' });
          } else {
            console.error('[IAPService] requestPurchase threw:', err);
            settle({ success: false, error: err?.message || 'Purchase request failed' });
          }
        });
      });
    } catch (error: any) {
      console.error('[IAPService] Purchase failed:', error);
      return { success: false, error: error?.message || 'Purchase failed' };
    }
  }

  /**
   * Finish/acknowledge a transaction with the store.
   * MUST be called after successful purchase to prevent store from refunding.
   */
  async finishTransaction(transactionId: string): Promise<void> {
    try {
      const RNIap = await import('react-native-iap').catch(() => null);
      if (!RNIap) return;

      await RNIap.finishTransaction({
        purchase: { transactionId } as any,
        isConsumable: true,
      });
    } catch (error) {
      console.error('[IAPService] finishTransaction failed:', error);
    }
  }

  /**
   * Check for any pending (unfinished) transactions from previous sessions.
   * Should be called on app startup to handle crash-during-purchase scenarios.
   */
  async checkPendingTransactions(): Promise<string[]> {
    if (!this.available) return [];

    try {
      const RNIap = await import('react-native-iap').catch(() => null);
      if (!RNIap) return [];

      const availablePurchases = await RNIap.getAvailablePurchases({});
      const pendingIds: string[] = [];

      for (const purchase of availablePurchases) {
        if (purchase.transactionId) {
          pendingIds.push(purchase.transactionId);
          await RNIap.finishTransaction({
            purchase,
            isConsumable: true,
          });
        }
      }

      return pendingIds;
    } catch (error) {
      console.error('[IAPService] checkPendingTransactions failed:', error);
      return [];
    }
  }

  /**
   * Clean up IAP connection and listeners
   */
  async dispose(): Promise<void> {
    try {
      const RNIap = await import('react-native-iap').catch(() => null);
      if (!RNIap) return;

      await RNIap.endConnection();
    } catch (error) {
      console.warn('[IAPService] dispose failed:', error);
    }
    this.initialized = false;
    this.available = false;
    this.initPromise = null;
    IAPService.instance = null;
  }
}
