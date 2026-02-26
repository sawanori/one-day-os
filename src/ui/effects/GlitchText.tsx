/**
 * GlitchText Effect
 * Displays text with chromatic aberration effect that intensifies with severity
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { isFeatureEnabled } from '../../config/features';

type GlitchTextProps = {
  text: string;
  style?: any;
  severity?: number; // 0 to 1, determines offset amount (optional: auto-calculated from health if not provided)
  health?: number; // Optional: for color tinting and auto severity calculation
};

export const GlitchText = ({ text, style, severity: externalSeverity, health = 100 }: GlitchTextProps) => {
  // health から severity を自動計算 (外部指定がない場合)
  const severity = externalSeverity !== undefined
    ? externalSeverity
    : Math.max(0, (100 - health) / 100); // IH=0 で severity=1.0

  const [offsets, setOffsets] = useState({ r: 0, b: 0 });

  // Calculate text color tint based on health
  const getTextColor = () => {
    if (health >= 50) {
      return theme.colors.foreground; // Pure white
    }
    // IH < 50%: Mix red into white
    const redAmount = Math.floor((50 - health) * 5.1); // 0-255
    return `rgba(255, ${255 - redAmount}, ${255 - redAmount}, 1)`;
  };

  // 動的オフセット更新
  useEffect(() => {
    if (!isFeatureEnabled('GLITCH_DYNAMIC_OFFSET')) {
      // Feature flag無効時は静的オフセット
      if (severity > 0) {
        setOffsets({ r: 2 + severity * 3, b: -2 - severity * 2 });
      } else {
        setOffsets({ r: 0, b: 0 });
      }
      return;
    }

    if (severity <= 0) {
      // severity=0時は停止
      setOffsets({ r: 0, b: 0 });
      return;
    }

    // 動的オフセット更新（severity が高いほど更新頻度を上げる: 50ms → 最速16ms）
    const updateInterval = Math.max(16, Math.floor(50 * (1 - severity)));
    const interval = setInterval(() => {
      setOffsets({
        r: (Math.random() - 0.5) * severity * 12,
        b: (Math.random() - 0.5) * severity * 10,
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [severity]);

  // No glitch when severity is 0
  if (severity <= 0) {
    return <Text style={[styles.text, style, { color: getTextColor() }]}>{text}</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Red Channel */}
      <Text
        testID="glitch-red"
        style={[
          styles.text,
          style,
          styles.layer,
          {
            color: 'rgba(255,0,0,0.7)',
            transform: [{ translateX: offsets.r }, { translateY: 1 }],
          },
        ]}
      >
        {text}
      </Text>

      {/* Blue Channel */}
      <Text
        testID="glitch-blue"
        style={[
          styles.text,
          style,
          styles.layer,
          {
            color: 'rgba(0,255,255,0.7)',
            transform: [{ translateX: offsets.b }, { translateY: -1 }],
          },
        ]}
      >
        {text}
      </Text>

      {/* Main White Channel (with red tint if IH < 50%) */}
      <Text testID="glitch-main" style={[styles.text, style, { color: getTextColor() }]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  text: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), // Brutalist font default
    fontWeight: 'bold',
    color: theme.colors.foreground,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.8,
  },
});
