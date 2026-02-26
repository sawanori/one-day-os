/**
 * Anti-Vision Bleed Effect
 * Displays the user's Anti-Vision as a watermark when Identity Health is low
 * Layout: distributed to 4 corners (top-left, mid-left, top-right, bottom-right)
 * Center content area is always clear
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { isFeatureEnabled } from '../../config/features';
import { theme } from '../theme/theme';

interface AntiVisionBleedProps {
  antiVision: string;
  health: number;
}

export const AntiVisionBleed = ({ antiVision, health }: AntiVisionBleedProps) => {
  // Feature flag check
  if (!isFeatureEnabled('ANTI_VISION_BLEED')) {
    return null;
  }

  // IH 80%以上: 非表示
  if (health >= 80) {
    return null;
  }

  // Calculate opacity based on health ranges (capped at 0.25)
  let opacity: number;
  if (health >= 50) {
    // IH 50-80%: opacity 0.03 - 0.10
    opacity = 0.03 + ((80 - health) / 30) * 0.07;
  } else if (health >= 30) {
    // IH 30-50%: opacity 0.10 - 0.18
    opacity = 0.10 + ((50 - health) / 20) * 0.08;
  } else {
    // IH 0-30%: opacity 0.18 - 0.25
    opacity = 0.18 + ((30 - health) / 30) * 0.07;
  }

  // Split antiVision text into words for distribution across positions
  const words = antiVision.split(/\s+/).filter(w => w.length > 0);
  const getWordForPosition = (index: number): string => {
    if (words.length === 0) return antiVision;
    return words[index % words.length];
  };

  return (
    <View
      testID="anti-vision-bleed"
      style={[styles.container, { opacity }]}
      pointerEvents="none"
    >
      {/* Top-left position */}
      <Text style={[styles.bleedText, styles.topLeft]}>
        {getWordForPosition(0)}
      </Text>
      {/* Mid-left position */}
      <Text style={[styles.bleedText, styles.midLeft]}>
        {getWordForPosition(1)}
      </Text>
      {/* Top-right position */}
      <Text style={[styles.bleedText, styles.topRight]}>
        {getWordForPosition(2)}
      </Text>
      {/* Bottom-right position */}
      <Text style={[styles.bleedText, styles.bottomRight]}>
        {getWordForPosition(3)}
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
    zIndex: 500, // NoiseOverlay(999)の下
  },
  bleedText: {
    position: 'absolute',
    fontSize: 20,
    fontWeight: '900',
    color: '#FF0000',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  topLeft: {
    top: 60,
    left: 8,
  },
  midLeft: {
    top: '45%',
    left: 8,
  },
  topRight: {
    top: 60,
    right: 8,
    textAlign: 'right',
  },
  bottomRight: {
    bottom: 80,
    right: 8,
    textAlign: 'right',
  },
});
