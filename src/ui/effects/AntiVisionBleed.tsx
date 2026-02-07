/**
 * Anti-Vision Bleed Effect
 * Displays the user's Anti-Vision as a watermark when Identity Health is low
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
  // IH 80%未満: 段階的に濃くなる
  if (health >= 80) {
    return null;
  }

  // Calculate opacity based on health ranges (INTENSIFIED)
  let opacity: number;
  if (health >= 50) {
    // IH 50-80%: opacity 0.2 - 0.5 (faint → medium)
    opacity = 0.2 + ((80 - health) / 30) * 0.3;
  } else if (health >= 30) {
    // IH 30-50%: opacity 0.5 - 0.7 (medium → strong)
    opacity = 0.5 + ((50 - health) / 20) * 0.2;
  } else {
    // IH 0-30%: opacity 0.7 - 0.9 (strong → overwhelming)
    opacity = 0.7 + ((30 - health) / 30) * 0.2;
  }

  return (
    <View
      testID="anti-vision-bleed"
      style={[styles.container, { opacity }]}
      pointerEvents="none"
    >
      <Text style={styles.bleedText} numberOfLines={undefined}>
        {antiVision}
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
    padding: 40,
    zIndex: 500, // NoiseOverlay(999)の下
  },
  bleedText: {
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    color: '#FF0000',
    textTransform: 'uppercase',
    letterSpacing: 4,
    lineHeight: 60,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
});
