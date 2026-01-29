/**
 * Feature Flags for UX Implementation
 * Toggle features on/off during development
 *
 * Usage:
 * ```typescript
 * import { isFeatureEnabled } from '@/config/features';
 *
 * if (isFeatureEnabled('NOISE_OVERLAY_TEXTURE')) {
 *   // Use new implementation
 * } else {
 *   // Use fallback implementation
 * }
 * ```
 */
export const FEATURES = {
  // Phase 1: Asset Preparation
  NOISE_OVERLAY_TEXTURE: false,        // ノイズテクスチャ（Phase 1.1）
  GLITCH_DYNAMIC_OFFSET: false,        // 動的グリッチ（Phase 1.2）

  // Phase 2: Anti-Vision Bleed
  ANTI_VISION_BLEED: false,            // Anti-Vision Bleed（Phase 2.1）

  // Phase 3: Death Animation
  DEATH_ANIMATION: false,              // Death Screen Animation（Phase 3）

  // Phase 4: Lens Zoom
  LENS_ZOOM_GESTURE: false,            // Lens Zoom（Phase 4.2）
  LENS_BUTTON_ANIMATION: false,        // Button Animation（Phase 4.3）

  // Phase 5: Notification Actions
  NOTIFICATION_ACTIONS: false,         // Interactive Notifications（Phase 5.1）

  // Phase 6: IdentityEngine v2
  IDENTITY_ENGINE_V2: false,           // IdentityEngine v2（Phase 6.1）
} as const;

export type FeatureFlag = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 * @param flag - Feature flag to check
 * @returns true if enabled, false otherwise
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURES[flag];
};
