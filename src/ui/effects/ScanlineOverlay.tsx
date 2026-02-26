/**
 * Scanline Overlay Effect
 * Adds a subtle CRT scanline visual effect using the existing noise texture
 * Appears when IH < 50%, maximum opacity 0.12
 *
 * Note: scanline.png does not exist in assets.
 * Uses noise.png (existing asset) at very low opacity as an alternative.
 * This provides a subtle texture overlay reminiscent of CRT scanlines.
 *
 * Performance: React.memo prevents unnecessary re-renders
 */
import React, { memo } from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';

interface ScanlineOverlayProps {
  health: number;
}

export const ScanlineOverlay = memo(({ health }: ScanlineOverlayProps) => {
  // Only show when IH < 50%
  if (health >= 50) return null;

  // Calculate opacity: 0 at IH=50%, max 0.12 at IH=0%
  const opacity = Math.min(0.12, ((50 - health) / 50) * 0.12);

  if (opacity <= 0) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]} pointerEvents="none">
      <ImageBackground
        testID="scanline-overlay"
        source={require('../../../assets/noise.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="repeat"
      />
    </View>
  );
});

ScanlineOverlay.displayName = 'ScanlineOverlay';

const styles = StyleSheet.create({
  overlay: {
    zIndex: 700, // Between AntiVisionFragments(600) and NoiseOverlay(999)
  },
});
