/**
 * One Day OS - CovenantPhase Component
 *
 * Phase 1 of Onboarding Ceremony: 契約の儀式 (Covenant Ritual)
 *
 * A 3-second long press button with:
 * - Progress ring visualization (0% → 100%)
 * - Haptic feedback (start, every second, completion)
 * - Brutalist design (black background, white border, red accent)
 */

import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme/theme';

export interface CovenantPhaseProps {
  onComplete: () => void;
}

const PRESS_DURATION = 3000; // 3 seconds
const HAPTIC_INTERVAL = 1000; // Every 1 second

export function CovenantPhase({ onComplete }: CovenantPhaseProps) {
  const [progress, setProgress] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const pressStartTime = useRef<number>(0);
  const animationFrame = useRef<number>(0);
  const hapticInterval = useRef<NodeJS.Timeout | null>(null);

  const triggerHaptic = async (type: 'start' | 'tick' | 'success') => {
    try {
      switch (type) {
        case 'start':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'tick':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
      }
    } catch (error) {
      // Gracefully ignore haptic errors (device may not support haptics)
    }
  };

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

    // Clear intervals
    if (hapticInterval.current) {
      clearInterval(hapticInterval.current);
      hapticInterval.current = null;
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    // Success haptic
    await triggerHaptic('success');

    // Call completion callback
    onComplete();
  };

  const handlePressIn = async () => {
    if (isCompleted) return;

    setIsPressed(true);
    pressStartTime.current = Date.now();

    // Start haptic
    await triggerHaptic('start');

    // Set interval for periodic haptics
    hapticInterval.current = setInterval(() => {
      triggerHaptic('tick');
    }, HAPTIC_INTERVAL);

    // Start progress animation
    animationFrame.current = requestAnimationFrame(updateProgress);
  };

  const handlePressOut = () => {
    if (isCompleted) return;

    setIsPressed(false);
    setProgress(0);

    // Clear intervals
    if (hapticInterval.current) {
      clearInterval(hapticInterval.current);
      hapticInterval.current = null;
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
  };

  // Calculate stroke dashoffset for progress ring
  const radius = 120;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
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
          <Text style={styles.buttonText}>覚悟を決めろ</Text>
        </Pressable>
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
  },
  buttonContainer: {
    position: 'relative',
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
});
