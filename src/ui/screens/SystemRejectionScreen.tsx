/**
 * System Rejection Screen
 * Displays when uncaught errors occur, disguised as part of the OS
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme/theme';
import { NoiseOverlay } from '../effects/NoiseOverlay';

interface SystemRejectionScreenProps {
  error?: Error;
  errorInfo?: any;
}

export const SystemRejectionScreen = ({ error }: SystemRejectionScreenProps) => {
  const [opacity] = useState(new Animated.Value(0));
  const [glitchOffset] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in effect
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Continuous glitch effect
    const glitchInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(glitchOffset, {
          toValue: (Math.random() - 0.5) * 20,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(glitchOffset, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <View style={styles.container}>
      <NoiseOverlay opacity={0.8} />
      <Animated.View style={[styles.content, { opacity, transform: [{ translateX: glitchOffset }] }]}>
        <Text style={styles.title}>IDENTITY COLLAPSE</Text>
        <Text style={styles.subtitle}>アイデンティティ崩壊</Text>
        <View style={styles.glitchBox}>
          <Text style={styles.glitchLine}>{'█'.repeat(20)}</Text>
          <Text style={styles.glitchLine}>{'█ ░░▓▓▒▒░░ ▓▓█'}</Text>
          <Text style={styles.glitchLine}>{'█▓▒░ ERROR ░▒▓█'}</Text>
          <Text style={styles.glitchLine}>{'█ ▒▒░░▓▓░░ ▓▓█'}</Text>
          <Text style={styles.glitchLine}>{'█'.repeat(20)}</Text>
        </View>
        <Text style={styles.message}>
          System cannot maintain integrity.{'\n'}
          Structure is dissolving.
        </Text>
        {__DEV__ && error && (
          <Text style={styles.devError} numberOfLines={5}>
            {error.toString()}
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    zIndex: 1000,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.error,
    letterSpacing: 6,
    marginBottom: 10,
    fontFamily: 'Courier New',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.error,
    letterSpacing: 2,
    marginBottom: 30,
    fontFamily: 'Courier New',
  },
  glitchBox: {
    marginVertical: 30,
    alignItems: 'center',
  },
  glitchLine: {
    fontSize: 16,
    color: theme.colors.error,
    fontFamily: 'Courier New',
    letterSpacing: 2,
  },
  message: {
    fontSize: 14,
    color: theme.colors.foreground,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Courier New',
  },
  devError: {
    marginTop: 40,
    fontSize: 10,
    color: '#555',
    fontFamily: 'Courier New',
    opacity: 0.5,
  },
});
