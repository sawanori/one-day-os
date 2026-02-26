/**
 * Edge Vignette Effect
 * Creates a peripheral darkening effect using semi-transparent Views on all 4 edges
 * Appears when IH < 60%, intensifying as health decreases (max intensity 0.70)
 *
 * Note: expo-linear-gradient is not available in this project.
 * Uses overlapping semi-transparent Views as a fallback implementation.
 */
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

interface EdgeVignetteProps {
  health: number;
}

export const EdgeVignette = memo(({ health }: EdgeVignetteProps) => {
  // Only show when IH < 60%
  if (health >= 60) return null;

  // Calculate intensity: 0 at IH=60%, 0.70 at IH=0%
  const intensity = Math.min(0.70, ((60 - health) / 60) * 0.70);

  // Edge width scales with intensity
  const edgeWidth = Math.floor(intensity * 80); // 0-56px

  if (intensity <= 0) return null;

  return (
    <View
      testID="edge-vignette"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Top edge */}
      <View
        style={[
          styles.topEdge,
          {
            height: edgeWidth,
            opacity: intensity,
          },
        ]}
      />
      {/* Bottom edge */}
      <View
        style={[
          styles.bottomEdge,
          {
            height: edgeWidth,
            opacity: intensity,
          },
        ]}
      />
      {/* Left edge */}
      <View
        style={[
          styles.leftEdge,
          {
            width: edgeWidth,
            opacity: intensity,
          },
        ]}
      />
      {/* Right edge */}
      <View
        style={[
          styles.rightEdge,
          {
            width: edgeWidth,
            opacity: intensity,
          },
        ]}
      />
    </View>
  );
});

EdgeVignette.displayName = 'EdgeVignette';

const styles = StyleSheet.create({
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 800,
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 800,
  },
  leftEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
    zIndex: 800,
  },
  rightEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 800,
  },
});
