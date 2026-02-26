/**
 * Subliminal Flash Effect
 * Displays anti-vision text in brief, random interval flashes
 *
 * Usage:
 * ```tsx
 * <SubliminalFlash
 *   text="YOUR ANTI-VISION"
 *   intervalRange={[30000, 120000]} // Flash every 30-120 seconds
 * />
 * ```
 *
 * Features:
 * - Random interval flashes (configurable range)
 * - Brief flash duration (50-100ms)
 * - Full screen overlay with red accent color
 * - Highest z-index (1000) - appears above all other effects
 * - Brutalist styling (Courier New, uppercase, red)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { isFeatureEnabled } from '../../config/features';
import { theme } from '../theme/theme';

interface SubliminalFlashProps {
  text: string;
  intervalRange: [number, number]; // [min, max] in milliseconds
}

export const SubliminalFlash = ({ text, intervalRange }: SubliminalFlashProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // M2: Destructure to primitives to avoid array reference causing infinite re-render
  const [minInterval, maxInterval] = intervalRange;

  useEffect(() => {
    // Feature flag check
    if (!isFeatureEnabled('SUBLIMINAL_FLASH')) {
      return;
    }

    let flashTimer: NodeJS.Timeout | null = null;
    let hideTimer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const scheduleNextFlash = () => {
      if (!isMounted) return;

      const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

      flashTimer = setTimeout(() => {
        if (!isMounted) return;

        // Show flash
        setIsVisible(true);

        // Hide after brief duration (50-100ms)
        const flashDuration = 50 + Math.floor(Math.random() * 51); // 50-100ms
        hideTimer = setTimeout(() => {
          if (!isMounted) return;
          setIsVisible(false);
          // Schedule next flash
          scheduleNextFlash();
        }, flashDuration);
      }, randomInterval);
    };

    scheduleNextFlash();

    return () => {
      isMounted = false;
      if (flashTimer) clearTimeout(flashTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [minInterval, maxInterval, text]);

  // Don't render if feature disabled or not visible
  if (!isFeatureEnabled('SUBLIMINAL_FLASH') || !isVisible) {
    return null;
  }

  return (
    <View
      testID="subliminal-flash"
      style={styles.container}
      pointerEvents="none"
    >
      <Text style={styles.flashText}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1000, // Highest z-index (above NoiseOverlay at 999)
  },
  flashText: {
    fontSize: 64,
    fontWeight: '900',
    textAlign: 'center',
    color: theme.colors.accent, // Red (#FF0000)
    textTransform: 'uppercase',
    letterSpacing: 8,
    lineHeight: 80,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    padding: 40,
  },
});
