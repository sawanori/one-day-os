/**
 * Insurance System Types
 */

export interface InsuranceProduct {
  productId: string;
  localizedPrice: string;
  currency: string;
  priceAmount: number;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface InsurancePurchaseRecord {
  id: number;
  transactionId: string;
  productId: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  lifeNumber: number;
  purchasedAt: string;
  ihBefore: number;
  ihAfter: number;
}

export interface InsuranceEligibility {
  eligible: boolean;
  reason?: 'feature_disabled' | 'already_revived' | 'iap_unavailable' | 'backup_failed';
}
