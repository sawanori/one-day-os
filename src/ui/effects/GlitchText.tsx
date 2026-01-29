/**
 * GlitchText Effect
 * Displays text with chromatic aberration effect that intensifies with severity
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { isFeatureEnabled } from '../../config/features';

type GlitchTextProps = {
  text: string;
  style?: any;
  severity?: number; // 0 to 1, determines offset amount
};

export const GlitchText = ({ text, style, severity = 0 }: GlitchTextProps) => {
  const [offsets, setOffsets] = useState({ r: 0, b: 0 });

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

    // 動的オフセット更新（100msごと）
    const interval = setInterval(() => {
      setOffsets({
        r: (Math.random() - 0.5) * severity * 6,
        b: (Math.random() - 0.5) * severity * 4,
      });
    }, 100); // 10fps（グリッチ効果には十分）

    return () => clearInterval(interval);
  }, [severity]);

  // No glitch when severity is 0
  if (severity <= 0) {
    return <Text style={[styles.text, style]}>{text}</Text>;
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

      {/* Main White Channel */}
      <Text testID="glitch-main" style={[styles.text, style, { color: Colors.dark.text }]}>
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
    color: Colors.dark.text,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.8,
  },
});
