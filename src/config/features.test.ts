/**
 * Feature Flags Test
 */
import { FEATURES, isFeatureEnabled, type FeatureFlag } from './features';

describe('Feature Flags', () => {
  it('should have all features defined', () => {
    expect(FEATURES).toBeDefined();
    expect(Object.keys(FEATURES).length).toBeGreaterThan(0);
  });

  it('should contain all Phase 1-7 features', () => {
    // Phase 1
    expect(FEATURES).toHaveProperty('NOISE_OVERLAY_TEXTURE');
    expect(FEATURES).toHaveProperty('GLITCH_DYNAMIC_OFFSET');

    // Phase 2
    expect(FEATURES).toHaveProperty('ANTI_VISION_BLEED');

    // Phase 3
    expect(FEATURES).toHaveProperty('DEATH_ANIMATION');

    // Phase 4
    expect(FEATURES).toHaveProperty('LENS_ZOOM_GESTURE');
    expect(FEATURES).toHaveProperty('LENS_BUTTON_ANIMATION');

    // Phase 5
    expect(FEATURES).toHaveProperty('NOTIFICATION_ACTIONS');

    // Phase 6
    expect(FEATURES).toHaveProperty('IDENTITY_ENGINE_V2');
  });

  it('should have Phase 1-6 features enabled', () => {
    // Phase 1-6 completed features should be enabled
    expect(FEATURES.NOISE_OVERLAY_TEXTURE).toBe(true);
    expect(FEATURES.GLITCH_DYNAMIC_OFFSET).toBe(true);
    expect(FEATURES.ANTI_VISION_BLEED).toBe(true);
    expect(FEATURES.DEATH_ANIMATION).toBe(true);
    expect(FEATURES.LENS_ZOOM_GESTURE).toBe(true);
    expect(FEATURES.NOTIFICATION_ACTIONS).toBe(true);
    expect(FEATURES.IDENTITY_ENGINE_V2).toBe(true);
  });

  it('should have incomplete features disabled', () => {
    // Phase 4.3 not yet implemented
    expect(FEATURES.LENS_BUTTON_ANIMATION).toBe(false);
  });

  describe('isFeatureEnabled', () => {
    it('should return correct status for all features', () => {
      // Phase 1-6 completed
      expect(isFeatureEnabled('NOISE_OVERLAY_TEXTURE')).toBe(true);
      expect(isFeatureEnabled('GLITCH_DYNAMIC_OFFSET')).toBe(true);
      expect(isFeatureEnabled('ANTI_VISION_BLEED')).toBe(true);
      expect(isFeatureEnabled('DEATH_ANIMATION')).toBe(true);
      expect(isFeatureEnabled('LENS_ZOOM_GESTURE')).toBe(true);
      expect(isFeatureEnabled('NOTIFICATION_ACTIONS')).toBe(true);
      expect(isFeatureEnabled('IDENTITY_ENGINE_V2')).toBe(true);

      // Incomplete features
      expect(isFeatureEnabled('LENS_BUTTON_ANIMATION')).toBe(false);
    });

    it('should be type-safe with FeatureFlag type', () => {
      // TypeScript compile-time check
      const validKey: FeatureFlag = 'NOISE_OVERLAY_TEXTURE';
      expect(isFeatureEnabled(validKey)).toBe(true);
    });
  });
});
