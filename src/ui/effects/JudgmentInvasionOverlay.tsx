/**
 * One Day OS - Judgment Invasion Overlay
 *
 * Full-screen overlay that monitors scheduled judgments via polling.
 * When a judgment time arrives while the app is in the foreground,
 * triggers an invasion animation sequence before navigating to the judgment screen.
 *
 * Exception to brutalist no-animation rule:
 * The judgment invasion uses animation because it represents the OS's will
 * intervening -- an external force the user cannot control.
 *
 * Animation Phases:
 *   Phase 1: Omen (500ms) - Noise increases, haptic heartbeat
 *   Phase 2: Invasion (300ms) - Red line descends, content scrolls out, overlay fades to black
 *   Phase 3: Navigation - Push to /judgment with question params
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { JudgmentEngine, JudgmentQuestionSelector, JudgmentTimingEngine } from '../../core/judgment';
import { HapticEngine } from '../../core/HapticEngine';
import { theme } from '../theme/theme';
import { JUDGMENT_CONSTANTS } from '../../constants';
import type { JudgmentCategory } from '../../constants';

type InvasionPhase = 'idle' | 'omen' | 'invasion' | 'navigating';

interface PendingJudgment {
  scheduleId: number;
  category: JudgmentCategory;
  questionKey: string;
  questionRendered: string;
  scheduledAt: string;
}

export function JudgmentInvasionOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<InvasionPhase>('idle');

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const noiseIntensity = useRef(new Animated.Value(0)).current;
  const redLineY = useRef(new Animated.Value(-2)).current;

  // Judgment data for navigation
  const pendingJudgmentRef = useRef<PendingJudgment | null>(null);

  // Track last fired scheduleId to avoid double-firing the same judgment
  const lastFiredScheduleIdRef = useRef<number | null>(null);

  // Timeout refs for cleanup on unmount (prevent memory leaks from nested setTimeouts)
  const omenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const invasionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to track current phase for use inside interval callback
  const phaseRef = useRef<InvasionPhase>('idle');
  const pathnameRef = useRef<string>(pathname);

  // Keep refs in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const resetAnimation = useCallback(() => {
    if (omenTimeoutRef.current) clearTimeout(omenTimeoutRef.current);
    if (invasionTimeoutRef.current) clearTimeout(invasionTimeoutRef.current);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    omenTimeoutRef.current = null;
    invasionTimeoutRef.current = null;
    resetTimeoutRef.current = null;
    overlayOpacity.setValue(0);
    noiseIntensity.setValue(0);
    redLineY.setValue(-2);
    pendingJudgmentRef.current = null;
    setPhase('idle');
  }, [overlayOpacity, noiseIntensity, redLineY]);

  const startInvasion = useCallback(async () => {
    setPhase('omen');

    // Phase 1: Omen (500ms)
    // - Increase noise overlay
    // - Haptic heartbeat pattern
    HapticEngine.judgmentArrival();

    Animated.timing(noiseIntensity, {
      toValue: 0.5,
      duration: 500,
      useNativeDriver: false,
    }).start();

    Animated.timing(overlayOpacity, {
      toValue: 0.3,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // After 500ms, Phase 2: Invasion
    omenTimeoutRef.current = setTimeout(() => {
      setPhase('invasion');

      const screenHeight = Dimensions.get('window').height;

      // Red line descends from top to bottom
      Animated.timing(redLineY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Overlay fades to full black
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // After 300ms, navigate to judgment
      invasionTimeoutRef.current = setTimeout(() => {
        setPhase('navigating');

        if (pendingJudgmentRef.current) {
          const {
            scheduleId,
            category,
            questionKey,
            questionRendered,
            scheduledAt,
          } = pendingJudgmentRef.current;

          router.push({
            pathname: '/judgment',
            params: {
              scheduleId: String(scheduleId),
              category,
              questionKey,
              question: questionRendered,
              scheduledAt,
            },
          });
        }

        // Reset animation values after navigation
        resetTimeoutRef.current = setTimeout(() => {
          resetAnimation();
        }, 500);
      }, 300);
    }, 500);
  }, [noiseIntensity, overlayOpacity, redLineY, router, resetAnimation]);

  // Poll for scheduled judgments every 5 seconds
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      // Don't check if already in invasion or on judgment/death/onboarding screens
      if (phaseRef.current !== 'idle') return;
      const currentPathname = pathnameRef.current;
      if (
        currentPathname === '/judgment' ||
        currentPathname === '/death' ||
        currentPathname.startsWith('/onboarding')
      ) {
        return;
      }

      try {
        const engine = await JudgmentEngine.getInstance();
        const today = JudgmentEngine.getTodayDate();
        const currentTime = JudgmentEngine.getCurrentTime();

        // Get schedule for today
        const schedule = await engine.getScheduleForDate(today);

        // Find any unfired judgment whose time has arrived (including recent overdue)
        // Summons model: use <= to catch judgments whose time has passed but within expiry window
        const now = Date.now();
        const dueJudgment = schedule.find((s) => {
          if (s.is_fired !== 0) return false;
          if (s.scheduled_time > currentTime) return false;

          // Check expiry: only fire if within 30-min window
          const scheduledAt = new Date(
            `${s.scheduled_date}T${s.scheduled_time}:00`
          ).getTime();
          const elapsedMinutes = (now - scheduledAt) / (1000 * 60);
          if (elapsedMinutes > JUDGMENT_CONSTANTS.SUMMONS_EXPIRY_MINUTES) return false;

          return true;
        });

        if (dueJudgment) {
          // Dedup: skip if we already fired this exact scheduleId
          if (lastFiredScheduleIdRef.current === dueJudgment.id) return;
          lastFiredScheduleIdRef.current = dueJudgment.id;

          // Mark as fired immediately to prevent re-triggering
          await engine.markScheduleFired(dueJudgment.id);

          // P6: Intelligent category selection based on current context
          const context = await JudgmentTimingEngine.buildContext(engine, today, currentTime);
          const intelligentCategory = JudgmentTimingEngine.selectCategory(context);

          // Get rendered question using intelligent category
          const selected = await JudgmentQuestionSelector.selectQuestion(
            intelligentCategory
          );

          pendingJudgmentRef.current = {
            scheduleId: dueJudgment.id,
            category: intelligentCategory,
            questionKey: selected.questionKey,
            questionRendered: selected.questionRendered,
            scheduledAt: `${dueJudgment.scheduled_date}T${dueJudgment.scheduled_time}:00.000Z`,
          };

          // Start the invasion animation
          startInvasion();
        }
      } catch (error) {
        console.error('[JudgmentInvasionOverlay] Judgment check failed:', error);
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      if (omenTimeoutRef.current) clearTimeout(omenTimeoutRef.current);
      if (invasionTimeoutRef.current) clearTimeout(invasionTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, [startInvasion]);

  // Don't render anything when idle
  if (phase === 'idle') return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1001 }]} pointerEvents="none">
      {/* Dark overlay */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents="none"
      />

      {/* Red invasion line */}
      <Animated.View
        style={[
          styles.redLine,
          { transform: [{ translateY: redLineY }] },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    zIndex: 1001,
  },
  redLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.colors.accent,
    zIndex: 1002,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
});
