/**
 * One Day OS - Brutalist Design System Tests
 *
 * TDD Tests for the Brutalist Design System
 * These tests define the expected structure and behavior BEFORE implementation
 *
 * Design Direction: BRUTALIST
 * - Raw, concrete-like aesthetic
 * - No decoration
 * - Strong message delivery
 * - Monochrome palette (black/white/gray)
 * - Monospace fonts
 * - No rounded corners, no soft gradients
 * - High contrast, stark visuals
 */

import { theme } from './theme';

// Helper function to calculate contrast ratio (WCAG)
function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map(c => {
      const val = c / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Helper to validate HEX color format
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

// Helper to check if color is dark (luminance < 0.5)
function isDarkColor(hex: string): boolean {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

// Helper to check if color is light (luminance > 0.5)
function isLightColor(hex: string): boolean {
  return !isDarkColor(hex);
}

// Helper to check if color is in red spectrum (for brutalist accent)
function isRedSpectrum(hex: string): boolean {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  // Red should be dominant
  return r > g && r > b && r > 150;
}

describe('Brutalist Design System - Theme', () => {

  // ============================================================================
  // 1. COLOR PALETTE TESTS
  // ============================================================================

  describe('Color Palette', () => {

    test('should define all required color properties', () => {
      expect(theme.colors).toBeDefined();
      expect(theme.colors.background).toBeDefined();
      expect(theme.colors.foreground).toBeDefined();
      expect(theme.colors.accent).toBeDefined();
      expect(theme.colors.error).toBeDefined();
      expect(theme.colors.warning).toBeDefined();
    });

    test('all colors should be valid HEX format', () => {
      Object.values(theme.colors).forEach(color => {
        expect(isValidHexColor(color)).toBe(true);
      });
    });

    test('background should be black or extremely dark', () => {
      expect(isValidHexColor(theme.colors.background)).toBe(true);
      expect(isDarkColor(theme.colors.background)).toBe(true);

      // Should be very dark (luminance < 0.2)
      const rgb = parseInt(theme.colors.background.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(luminance).toBeLessThan(0.2);
    });

    test('foreground should be white or extremely light', () => {
      expect(isValidHexColor(theme.colors.foreground)).toBe(true);
      expect(isLightColor(theme.colors.foreground)).toBe(true);

      // Should be very light (luminance > 0.8)
      const rgb = parseInt(theme.colors.foreground.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(luminance).toBeGreaterThan(0.8);
    });

    test('accent color should be in red spectrum (tension/warning)', () => {
      expect(isValidHexColor(theme.colors.accent)).toBe(true);
      expect(isRedSpectrum(theme.colors.accent)).toBe(true);
    });

    test('error color should be defined and visible', () => {
      expect(isValidHexColor(theme.colors.error)).toBe(true);
      // Error should be distinguishable (typically red)
      expect(isRedSpectrum(theme.colors.error)).toBe(true);
    });

    test('warning color should be defined', () => {
      expect(isValidHexColor(theme.colors.warning)).toBe(true);
    });

  });

  // ============================================================================
  // 2. TYPOGRAPHY TESTS
  // ============================================================================

  describe('Typography', () => {

    test('should define typography object', () => {
      expect(theme.typography).toBeDefined();
    });

    test('should use monospace font family', () => {
      expect(theme.typography.fontFamily).toBeDefined();
      const fontFamily = theme.typography.fontFamily.toLowerCase();

      // Check for common monospace fonts
      const hasMonospace =
        fontFamily.includes('mono') ||
        fontFamily.includes('courier') ||
        fontFamily.includes('consolas') ||
        fontFamily.includes('menlo') ||
        fontFamily.includes('source code') ||
        fontFamily.includes('fira code') ||
        fontFamily.includes('jetbrains');

      expect(hasMonospace).toBe(true);
    });

    test('should define hierarchical font sizes', () => {
      expect(theme.typography.fontSize).toBeDefined();
      expect(theme.typography.fontSize.title).toBeDefined();
      expect(theme.typography.fontSize.heading).toBeDefined();
      expect(theme.typography.fontSize.body).toBeDefined();
      expect(theme.typography.fontSize.caption).toBeDefined();

      // Font sizes should be numbers (in pixels)
      expect(typeof theme.typography.fontSize.title).toBe('number');
      expect(typeof theme.typography.fontSize.heading).toBe('number');
      expect(typeof theme.typography.fontSize.body).toBe('number');
      expect(typeof theme.typography.fontSize.caption).toBe('number');
    });

    test('font sizes should follow hierarchical order', () => {
      expect(theme.typography.fontSize.title).toBeGreaterThan(
        theme.typography.fontSize.heading
      );
      expect(theme.typography.fontSize.heading).toBeGreaterThan(
        theme.typography.fontSize.body
      );
      expect(theme.typography.fontSize.body).toBeGreaterThan(
        theme.typography.fontSize.caption
      );
    });

    test('should define line height for readability', () => {
      expect(theme.typography.lineHeight).toBeDefined();
      expect(typeof theme.typography.lineHeight.tight).toBe('number');
      expect(typeof theme.typography.lineHeight.normal).toBe('number');
      expect(typeof theme.typography.lineHeight.relaxed).toBe('number');

      // Line heights should be reasonable (1.0 - 2.0)
      expect(theme.typography.lineHeight.tight).toBeGreaterThanOrEqual(1.0);
      expect(theme.typography.lineHeight.tight).toBeLessThanOrEqual(2.0);
      expect(theme.typography.lineHeight.normal).toBeGreaterThanOrEqual(1.0);
      expect(theme.typography.lineHeight.normal).toBeLessThanOrEqual(2.0);
      expect(theme.typography.lineHeight.relaxed).toBeGreaterThanOrEqual(1.0);
      expect(theme.typography.lineHeight.relaxed).toBeLessThanOrEqual(2.0);
    });

    test('should define font weights', () => {
      expect(theme.typography.fontWeight).toBeDefined();
      expect(theme.typography.fontWeight.regular).toBeDefined();
      expect(theme.typography.fontWeight.bold).toBeDefined();

      // Font weights should be valid CSS values (strings for React Native)
      expect(['300', '400', '500', '600', '700', '800', '900']).toContain(
        theme.typography.fontWeight.regular
      );
      expect(['300', '400', '500', '600', '700', '800', '900']).toContain(
        theme.typography.fontWeight.bold
      );
    });

  });

  // ============================================================================
  // 3. SPACING TESTS
  // ============================================================================

  describe('Spacing', () => {

    test('should define spacing scale', () => {
      expect(theme.spacing).toBeDefined();
      expect(theme.spacing.xs).toBeDefined();
      expect(theme.spacing.sm).toBeDefined();
      expect(theme.spacing.md).toBeDefined();
      expect(theme.spacing.lg).toBeDefined();
      expect(theme.spacing.xl).toBeDefined();
    });

    test('all spacing values should be numbers', () => {
      expect(typeof theme.spacing.xs).toBe('number');
      expect(typeof theme.spacing.sm).toBe('number');
      expect(typeof theme.spacing.md).toBe('number');
      expect(typeof theme.spacing.lg).toBe('number');
      expect(typeof theme.spacing.xl).toBe('number');
    });

    test('spacing should follow consistent scale', () => {
      expect(theme.spacing.sm).toBeGreaterThan(theme.spacing.xs);
      expect(theme.spacing.md).toBeGreaterThan(theme.spacing.sm);
      expect(theme.spacing.lg).toBeGreaterThan(theme.spacing.md);
      expect(theme.spacing.xl).toBeGreaterThan(theme.spacing.lg);
    });

    test('spacing should be based on consistent increment (4px or 8px base)', () => {
      const values = [
        theme.spacing.xs,
        theme.spacing.sm,
        theme.spacing.md,
        theme.spacing.lg,
        theme.spacing.xl,
      ];

      // Check if all values are multiples of 4
      const allMultiplesOf4 = values.every(val => val % 4 === 0);
      expect(allMultiplesOf4).toBe(true);
    });

  });

  // ============================================================================
  // 4. GLITCH EFFECTS TESTS (Brutalist UI Feature)
  // ============================================================================

  describe('Glitch Effects', () => {

    test('should define glitch levels', () => {
      expect(theme.effects).toBeDefined();
      expect(theme.effects.glitch).toBeDefined();
    });

    test('should define all glitch intensity levels', () => {
      expect(theme.effects.glitch.none).toBeDefined();
      expect(theme.effects.glitch.low).toBeDefined();
      expect(theme.effects.glitch.medium).toBeDefined();
      expect(theme.effects.glitch.high).toBeDefined();
      expect(theme.effects.glitch.critical).toBeDefined();
    });

    test('each glitch level should have transformation values', () => {
      const levels = ['none', 'low', 'medium', 'high', 'critical'] as const;

      levels.forEach(level => {
        const glitchLevel = theme.effects.glitch[level];
        expect(glitchLevel).toBeDefined();

        // Each level should define visual distortion properties
        if (level !== 'none') {
          expect(glitchLevel.intensity).toBeDefined();
          expect(typeof glitchLevel.intensity).toBe('number');
        }
      });
    });

    test('glitch intensity should increase with level', () => {
      expect(theme.effects.glitch.none.intensity).toBe(0);
      expect(theme.effects.glitch.low.intensity).toBeGreaterThan(0);
      expect(theme.effects.glitch.medium.intensity).toBeGreaterThan(
        theme.effects.glitch.low.intensity
      );
      expect(theme.effects.glitch.high.intensity).toBeGreaterThan(
        theme.effects.glitch.medium.intensity
      );
      expect(theme.effects.glitch.critical.intensity).toBeGreaterThan(
        theme.effects.glitch.high.intensity
      );
    });

  });

  // ============================================================================
  // 5. CONTRAST TESTS (WCAG Accessibility)
  // ============================================================================

  describe('Contrast & Accessibility', () => {

    test('background/foreground contrast should meet WCAG AA (4.5:1)', () => {
      const ratio = getContrastRatio(
        theme.colors.background,
        theme.colors.foreground
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    test('background/accent contrast should be sufficient', () => {
      const ratio = getContrastRatio(
        theme.colors.background,
        theme.colors.accent
      );
      // Accent should be visible (at least 3:1 for large text)
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    test('background/error contrast should be sufficient', () => {
      const ratio = getContrastRatio(
        theme.colors.background,
        theme.colors.error
      );
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    test('foreground text should have strong contrast', () => {
      const ratio = getContrastRatio(
        theme.colors.background,
        theme.colors.foreground
      );
      // Should meet AAA standard for body text (7:1)
      expect(ratio).toBeGreaterThanOrEqual(7.0);
    });

  });

  // ============================================================================
  // 6. BRUTALIST DESIGN PRINCIPLES TESTS
  // ============================================================================

  describe('Brutalist Design Principles', () => {

    test('should have zero or minimal border radius', () => {
      expect(theme.borderRadius).toBeDefined();
      expect(theme.borderRadius.none).toBe(0);

      // If there are other radius values, they should be very small
      if (theme.borderRadius.sm !== undefined) {
        expect(theme.borderRadius.sm).toBeLessThanOrEqual(4);
      }
    });

    test('should have no or minimal shadows', () => {
      expect(theme.shadows).toBeDefined();
      expect(theme.shadows.none).toBeDefined();
      expect(theme.shadows.none).toBe('none');

      // If shadows exist, they should be stark and minimal
      if (theme.shadows.harsh !== undefined) {
        expect(typeof theme.shadows.harsh).toBe('string');
        // Harsh shadows should have no blur or minimal blur
      }
    });

    test('should avoid decorative elements', () => {
      // No gradients should be defined (brutalist uses solid colors)
      if (theme.gradients !== undefined) {
        expect(theme.gradients).toEqual({});
      }

      // No animations should be smooth/decorative
      if (theme.animations !== undefined) {
        // Brutalist animations should be instant or abrupt
        Object.values(theme.animations).forEach((anim: any) => {
          if (anim.duration !== undefined) {
            expect(anim.duration).toBeLessThanOrEqual(200); // Max 200ms
          }
        });
      }
    });

    test('color palette should be monochromatic or near-monochromatic', () => {
      // Check that most colors are grayscale (except accent/error)
      const checkGrayscale = (hex: string): boolean => {
        const rgb = parseInt(hex.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        // Grayscale: R ≈ G ≈ B (within 10 units)
        return Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10;
      };

      expect(checkGrayscale(theme.colors.background)).toBe(true);
      expect(checkGrayscale(theme.colors.foreground)).toBe(true);
      // accent and error can be colored (red for tension)
    });

  });

  // ============================================================================
  // 7. THEME STRUCTURE TESTS
  // ============================================================================

  describe('Theme Structure', () => {

    test('should export theme object', () => {
      expect(theme).toBeDefined();
      expect(typeof theme).toBe('object');
    });

    test('should have all required top-level properties', () => {
      expect(theme.colors).toBeDefined();
      expect(theme.typography).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.effects).toBeDefined();
      expect(theme.borderRadius).toBeDefined();
      expect(theme.shadows).toBeDefined();
    });

    test('theme should be immutable (frozen)', () => {
      // Theme should be frozen to prevent accidental modifications
      expect(Object.isFrozen(theme)).toBe(true);
    });

  });

  // ============================================================================
  // 8. ONE DAY OS SPECIFIC TESTS
  // ============================================================================

  describe('One Day OS Specific Features', () => {

    test('should define Identity Health (IH) color states', () => {
      expect(theme.colors.ih).toBeDefined();
      expect(theme.colors.ih.high).toBeDefined();    // IH > 80
      expect(theme.colors.ih.medium).toBeDefined();  // IH 50-80
      expect(theme.colors.ih.low).toBeDefined();     // IH 20-50
      expect(theme.colors.ih.critical).toBeDefined(); // IH < 20
    });

    test('IH colors should increase in urgency/visibility', () => {
      // All IH colors should be valid hex
      expect(isValidHexColor(theme.colors.ih.high)).toBe(true);
      expect(isValidHexColor(theme.colors.ih.medium)).toBe(true);
      expect(isValidHexColor(theme.colors.ih.low)).toBe(true);
      expect(isValidHexColor(theme.colors.ih.critical)).toBe(true);

      // Critical should be most alarming (red spectrum)
      expect(isRedSpectrum(theme.colors.ih.critical)).toBe(true);
    });

    test('should define phase-specific styling', () => {
      expect(theme.phases).toBeDefined();
      expect(theme.phases.morning).toBeDefined();
      expect(theme.phases.core).toBeDefined();
      expect(theme.phases.evening).toBeDefined();
    });

  });

});
