/**
 * Anti-Vision Bleed Effect
 * Displays the user's Anti-Vision as a watermark when Identity Health is low
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { isFeatureEnabled } from '../../config/features';
import { Colors } from '../theme/colors';

interface AntiVisionBleedProps {
  antiVision: string;
  health: number;
}

export const AntiVisionBleed = ({ antiVision, health }: AntiVisionBleedProps) => {
  // Feature flag check
  if (!isFeatureEnabled('ANTI_VISION_BLEED')) {
    return null;
  }

  // IH 30%以上: 非表示
  // IH 29%以下: 表示（opacity 0.01 ~ 0.3）
  if (health >= 30) {
    return null;
  }

  const opacity = (30 - health) / 100; // 0.01 ~ 0.3

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
