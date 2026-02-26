/**
 * One Day OS - CovenantPhase Component
 *
 * Phase 1 of Onboarding Ceremony: 契約の儀式 (Covenant Ritual)
 *
 * A 3-second long press button with:
 * - Progress ring visualization (0% → 100%)
 * - Haptic feedback (start, every second, completion)
 * - Brutalist design (black background, white border, red accent)
 * - Idle animations: breathing scale, radar pulse ring, hint text fade
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { HapticEngine } from '../../../core/HapticEngine';
import { theme } from '../../theme/theme';

export interface CovenantPhaseProps {
  onComplete: () => void;
}

const PRESS_DURATION = 3000; // 3 seconds

export function CovenantPhase({ onComplete }: CovenantPhaseProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const pressStartTime = useRef<number>(0);
  const animationFrame = useRef<number>(0);
  const hapticCleanup = useRef<(() => void) | null>(null);

  // Idle animation values
  const breatheScale = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(0.4)).current;
  const pulseRingScale = useRef(new Animated.Value(1)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0.3)).current;
  const idleAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const updateProgress = () => {
    const elapsed = Date.now() - pressStartTime.current;
    const currentProgress = Math.min((elapsed / PRESS_DURATION) * 100, 100);

    setProgress(currentProgress);

    if (currentProgress >= 100) {
      handleComplete();
    } else {
      animationFrame.current = requestAnimationFrame(updateProgress);
    }
  };

  const handleComplete = async () => {
    if (isCompleted) return;

    setIsCompleted(true);
    setProgress(100);
    setIsPressed(false);

    // Clear haptic (silence on completion)
    if (hapticCleanup.current) {
      hapticCleanup.current();
      hapticCleanup.current = null;
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    // No success haptic - silence is the reward
    onComplete();
  };

  const handlePressIn = async () => {
    if (isCompleted) return;

    setIsPressed(true);
    pressStartTime.current = Date.now();

    // Start accelerating heartbeat
    const cleanup = await HapticEngine.acceleratingHeartbeat();
    hapticCleanup.current = cleanup;

    // Start progress animation
    animationFrame.current = requestAnimationFrame(updateProgress);
  };

  const handlePressOut = () => {
    if (isCompleted) return;

    setIsPressed(false);
    setProgress(0);

    // Clear haptic
    if (hapticCleanup.current) {
      hapticCleanup.current();
      hapticCleanup.current = null;
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
  };

  // Idle animations (breathing + pulse ring + hint fade)
  useEffect(() => {
    if (isPressed || isCompleted) {
      idleAnimRef.current?.stop();
      breatheScale.setValue(1);
      return;
    }

    idleAnimRef.current = Animated.parallel([
      // Breathing scale — the button is alive, waiting
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheScale, {
            toValue: 1.04,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breatheScale, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
      // Hint text slow blink — beckoning
      Animated.loop(
        Animated.sequence([
          Animated.timing(hintOpacity, {
            toValue: 0.8,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(600),
          Animated.timing(hintOpacity, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(400),
        ])
      ),
      // Radar pulse ring — ominous expanding ring
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseRingScale, {
              toValue: 1.25,
              duration: 3000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(pulseRingOpacity, {
              toValue: 0,
              duration: 3000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          // Reset
          Animated.parallel([
            Animated.timing(pulseRingScale, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(pulseRingOpacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          ]),
          Animated.delay(800),
        ])
      ),
    ]);

    idleAnimRef.current.start();

    return () => {
      idleAnimRef.current?.stop();
    };
  }, [isPressed, isCompleted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hapticCleanup.current) {
        hapticCleanup.current();
        hapticCleanup.current = null;
      }
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      idleAnimRef.current?.stop();
    };
  }, []);

  // Calculate stroke dashoffset for progress ring
  const radius = 120;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        {/* Radar Pulse Ring */}
        {!isCompleted && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseRingScale }],
                opacity: pulseRingOpacity,
              },
            ]}
          />
        )}

        {/* Button with breathing scale */}
        <Animated.View
          style={[
            styles.buttonContainer,
            { transform: [{ scale: breatheScale }] },
          ]}
        >
          <Pressable
            testID="covenant-button"
            style={[
              styles.button,
              isPressed && styles.buttonPressed,
              isCompleted && styles.buttonCompleted,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isCompleted}
          >
            {/* Progress Ring */}
            <View style={styles.progressRingContainer} testID="progress-ring">
              <View style={styles.progressRing}>
                {/* Background circle */}
                <View
                  style={[
                    styles.progressCircle,
                    {
                      width: radius * 2,
                      height: radius * 2,
                      borderRadius: radius,
                      borderWidth: strokeWidth,
                      borderColor: theme.colors.foreground,
                    },
                  ]}
                />
                {/* Progress circle (simulated with a View) */}
                {progress > 0 && (
                  <View
                    style={[
                      styles.progressCircle,
                      {
                        width: radius * 2,
                        height: radius * 2,
                        borderRadius: radius,
                        borderWidth: strokeWidth,
                        borderColor: isPressed ? theme.colors.accent : theme.colors.foreground,
                        borderTopColor: 'transparent',
                        borderLeftColor: 'transparent',
                        borderRightColor: progress > 25 ? (isPressed ? theme.colors.accent : theme.colors.foreground) : 'transparent',
                        borderBottomColor: progress > 50 ? (isPressed ? theme.colors.accent : theme.colors.foreground) : 'transparent',
                        transform: [{ rotate: `${(progress / 100) * 360}deg` }],
                      },
                    ]}
                  />
                )}
              </View>
            </View>

            {/* Button Text */}
            <Text style={styles.buttonText}>{t('ceremony.covenant.title')}</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Hint Text with fade pulse */}
      {!isCompleted && (
        <Animated.View style={[styles.hintContainer, { opacity: hintOpacity }]}>
          <View style={styles.hintLine} />
          <Text style={styles.hintText}>{t('ceremony.covenant.hint')}</Text>
          <View style={styles.hintLine} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWrapper: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  buttonContainer: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 4,
    borderColor: theme.colors.foreground,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    borderColor: theme.colors.accent,
  },
  buttonCompleted: {
    borderColor: theme.colors.accent,
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
  },
  progressRingContainer: {
    position: 'absolute',
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'relative',
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    position: 'absolute',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 48,
    gap: 12,
  },
  hintLine: {
    width: 24,
    height: 1,
    backgroundColor: theme.colors.accent,
  },
  hintText: {
    color: theme.colors.accent,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    letterSpacing: 6,
    textAlign: 'center' as const,
  },
});
