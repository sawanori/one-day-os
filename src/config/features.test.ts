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

  it('should initialize all features as false', () => {
    Object.values(FEATURES).forEach(value => {
      expect(value).toBe(false);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return false for all features initially', () => {
      const featureKeys = Object.keys(FEATURES) as FeatureFlag[];

      featureKeys.forEach(key => {
        expect(isFeatureEnabled(key)).toBe(false);
      });
    });

    it('should be type-safe with FeatureFlag type', () => {
      // TypeScript compile-time check
      const validKey: FeatureFlag = 'NOISE_OVERLAY_TEXTURE';
      expect(isFeatureEnabled(validKey)).toBe(false);

      // @ts-expect-error - Invalid key should not compile
      // isFeatureEnabled('INVALID_KEY');
    });

    it('should work with all valid feature flags', () => {
      expect(isFeatureEnabled('NOISE_OVERLAY_TEXTURE')).toBe(false);
      expect(isFeatureEnabled('GLITCH_DYNAMIC_OFFSET')).toBe(false);
      expect(isFeatureEnabled('ANTI_VISION_BLEED')).toBe(false);
      expect(isFeatureEnabled('DEATH_ANIMATION')).toBe(false);
      expect(isFeatureEnabled('LENS_ZOOM_GESTURE')).toBe(false);
      expect(isFeatureEnabled('LENS_BUTTON_ANIMATION')).toBe(false);
      expect(isFeatureEnabled('NOTIFICATION_ACTIONS')).toBe(false);
      expect(isFeatureEnabled('IDENTITY_ENGINE_V2')).toBe(false);
    });
  });
});
