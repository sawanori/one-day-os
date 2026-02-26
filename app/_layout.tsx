
/**
 * One Day OS - Root Layout
 * Main app layout with Expo Router
 */

import '../src/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { NotoSerifJP_700Bold } from '@expo-google-fonts/noto-serif-jp';
import * as Notifications from 'expo-notifications';
import { databaseInit } from '../src/database/client';
import { DailyManager } from '../src/core/daily';
import { PhaseManager } from '../src/core/phase';
import { JudgmentEngine, JudgmentTimingEngine } from '../src/core/judgment';
import { JUDGMENT_CONSTANTS } from '../src/constants';
import { theme } from '../src/ui/theme/theme';
import { StressContainer } from '../src/ui/layout/StressContainer';
import { NotificationController } from '../src/core/NotificationController';
import { ErrorBoundary } from '../src/ui/components/ErrorBoundary';
import { JudgmentNotificationScheduler } from '../src/notifications/JudgmentNotificationScheduler';
// JudgmentBackgroundHandler removed — summons model has no OS-level YES/NO buttons
import { JudgmentInvasionOverlay } from '../src/ui/effects/JudgmentInvasionOverlay';
import { PaidIdentityWatermark } from '../src/ui/effects/PaidIdentityWatermark';
import { IAPService } from '../src/core/insurance';

// Notification handler — set at module level (Expo recommendation).
// Without this, iOS silently suppresses ALL foreground notifications.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Web Not Supported Component
const WebNotSupported = () => {
  const webBlockStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000000',
      padding: 20,
    },
    title: {
      color: '#FF0000',
      fontSize: 24,
      fontFamily: 'Courier New',
      marginBottom: 20,
      textAlign: 'center',
    },
    message: {
      color: '#FFFFFF',
      fontSize: 16,
      fontFamily: 'Courier New',
      textAlign: 'center',
      marginVertical: 10,
    },
    reason: {
      color: '#808080',
      fontSize: 12,
      fontFamily: 'Courier New',
      textAlign: 'center',
      marginTop: 30,
      maxWidth: 600,
    },
  });

  return (
    <View style={webBlockStyles.container}>
      <Text style={webBlockStyles.title}>⚠️ WEB NOT SUPPORTED</Text>
      <Text style={webBlockStyles.message}>
        One Day OS is a mobile-only application.
      </Text>
      <Text style={webBlockStyles.message}>
        Please use Android or iOS device.
      </Text>
      <Text style={webBlockStyles.reason}>
        Core features (local SQLite, no backup, precise notifications)
        require native mobile capabilities.
      </Text>
    </View>
  );
};

// Root Layout Component
function RootLayout() {
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    NotoSerifJP_700Bold,
  });

  // Track database initialization state
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // PhaseManager initialization (sync, no DB dependency)
    const phaseManager = PhaseManager.getInstance();
    phaseManager.initialize();

    // DailyManager instance for cleanup
    let dailyManager: DailyManager | null = null;

    // Initialize database first, then start other services
    databaseInit()
      .then(async () => {
        // DB tables are ready — unblock rendering immediately
        setDbReady(true);

        dailyManager = await DailyManager.getInstance();

        dailyManager.onDateChange((event) => {
          console.log('[Layout] Date changed:', event.previousDate, '->', event.newDate);
        });

        // Request notification permission before scheduling.
        // Only prompts when undetermined; denied state logs a warning without crashing.
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus === 'undetermined') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            console.warn('[Layout] Notification permission denied. status:', newStatus);
          }
        } else if (existingStatus === 'denied') {
          console.warn('[Layout] Notification permission previously denied.');
        }

        // Initialize JudgmentEngine and generate today's schedule
        const judgmentEngine = await JudgmentEngine.getInstance();
        const today = JudgmentEngine.getTodayDate();
        await judgmentEngine.generateDailySchedule(today);

        // Schedule OS notifications for today's judgment times
        await JudgmentNotificationScheduler.initialize();
        const schedule = await judgmentEngine.getScheduleForDate(today);
        await JudgmentNotificationScheduler.scheduleNotifications(schedule);

        // Background handler removed — summons model uses tap-to-open only

        // Initialize IAP service for Identity Insurance
        const iap = IAPService.getInstance();
        await iap.initialize();
        await iap.checkPendingTransactions();
      })
      .catch((error) => {
        console.error('Failed to initialize:', error);
        // Allow app to show errors naturally instead of hanging
        setDbReady(true);
      });

    return () => {
      phaseManager.dispose();
      dailyManager?.dispose();
      IAPService.getInstance().dispose();
    };
  }, []);

  // Track when app goes to background for inactivity detection
  const lastBackgroundTimeRef = useRef<number | null>(null);

  // Check for overdue judgments and apply intelligent timing on app resume
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Record when app leaves foreground
        lastBackgroundTimeRef.current = Date.now();
        return;
      }

      if (nextState === 'active') {
        try {
          const engine = await JudgmentEngine.getInstance();
          const today = JudgmentEngine.getTodayDate();
          const currentTime = JudgmentEngine.getCurrentTime();

          // Summons model: handle overdue (unfired) judgments
          // - Old (>30 min): auto-resolve as SUMMONS_EXPIRED with -5 penalty
          // - Recent (<=30 min): apply -5 if >3 min late, keep unfired for JudgmentInvasionOverlay
          const overdue = await engine.getOverdueJudgments(today, currentTime);
          for (const schedule of overdue) {
            const scheduledAt = `${schedule.scheduled_date}T${schedule.scheduled_time}:00.000Z`;
            const scheduledTime = new Date(scheduledAt).getTime();
            const now = Date.now();
            const elapsedMinutes = (now - scheduledTime) / (1000 * 60);

            if (elapsedMinutes > JUDGMENT_CONSTANTS.SUMMONS_EXPIRY_MINUTES) {
              // Expired: >30 min old — auto-resolve with summons missed penalty only
              await engine.markScheduleFired(schedule.id);
              await engine.recordResponse(
                schedule.id,
                schedule.category as any,
                `judgment.${schedule.category.toLowerCase()}.q1`,
                null,
                'SUMMONS_EXPIRED',
                null,
                scheduledAt
              );
            } else {
              // Recent: <=30 min old — apply summons late penalty if >3 min, keep for overlay
              const elapsedSeconds = (now - scheduledTime) / 1000;
              if (elapsedSeconds > JUDGMENT_CONSTANTS.SUMMONS_TIMEOUT_SECONDS) {
                const penaltyResult = await engine.applySummonsPenalty(schedule.id, scheduledAt);
                if (penaltyResult.wipeTriggered) {
                  console.warn('[Layout] Summons penalty triggered wipe');
                }
              }
              // Do NOT mark as fired — JudgmentInvasionOverlay will pick it up
            }
          }

          // P6: Intelligent timing adjustment on resume
          const adjustment = await JudgmentTimingEngine.evaluateOnResume(
            engine,
            lastBackgroundTimeRef.current,
            today,
            currentTime
          );

          if (adjustment.fireImmediately) {
            // Long inactivity detected — fire next unfired judgment immediately
            // The JudgmentInvasionOverlay will pick it up on next poll cycle
            // by rescheduling the next unfired to the current minute
            const unfired = await engine.getUnfiredJudgments(today, currentTime);
            if (unfired.length > 0) {
              await engine.rescheduleJudgment(unfired[0].id, currentTime);
            }
          } else if (adjustment.reschedules.length > 0) {
            // Apply timing adjustments (reschedule unfired judgments)
            await JudgmentTimingEngine.applyTimingAdjustment(engine, adjustment);

            // Cancel and re-schedule OS notifications after timing changes
            await JudgmentNotificationScheduler.cancelAllJudgmentNotifications();
          }

          // Schedule remaining notifications for today (always refresh after changes)
          await JudgmentNotificationScheduler.scheduleNotifications(
            await engine.getScheduleForDate(today)
          );
        } catch (error) {
          console.error('Failed to check overdue judgments:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Wait for fonts and database to be ready
  if (!fontsLoaded || !dbReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StressContainer>
          <NotificationController />
          <JudgmentInvasionOverlay />
          <PaidIdentityWatermark />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: theme.colors.background,
              },
              animation: 'none', // Brutalist: no animations
            }}
          />
        </StressContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Export appropriate component based on platform
export default Platform.OS === 'web' ? WebNotSupported : RootLayout;
