/**
 * One Day OS - PhaseGuard Component
 *
 * Time-based access control component that restricts UI access based on phase times.
 * Displays error screen when accessed outside of phase time range.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PhaseManager } from '../../core/phase/PhaseManager';
import { Phase } from '../../core/phase/types';
import { GlitchText } from '../effects/GlitchText';
import { theme } from '../theme/theme';

interface PhaseGuardProps {
  phase: Phase;
  children: React.ReactNode;
}

/**
 * Formats time as HH:MM
 */
const formatTime = (hour: number, minute: number = 0): string => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

/**
 * PhaseGuard Component
 *
 * Enforces time-based access restrictions for all 4 phases:
 * - MORNING: Accessible 6:00-12:00
 * - AFTERNOON: Accessible 12:00-18:00
 * - EVENING: Accessible 18:00-24:00
 * - NIGHT: Accessible 0:00-6:00
 *
 * Shows error screen with:
 * - Phase name (red glitched text)
 * - "アクセス不可" message
 * - Available time range
 * - Current time
 */
export const PhaseGuard: React.FC<PhaseGuardProps> = ({ phase, children }) => {
  const { t } = useTranslation();
  const currentPhase = PhaseManager.calculateCurrentPhase();
  const isAccessible = currentPhase === phase;

  // If within phase time, render children
  if (isAccessible) {
    return <>{children}</>;
  }

  // Otherwise, show error screen
  const now = new Date();
  const phaseName = PhaseManager.getPhaseDisplayName(phase);
  const timeRange = PhaseManager.getPhaseTimeRange(phase);
  const currentTime = formatTime(now.getHours(), now.getMinutes());

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Phase name with glitch effect */}
        <GlitchText
          text={t('phase.guard.layerTitle', { phase: phaseName })}
          severity={1}
          health={0}
          style={styles.phaseTitle}
        />

        {/* Access denied message */}
        <Text style={styles.deniedText}>{t('phase.guard.accessDenied')}</Text>

        {/* Available time range */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>{t('phase.guard.availableTime')}</Text>
          <Text style={styles.infoValue}>{timeRange}</Text>
        </View>

        {/* Current time */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>{t('phase.guard.currentTime')}</Text>
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
