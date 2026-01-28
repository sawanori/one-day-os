/**
 * One Day OS - GlitchText Component
 *
 * Displays text with visual glitch effects based on Identity Health (IH) value.
 * Lower IH values result in more intense glitch effects.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, TextStyle, StyleProp } from 'react-native';
import { theme } from '../theme/theme';

// Type definitions
type GlitchLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Variant = 'title' | 'heading' | 'body' | 'caption';

interface GlitchTextProps {
  ih: number;
  children?: React.ReactNode;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Determines the glitch level based on IH value
 */
const getGlitchLevel = (ih: number): GlitchLevel => {
  // Clamp IH to 0-100 range
  const clampedIH = Math.max(0, Math.min(100, ih));

  if (clampedIH >= 81) return 'NONE';
  if (clampedIH >= 61) return 'LOW';
  if (clampedIH >= 41) return 'MEDIUM';
  if (clampedIH >= 21) return 'HIGH';
  return 'CRITICAL';
};

/**
 * Gets the intensity value for a given glitch level
 */
const getIntensity = (level: GlitchLevel): number => {
  const intensityMap = {
    'NONE': theme.effects.glitch.none.intensity,
    'LOW': theme.effects.glitch.low.intensity,
    'MEDIUM': theme.effects.glitch.medium.intensity,
    'HIGH': theme.effects.glitch.high.intensity,
    'CRITICAL': theme.effects.glitch.critical.intensity,
  };
  return intensityMap[level];
};

/**
 * GlitchText Component
 *
 * Visual glitch effects based on Identity Health:
 * - IH 100-81: No glitch (NONE)
 * - IH 80-61: Low glitch (LOW)
 * - IH 60-41: Medium glitch (MEDIUM)
 * - IH 40-21: High glitch (HIGH)
 * - IH 20-0: Critical glitch (CRITICAL)
 */
export const GlitchText: React.FC<GlitchTextProps> = ({
  ih,
  children,
  variant = 'body',
  style,
  testID,
  accessibilityLabel,
}) => {
  // Animated values for glitch effects
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const glitchLevel = getGlitchLevel(ih);
  const intensity = getIntensity(glitchLevel);

  useEffect(() => {
    // Only animate if there's intensity
    if (intensity > 0) {
      // Create random glitch animation
      const createGlitchAnimation = () => {
        // Random displacement within intensity range
        const randomX = (Math.random() - 0.5) * 2 * intensity;
        const randomY = (Math.random() - 0.5) * 2 * intensity;
        const randomOpacity = 0.8 + Math.random() * 0.2; // Between 0.8 and 1.0

        return Animated.parallel([
          Animated.timing(translateX, {
            toValue: randomX,
            duration: theme.animations?.abrupt?.duration || 100,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: randomY,
            duration: theme.animations?.abrupt?.duration || 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: randomOpacity,
            duration: theme.animations?.abrupt?.duration || 100,
            useNativeDriver: true,
          }),
        ]);
      };

      // Create looping animation
      const loopingAnimation = Animated.loop(
        Animated.sequence([
          createGlitchAnimation(),
          Animated.delay(50),
          createGlitchAnimation(),
          Animated.delay(50),
        ])
      );

      loopingAnimation.start();

      return () => {
        loopingAnimation.stop();
      };
    } else {
      // Reset values for NONE level
      translateX.setValue(0);
      translateY.setValue(0);
      opacity.setValue(1);
    }
  }, [intensity, translateX, translateY, opacity]);

  // Get font size based on variant
  const getFontSize = (): number => {
    switch (variant) {
      case 'title':
        return theme.typography.fontSize.title;
      case 'heading':
        return theme.typography.fontSize.heading;
      case 'body':
        return theme.typography.fontSize.body;
      case 'caption':
        return theme.typography.fontSize.caption;
      default:
        return theme.typography.fontSize.body;
    }
  };

  // Determine text color based on glitch level
  const getTextColor = (): string => {
    if (glitchLevel === 'CRITICAL') {
      return theme.colors.accent; // Red accent for critical
    }
    return theme.colors.foreground; // White for normal
  };

  // Base style
  const baseStyle: TextStyle = {
    fontFamily: theme.typography.fontFamily,
    fontSize: getFontSize(),
    color: getTextColor(),
  };

  // Animated style with transform
  const animatedStyle = {
    opacity,
    transform: [
      { translateX },
      { translateY },
    ],
  };

  // Combine styles
  const combinedStyle = [baseStyle, animatedStyle, style];

  return (
    <Animated.Text
      style={combinedStyle}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Animated.Text>
  );
};
