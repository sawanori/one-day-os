/**
 * One Day OS - PhaseGuard Component
 *
 * Time-based access control component that restricts UI access based on phase times.
 * Displays error screen when accessed outside of phase time range.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PHASE_TIMES } from '@/constants';
import { GlitchText } from './GlitchText';
import { theme } from '../theme/theme';

// Type definitions
type Phase = 'MORNING' | 'EVENING';

interface PhaseGuardProps {
  phase: Phase;
  children: React.ReactNode;
}

/**
 * Gets current hour and minute
 */
const getCurrentTime = (): { hour: number; minute: number } => {
  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
};

/**
 * Formats time as HH:MM
 */
const formatTime = (hour: number, minute: number = 0): string => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

/**
 * Checks if current time is within the phase time range
 */
const isWithinPhaseTime = (phase: Phase): boolean => {
  const { hour } = getCurrentTime();
  const phaseTime = PHASE_TIMES[phase];

  // Check if hour is within range [start, end)
  return hour >= phaseTime.start && hour < phaseTime.end;
};

/**
 * Gets phase display name in Japanese
 */
const getPhaseDisplayName = (phase: Phase): string => {
  switch (phase) {
    case 'MORNING':
      return 'モーニング';
    case 'EVENING':
      return 'イブニング';
    default:
      return phase;
  }
};

/**
 * Gets phase time range as string
 */
const getPhaseTimeRange = (phase: Phase): string => {
  const phaseTime = PHASE_TIMES[phase];
  return `${formatTime(phaseTime.start)} - ${formatTime(phaseTime.end)}`;
};

/**
 * PhaseGuard Component
 *
 * Enforces time-based access restrictions:
 * - MORNING: Accessible 6:00-12:00
 * - EVENING: Accessible 18:00-24:00
 *
 * Shows error screen with:
 * - Phase name (red glitched text)
 * - "アクセス不可" message
 * - Available time range
 * - Current time
 */
export const PhaseGuard: React.FC<PhaseGuardProps> = ({ phase, children }) => {
  const isAccessible = isWithinPhaseTime(phase);

  // If within phase time, render children
  if (isAccessible) {
    return <>{children}</>;
  }

  // Otherwise, show error screen
  const { hour, minute } = getCurrentTime();
  const phaseName = getPhaseDisplayName(phase);
  const timeRange = getPhaseTimeRange(phase);
  const currentTime = formatTime(hour, minute);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Phase name with glitch effect */}
        <GlitchText
          ih={0} // Critical intensity for high visibility
          variant="heading"
          style={styles.phaseTitle}
        >
          {phaseName}レイヤー
        </GlitchText>

        {/* Access denied message */}
        <Text style={styles.deniedText}>アクセス不可</Text>

        {/* Available time range */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>利用可能時間:</Text>
          <Text style={styles.infoValue}>{timeRange}</Text>
        </View>

        {/* Current time */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>現在時刻:</Text>
          <Text style={styles.infoValue}>{currentTime}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  phaseTitle: {
    color: theme.colors.accent, // Red accent
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  deniedText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  infoContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.foreground,
  },
  infoLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.foreground,
  },
  infoValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.accent, // Red accent for emphasis
    fontWeight: theme.typography.fontWeight.bold,
  },
});
