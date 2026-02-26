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
  NOISE_OVERLAY_TEXTURE: true,         // ノイズテクスチャ（Phase 1.1）✅
  GLITCH_DYNAMIC_OFFSET: true,         // 動的グリッチ（Phase 1.2）✅

  // Phase 2: Anti-Vision Bleed
  ANTI_VISION_BLEED: true,             // Anti-Vision Bleed（Phase 2）✅

  // Phase 3: Death Animation
  DEATH_ANIMATION: true,               // Death Screen Animation（Phase 3）✅

  // Phase 4: Lens Zoom
  LENS_ZOOM_GESTURE: true,             // Lens Zoom（Phase 4）✅
  LENS_BUTTON_ANIMATION: false,        // Button Animation（Phase 4.3）
  UNIFIED_LENS_VIEW: true,             // Unified Lens View with Opacity Transitions（Phase 4.4）✅

  // Phase 5: Notification Actions
  NOTIFICATION_ACTIONS: true,          // Interactive Notifications（Phase 5）✅

  // Phase 6: IdentityEngine v2
  IDENTITY_ENGINE_V2: true,            // IdentityEngine v2（Phase 6）✅

  // Phase 7: Visual Audio Domination (Quest Interrogation v4 Ultra)
  SUBLIMINAL_FLASH: true,              // Subliminal Flash Effect
  PERSISTENT_NOISE: true,              // Persistent Anti-Vision Noise

  // Insurance (Monetization)
  INSURANCE_ENABLED: true,             // Identity Insurance IAP system

  // Phase 4: Alternative Terror Effects
  DECAY_TEXT: true,                    // Typography decay effect（Phase 4.2）
  HEARTBEAT_FLASH: true,               // Heartbeat red flash overlay（Phase 4.3）

  // Phase 3: Effect Intensity Redesign (ih-fix-and-stress-ux-plan)
  EDGE_VIGNETTE: true,                 // Edge vignette darkening effect (Phase 3.6)
  SCANLINE_OVERLAY: true,              // Scanline overlay texture effect (Phase 3.7)
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
