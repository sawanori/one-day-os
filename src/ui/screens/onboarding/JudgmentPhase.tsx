/**
 * One Day OS - JudgmentPhase Component
 *
 * Phase 4 of Onboarding Ceremony: Judgment Test (審判の試験)
 *
 * Features:
 * - 5-second countdown timer (real-time display)
 * - YES/NO button interaction
 * - Timeout detection and penalty
 * - Failure animation with red glitch effect
 * - Haptic feedback on failure
 * - Force reset to Phase 1 on failure
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme/theme';
import { GlitchText } from '../../effects/GlitchText';
import { HapticEngine } from '../../../core/HapticEngine';

export interface JudgmentPhaseProps {
  onComplete: () => void;
  onFail: () => void; // Force reset to Phase 1
}

const COUNTDOWN_DURATION = 5; // 5 seconds
const FAILURE_ANIMATION_DURATION = 2000; // 2 seconds

export function JudgmentPhase({ onComplete, onFail }: JudgmentPhaseProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const [isFailed, setIsFailed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const failureTimeout = useRef<NodeJS.Timeout | null>(null);
  const glitchOpacity = useRef(new Animated.Value(0)).current;

  // Trigger failure flow
  const triggerFailure = async () => {
    if (isFailed || isCompleted) return;

    setIsFailed(true);

    // Clear countdown
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }

    // Trigger haptic feedback
    try {
      await HapticEngine.punishFailure();
    } catch (error) {
      // Gracefully ignore haptic errors
    }

    // Show glitch overlay animation
    Animated.timing(glitchOpacity, {
      toValue: 0.8,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Call onFail after animation
    failureTimeout.current = setTimeout(() => {
      onFail();
    }, FAILURE_ANIMATION_DURATION);
  };

  // Handle YES button press
  const handleYesPress = () => {
    if (isFailed || isCompleted) return;

    setIsCompleted(true);

    // Clear countdown
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }

    // Call completion callback
    onComplete();
  };

  // Handle NO button press
  const handleNoPress = () => {
    triggerFailure();
  };

  // Handle countdown tick
  const handleCountdownTick = () => {
    setCountdown((prev) => {
      const next = prev - 1;
      return next;
    });
  };

  // Initialize countdown timer
  useEffect(() => {
    countdownInterval.current = setInterval(() => {
      handleCountdownTick();
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      if (failureTimeout.current) {
        clearTimeout(failureTimeout.current);
      }
    };
  }, []);

  // Watch for countdown reaching 0
  useEffect(() => {
    if (countdown <= 0 && !isFailed && !isCompleted) {
      triggerFailure();
    }
  }, [countdown, isFailed, isCompleted]);

  return (
    <View style={styles.container}>
      {/* Glitch Overlay */}
      {isFailed && (
        <Animated.View
          testID="glitch-overlay"
          style={[
            styles.glitchOverlay,
            {
              opacity: glitchOpacity,
            },
          ]}
        />
      )}

      {/* Notification Card */}
      <View style={styles.notificationCard}>
        {/* Title */}
        <View style={styles.titleContainer}>
          {isFailed ? (
            <GlitchText
              text="あなたは誰か？"
              style={styles.title}
              severity={0.8}
            />
          ) : (
            <Text style={styles.title}>あなたは誰か？</Text>
          )}
        </View>

        {/* Subtitle or Failure Message */}
        {isFailed ? (
          <Text style={styles.failureText}>覚悟なき者に再構築の資格なし</Text>
        ) : (
          <Text style={styles.subtitle}>5秒以内に回答せよ</Text>
        )}

        {/* Countdown Timer */}
        {!isFailed && (
          <Text testID="countdown-timer" style={styles.countdown}>
            {String(countdown)}
          </Text>
        )}

        {/* Buttons */}
        {!isFailed && !isCompleted && (
          <View style={styles.buttonContainer}>
            <Pressable
              testID="yes-button"
              style={styles.yesButton}
              onPress={handleYesPress}
            >
              <Text style={styles.yesButtonText}>YES</Text>
            </Pressable>

            <Pressable
              testID="no-button"
              style={styles.noButton}
              onPress={handleNoPress}
            >
              <Text style={styles.noButtonText}>NO</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  glitchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.accent,
    zIndex: 1000,
  },
  notificationCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  titleContainer: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.heading,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  countdown: {
    fontSize: 72,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accent,
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
    marginTop: theme.spacing.md,
  },
  yesButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  yesButtonText: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
  },
  noButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.none,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  noButtonText: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accent,
  },
  failureText: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accent,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
