/**
 * System Rejection Screen
 * Displays when uncaught errors occur, disguised as part of the OS
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme/theme';
import { NoiseOverlay } from '../effects/NoiseOverlay';

interface SystemRejectionScreenProps {
  error?: Error;
  errorInfo?: any;
}

export const SystemRejectionScreen = (_props: SystemRejectionScreenProps) => {
  const { t } = useTranslation();
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
      <NoiseOverlay health={0} />
      <Animated.View style={[styles.content, { opacity, transform: [{ translateX: glitchOffset }] }]}>
        <Text style={styles.title}>IDENTITY COLLAPSE</Text>
        <Text style={styles.subtitle}>{t('systemRejection.title')}</Text>
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
});
