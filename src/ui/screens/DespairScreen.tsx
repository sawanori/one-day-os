/**
 * DespairScreen
 *
 * Post-wipe despair screen displaying lockout countdown
 * Visually represents "death" through intense glitch effects and red noise
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { GlitchText } from '../effects/GlitchText';
import { NoiseOverlay } from '../effects/NoiseOverlay';
import { ThemedText } from '../components/ThemedText';
import { theme } from '../theme/theme';

export interface DespairScreenProps {
  remainingLockoutMs: number; // Remaining time in milliseconds
  onLockoutEnd: () => void;
}

export const DespairScreen = ({ remainingLockoutMs, onLockoutEnd }: DespairScreenProps) => {
  const [displayTime, setDisplayTime] = useState('00:00:00');

  // M7: Use ref for callback to avoid re-runs when parent passes inline function
  const onLockoutEndRef = useRef(onLockoutEnd);
  onLockoutEndRef.current = onLockoutEnd;

  // Format milliseconds to HH:MM:SS
  const formatTime = (ms: number): string => {
    if (ms <= 0) return '00:00:00';

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Update display time and check for lockout end
  useEffect(() => {
    if (remainingLockoutMs <= 0) {
      setDisplayTime('00:00:00');
      onLockoutEndRef.current();
      return;
    }

    setDisplayTime(formatTime(remainingLockoutMs));
  }, [remainingLockoutMs]);

  return (
    <View style={styles.container}>
      {/* Main text with maximum glitch */}
      <GlitchText
        text="Welcome back to the old you."
        style={styles.mainText}
        severity={1.0}
        health={0}
      />

      {/* Subtext with maximum glitch */}
      <GlitchText
        text="お前は死んだ。"
        style={styles.subText}
        severity={1.0}
        health={0}
      />

      {/* Countdown timer */}
      <ThemedText style={styles.countdown}>
        {displayTime}
      </ThemedText>

      {/* Red noise overlay at maximum opacity */}
      <NoiseOverlay opacity={1.0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Pure black (#000000)
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainText: {
    color: theme.colors.accent, // Pure red (#FF0000)
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: theme.typography.fontFamily,
  },
  subText: {
    color: theme.colors.accent, // Pure red (#FF0000)
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 60,
    fontFamily: theme.typography.fontFamily,
  },
  countdown: {
    color: theme.colors.accent, // Pure red (#FF0000)
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily,
    letterSpacing: 4,
  },
});
