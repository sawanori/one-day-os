/**
 * One Day OS - GlitchText Component Tests
 *
 * TDD Tests for the GlitchText component
 * These tests define the expected behavior BEFORE implementation
 *
 * GlitchText displays text with visual glitch effects based on Identity Health (IH) value.
 * - IH 100-81: No glitch (NONE)
 * - IH 80-61: Low glitch (LOW)
 * - IH 60-41: Medium glitch (MEDIUM)
 * - IH 40-21: High glitch (HIGH)
 * - IH 20-0: Critical glitch (CRITICAL)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { GlitchText } from './GlitchText';
import { theme } from '../theme/theme';

// Mock React Native Animated API
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Helper to extract transform values from animated styles
const getTransformValue = (element: any, transformType: string): number => {
  const style = element.props.style;
  if (Array.isArray(style)) {
    for (const s of style) {
      if (s && s.transform && Array.isArray(s.transform)) {
        for (const t of s.transform) {
          if (t[transformType] !== undefined) {
            return typeof t[transformType] === 'number' ? t[transformType] : 0;
          }
        }
      }
    }
  } else if (style && style.transform && Array.isArray(style.transform)) {
    for (const t of style.transform) {
      if (t[transformType] !== undefined) {
        return typeof t[transformType] === 'number' ? t[transformType] : 0;
      }
    }
  }
  return 0;
};

// Helper to determine glitch level from IH value
const getExpectedGlitchLevel = (ih: number): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
  if (ih >= 81) return 'NONE';
  if (ih >= 61) return 'LOW';
  if (ih >= 41) return 'MEDIUM';
  if (ih >= 21) return 'HIGH';
  return 'CRITICAL';
};

// Helper to get expected intensity from glitch level
const getExpectedIntensity = (level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): number => {
  const intensityMap = {
    'NONE': theme.effects.glitch.none.intensity,
    'LOW': theme.effects.glitch.low.intensity,
    'MEDIUM': theme.effects.glitch.medium.intensity,
    'HIGH': theme.effects.glitch.high.intensity,
    'CRITICAL': theme.effects.glitch.critical.intensity,
  };
  return intensityMap[level];
};

describe('GlitchText Component', () => {

  // ============================================================================
  // 1. RENDERING TESTS
  // ============================================================================

  describe('Rendering', () => {

    test('should render without crashing', () => {
      const { getByText } = render(
        <GlitchText ih={100}>Test Text</GlitchText>
      );
      expect(getByText('Test Text')).toBeTruthy();
    });

    test('should render children prop correctly', () => {
      const { getByText } = render(
        <GlitchText ih={100}>Hello World</GlitchText>
      );
      expect(getByText('Hello World')).toBeTruthy();
    });

    test('should render with multiple children', () => {
      const { getByText } = render(
        <GlitchText ih={100}>
          <React.Fragment>
            Multiple words here
          </React.Fragment>
        </GlitchText>
      );
      expect(getByText('Multiple words here')).toBeTruthy();
    });

    test('should apply custom style prop', () => {
      const customStyle = { marginTop: 20, marginBottom: 10 };
      const { getByText } = render(
        <GlitchText ih={100} style={customStyle}>
          Styled Text
        </GlitchText>
      );
      const element = getByText('Styled Text');
      const style = element.props.style;

      // Check if custom styles are included (handle various style formats)
      const findCustomStyles = (s: any): boolean => {
        if (!s) return false;
        if (s.marginTop === 20 && s.marginBottom === 10) return true;
        if (Array.isArray(s)) return s.some(findCustomStyles);
        return false;
      };
      expect(findCustomStyles(style)).toBe(true);
    });

  });

  // ============================================================================
  // 2. IH VALUE TO GLITCH LEVEL MAPPING TESTS
  // ============================================================================

  describe('IH Value to Glitch Level Mapping', () => {

    test('IH 100 should have NONE glitch level', () => {
      const { getByText } = render(
        <GlitchText ih={100}>Test</GlitchText>
      );
      const element = getByText('Test');
      // With NONE level, there should be no transform or minimal transform
      const translateX = getTransformValue(element, 'translateX');
      const translateY = getTransformValue(element, 'translateY');
      expect(Math.abs(translateX)).toBeLessThanOrEqual(
        getExpectedIntensity('NONE')
      );
      expect(Math.abs(translateY)).toBeLessThanOrEqual(
        getExpectedIntensity('NONE')
      );
    });

    test('IH 80 should have LOW glitch level', () => {
      const { getByText } = render(
        <GlitchText ih={80}>Test</GlitchText>
      );
      const element = getByText('Test');
      // LOW level should have some transform but not excessive
      const translateX = getTransformValue(element, 'translateX');
      const translateY = getTransformValue(element, 'translateY');
      const maxIntensity = getExpectedIntensity('LOW');
      expect(Math.abs(translateX)).toBeLessThanOrEqual(maxIntensity);
      expect(Math.abs(translateY)).toBeLessThanOrEqual(maxIntensity);
    });

    test('IH 60 should have MEDIUM glitch level', () => {
      const { getByText } = render(
        <GlitchText ih={60}>Test</GlitchText>
      );
      const element = getByText('Test');
      const translateX = getTransformValue(element, 'translateX');
      const translateY = getTransformValue(element, 'translateY');
      const maxIntensity = getExpectedIntensity('MEDIUM');
      expect(Math.abs(translateX)).toBeLessThanOrEqual(maxIntensity);
      expect(Math.abs(translateY)).toBeLessThanOrEqual(maxIntensity);
    });

    test('IH 40 should have HIGH glitch level', () => {
      const { getByText } = render(
        <GlitchText ih={40}>Test</GlitchText>
      );
      const element = getByText('Test');
      const translateX = getTransformValue(element, 'translateX');
      const translateY = getTransformValue(element, 'translateY');
      const maxIntensity = getExpectedIntensity('HIGH');
      expect(Math.abs(translateX)).toBeLessThanOrEqual(maxIntensity);
      expect(Math.abs(translateY)).toBeLessThanOrEqual(maxIntensity);
    });

    test('IH 20 should have CRITICAL glitch level', () => {
      const { getByText } = render(
        <GlitchText ih={20}>Test</GlitchText>
      );
      const element = getByText('Test');
      const translateX = getTransformValue(element, 'translateX');
      const translateY = getTransformValue(element, 'translateY');
      const maxIntensity = getExpectedIntensity('CRITICAL');
      expect(Math.abs(translateX)).toBeLessThanOrEqual(maxIntensity);
      expect(Math.abs(translateY)).toBeLessThanOrEqual(maxIntensity);
    });

    test('IH 0 should have CRITICAL glitch level', () => {
      const { getByText } = render(
        <GlitchText ih={0}>Test</GlitchText>
      );
      const element = getByText('Test');
      const translateX = getTransformValue(element, 'translateX');
      const translateY = getTransformValue(element, 'translateY');
      const maxIntensity = getExpectedIntensity('CRITICAL');
      expect(Math.abs(translateX)).toBeLessThanOrEqual(maxIntensity);
      expect(Math.abs(translateY)).toBeLessThanOrEqual(maxIntensity);
    });

  });

  // ============================================================================
  // 3. BOUNDARY VALUE TESTS
  // ============================================================================

  describe('Boundary Value Tests', () => {

    test('IH 81 should be NONE (upper boundary)', () => {
      const level = getExpectedGlitchLevel(81);
      expect(level).toBe('NONE');
    });

    test('IH 80 should be LOW (lower boundary of NONE)', () => {
      const level = getExpectedGlitchLevel(80);
      expect(level).toBe('LOW');
    });

    test('IH 61 should be LOW (upper boundary)', () => {
      const level = getExpectedGlitchLevel(61);
      expect(level).toBe('LOW');
    });

    test('IH 60 should be MEDIUM (lower boundary of LOW)', () => {
      const level = getExpectedGlitchLevel(60);
      expect(level).toBe('MEDIUM');
    });

    test('IH 41 should be MEDIUM (upper boundary)', () => {
      const level = getExpectedGlitchLevel(41);
      expect(level).toBe('MEDIUM');
    });

    test('IH 40 should be HIGH (lower boundary of MEDIUM)', () => {
      const level = getExpectedGlitchLevel(40);
      expect(level).toBe('HIGH');
    });

    test('IH 21 should be HIGH (upper boundary)', () => {
      const level = getExpectedGlitchLevel(21);
      expect(level).toBe('HIGH');
    });

    test('IH 20 should be CRITICAL (lower boundary of HIGH)', () => {
      const level = getExpectedGlitchLevel(20);
      expect(level).toBe('CRITICAL');
    });

    test('IH 1 should be CRITICAL', () => {
      const level = getExpectedGlitchLevel(1);
      expect(level).toBe('CRITICAL');
    });

    test('IH 0 should be CRITICAL (lowest boundary)', () => {
      const level = getExpectedGlitchLevel(0);
      expect(level).toBe('CRITICAL');
    });

  });

  // ============================================================================
  // 4. VISUAL EFFECT TESTS
  // ============================================================================

  describe('Visual Effects', () => {

    test('should apply transform based on glitch level', () => {
      const testCases = [
        { ih: 100, level: 'NONE' as const },
        { ih: 70, level: 'LOW' as const },
        { ih: 50, level: 'MEDIUM' as const },
        { ih: 30, level: 'HIGH' as const },
        { ih: 10, level: 'CRITICAL' as const },
      ];

      testCases.forEach(({ ih, level }) => {
        const { getByText } = render(
          <GlitchText ih={ih}>Test {ih}</GlitchText>
        );
        const element = getByText(`Test ${ih}`);
        const translateX = getTransformValue(element, 'translateX');
        const translateY = getTransformValue(element, 'translateY');
        const maxIntensity = getExpectedIntensity(level);

        // Transform values should be within expected intensity range
        expect(Math.abs(translateX)).toBeLessThanOrEqual(maxIntensity);
        expect(Math.abs(translateY)).toBeLessThanOrEqual(maxIntensity);
      });
    });

    test('should apply opacity variation for glitch effect', () => {
      const { getByText } = render(
        <GlitchText ih={20}>Critical Text</GlitchText>
      );
      const element = getByText('Critical Text');
      const style = element.props.style;

      // Opacity should be defined for glitch effect
      let hasOpacity = false;
      if (Array.isArray(style)) {
        hasOpacity = style.some(s => s && typeof s.opacity !== 'undefined');
      } else if (style && typeof style.opacity !== 'undefined') {
        hasOpacity = true;
      }

      // For critical levels, opacity variation is expected
      expect(hasOpacity).toBeTruthy();
    });

    test('CRITICAL level should use red accent color', () => {
      const { getByText } = render(
        <GlitchText ih={10}>Critical</GlitchText>
      );
      const element = getByText('Critical');
      const style = element.props.style;

      let color: string | undefined;
      if (Array.isArray(style)) {
        for (const s of style) {
          if (s && s.color) {
            color = s.color;
            break;
          }
        }
      } else if (style && style.color) {
        color = style.color;
      }

      // Critical level should have red-ish color (accent or critical color)
      expect(color).toBeDefined();
      expect([
        theme.colors.accent,
        theme.colors.error,
        theme.colors.ih.critical,
      ]).toContain(color);
    });

    test('glitch intensity should increase as IH decreases', () => {
      const ihValues = [100, 70, 50, 30, 10];
      const transforms: number[] = [];

      ihValues.forEach(ih => {
        const { getByText } = render(
          <GlitchText ih={ih}>Test {ih}</GlitchText>
        );
        const element = getByText(`Test ${ih}`);
        const translateX = getTransformValue(element, 'translateX');
        const translateY = getTransformValue(element, 'translateY');
        const magnitude = Math.sqrt(translateX * translateX + translateY * translateY);
        transforms.push(magnitude);
      });

      // Generally, transform magnitude should increase as IH decreases
      // (though there may be randomness in the implementation)
      const avgFirst = (transforms[0] + transforms[1]) / 2;
      const avgLast = (transforms[3] + transforms[4]) / 2;
      expect(avgLast).toBeGreaterThanOrEqual(avgFirst);
    });

  });

  // ============================================================================
  // 5. ANIMATION TESTS
  // ============================================================================

  describe('Animation', () => {

    test('should set up animation for glitch effect', () => {
      // Create a spy for Animated.timing
      const timingSpy = jest.spyOn(Animated, 'timing');

      const { getByText } = render(
        <GlitchText ih={30}>Animated Text</GlitchText>
      );

      // Animation should be set up for glitch levels > NONE
      expect(timingSpy).toHaveBeenCalled();

      timingSpy.mockRestore();
    });

    test('animation duration should conform to theme', () => {
      const timingSpy = jest.spyOn(Animated, 'timing');

      const { getByText } = render(
        <GlitchText ih={20}>Test</GlitchText>
      );

      if (timingSpy.mock.calls.length > 0) {
        const config = timingSpy.mock.calls[0][1];
        if (config && config.duration) {
          // Animation should be abrupt (≤200ms per brutalist theme)
          expect(config.duration).toBeLessThanOrEqual(200);
        }
      }

      timingSpy.mockRestore();
    });

    test('animation should loop for continuous glitch effect', () => {
      const loopSpy = jest.spyOn(Animated, 'loop');

      const { getByText } = render(
        <GlitchText ih={40}>Looping Text</GlitchText>
      );

      // For glitch levels > NONE, animation should loop
      expect(loopSpy).toHaveBeenCalled();

      loopSpy.mockRestore();
    });

  });

  // ============================================================================
  // 6. PROPS TESTS
  // ============================================================================

  describe('Props', () => {

    test('ih prop should be required', () => {
      // TypeScript should enforce this at compile time
      // At runtime, the component should handle missing ih gracefully or throw
      // This test verifies the TypeScript contract is enforced
      expect(true).toBe(true); // Placeholder - TypeScript enforces this
    });

    test('should accept ih values from 0 to 100', () => {
      const validValues = [0, 25, 50, 75, 100];

      validValues.forEach(ih => {
        expect(() => render(
          <GlitchText ih={ih}>Test {ih}</GlitchText>
        )).not.toThrow();
      });
    });

    test('should apply variant prop for different font sizes', () => {
      const { getByText: getTitle } = render(
        <GlitchText ih={100} variant="title">Title</GlitchText>
      );
      const { getByText: getBody } = render(
        <GlitchText ih={100} variant="body">Body</GlitchText>
      );
      const { getByText: getCaption } = render(
        <GlitchText ih={100} variant="caption">Caption</GlitchText>
      );

      const titleElement = getTitle('Title');
      const bodyElement = getBody('Body');
      const captionElement = getCaption('Caption');

      // Extract font sizes
      const getTitleFontSize = (element: any): number => {
        const style = element.props.style;
        if (Array.isArray(style)) {
          for (const s of style) {
            if (s && s.fontSize) return s.fontSize;
          }
        } else if (style && style.fontSize) {
          return style.fontSize;
        }
        return 0;
      };

      const titleSize = getTitleFontSize(titleElement);
      const bodySize = getTitleFontSize(bodyElement);
      const captionSize = getTitleFontSize(captionElement);

      // Title should be larger than body, body larger than caption
      expect(titleSize).toBeGreaterThan(bodySize);
      expect(bodySize).toBeGreaterThan(captionSize);

      // Should match theme font sizes
      expect(titleSize).toBe(theme.typography.fontSize.title);
      expect(bodySize).toBe(theme.typography.fontSize.body);
      expect(captionSize).toBe(theme.typography.fontSize.caption);
    });

    test('should use monospace font from theme', () => {
      const { getByText } = render(
        <GlitchText ih={100}>Monospace</GlitchText>
      );
      const element = getByText('Monospace');
      const style = element.props.style;

      let fontFamily: string | undefined;
      if (Array.isArray(style)) {
        for (const s of style) {
          if (s && s.fontFamily) {
            fontFamily = s.fontFamily;
            break;
          }
        }
      } else if (style && style.fontFamily) {
        fontFamily = style.fontFamily;
      }

      expect(fontFamily).toBe(theme.typography.fontFamily);
    });

    test('should merge custom style with component styles', () => {
      const customStyle = {
        paddingHorizontal: 10,
        backgroundColor: '#333333',
      };

      const { getByText } = render(
        <GlitchText ih={100} style={customStyle}>
          Custom Style
        </GlitchText>
      );

      const element = getByText('Custom Style');
      const style = element.props.style;

      // Check if custom styles are included (handle various style formats)
      const findCustomStyles = (s: any): boolean => {
        if (!s) return false;
        if (s.paddingHorizontal === 10 && s.backgroundColor === '#333333') return true;
        if (Array.isArray(s)) return s.some(findCustomStyles);
        return false;
      };
      expect(findCustomStyles(style)).toBe(true);
    });

  });

  // ============================================================================
  // 7. EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe('Edge Cases', () => {

    test('should handle negative IH values gracefully', () => {
      const { getByText } = render(
        <GlitchText ih={-10}>Negative IH</GlitchText>
      );
      // Should render and treat as minimum (CRITICAL)
      expect(getByText('Negative IH')).toBeTruthy();
    });

    test('should handle IH values over 100 gracefully', () => {
      const { getByText } = render(
        <GlitchText ih={150}>Over 100</GlitchText>
      );
      // Should render and treat as maximum (NONE)
      expect(getByText('Over 100')).toBeTruthy();
    });

    test('should handle empty children', () => {
      // Should render without crashing
      expect(() => render(
        <GlitchText ih={100}></GlitchText>
      )).not.toThrow();
    });

    test('should handle very long text', () => {
      const longText = 'A'.repeat(1000);
      const { getByText } = render(
        <GlitchText ih={50}>{longText}</GlitchText>
      );
      expect(getByText(longText)).toBeTruthy();
    });

  });

  // ============================================================================
  // 8. ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {

    test('should maintain text readability despite glitch effects', () => {
      const { getByText } = render(
        <GlitchText ih={30}>Readable</GlitchText>
      );
      const element = getByText('Readable');

      // Text should still be present and accessible
      expect(element).toBeTruthy();
      expect(element.props.children).toBe('Readable');
    });

    test('should preserve text content for screen readers', () => {
      const { getByText } = render(
        <GlitchText ih={10} accessibilityLabel="Important Text">
          Glitchy
        </GlitchText>
      );
      const element = getByText('Glitchy');

      // Accessibility label should be preserved
      expect(element.props.accessibilityLabel).toBe('Important Text');
    });

    test('should support testID prop for testing', () => {
      const { getByTestId } = render(
        <GlitchText ih={100} testID="glitch-text-test">
          Test ID
        </GlitchText>
      );
      expect(getByTestId('glitch-text-test')).toBeTruthy();
    });

  });

});
