/**
 * Persistent Noise Effect
 * Always-visible but subtle noise overlay that never fully disappears
 *
 * Usage:
 * ```tsx
 * <PersistentNoise text="YOUR ANTI-VISION" />
 * ```
 *
 * Features:
 * - Always visible (never disappears completely)
 * - Very low opacity (0.15 / 15%)
 * - Random position shifts every 10-30 seconds
 * - Low z-index (400) - appears behind other effects
 * - Brutalist styling (Courier New, uppercase, red)
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { isFeatureEnabled } from '../../config/features';
import { theme } from '../theme/theme';

interface PersistentNoiseProps {
  text: string;
}

export const PersistentNoise = ({ text }: PersistentNoiseProps) => {
  const [position, setPosition] = useState({ top: 10, left: 10 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Feature flag check
    if (!isFeatureEnabled('PERSISTENT_NOISE')) {
      return;
    }

    // Recursively schedule random position shifts (truly random 10-30 second intervals)
    const scheduleNext = () => {
      const delay = 10000 + Math.floor(Math.random() * 20000); // 10-30 seconds
      timeoutRef.current = setTimeout(() => {
        const randomTop = Math.floor(Math.random() * 80) + 10; // 10-90%
        const randomLeft = Math.floor(Math.random() * 80) + 10; // 10-90%
        setPosition({ top: randomTop, left: randomLeft });
        scheduleNext(); // Recursively schedule next with new random delay
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Don't render if feature disabled
  if (!isFeatureEnabled('PERSISTENT_NOISE')) {
    return null;
  }

  return (
    <View
      testID="persistent-noise"
      style={styles.container}
      pointerEvents="none"
    >
      <View
        style={[
          styles.textContainer,
          {
            top: `${position.top}%`,
            left: `${position.left}%`,
          },
        ]}
      >
        <Text style={styles.noiseText}>
          {text}
        </Text>
      </View>
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
    opacity: 0.15, // Very low opacity (0.1-0.2 range)
    zIndex: 400, // Below AntiVisionBleed(500)
  },
  textContainer: {
    position: 'absolute',
    maxWidth: '80%',
  },
  noiseText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.colors.accent, // Red (#FF0000)
    textTransform: 'uppercase',
    letterSpacing: 3,
    lineHeight: 32,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
});
