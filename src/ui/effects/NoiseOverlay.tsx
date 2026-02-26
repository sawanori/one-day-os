/**
 * Noise Overlay Effect
 * Displays a noise texture overlay that intensifies as Identity Health decreases
 */
import React from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { isFeatureEnabled } from '../../config/features';

interface NoiseOverlayProps {
  health: number;
}

export const NoiseOverlay = ({ health }: NoiseOverlayProps) => {
  // Calculate opacity from health: max 0.35 at 0% health, 0 at 100% health
  const opacity = Math.min(0.35, Math.max(0, (100 - health) / 100) * 0.35);

  // Don't render if opacity is 0 or negative
  if (opacity <= 0) return null;

  const baseStyle = [
    styles.container,
    { opacity },
  ];

  // Feature flag: Use new texture or fallback to solid black
  if (!isFeatureEnabled('NOISE_OVERLAY_TEXTURE')) {
    // Fallback: Solid black overlay
    return (
      <View
        testID="noise-overlay"
        style={[...baseStyle, { backgroundColor: '#000' }]}
        pointerEvents="none"
      />
    );
  }

  // New: Noise texture overlay
  return (
    <View style={styles.container} pointerEvents="none">
      <ImageBackground
        testID="noise-overlay"
        source={require('../../../assets/noise.png')}
        style={[StyleSheet.absoluteFill, { opacity }]}
        resizeMode="repeat"
      />
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
    zIndex: 999, // On top of everything (except modals)
  },
});
