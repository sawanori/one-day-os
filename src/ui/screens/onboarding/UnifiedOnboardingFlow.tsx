/**
 * One Day OS - UnifiedOnboardingFlow Component
 *
 * Unified 7-step onboarding flow combining ceremony rituals and data input:
 * 1. COVENANT → 3-second long press (accelerating heartbeat → silence)
 * 2. EXCAVATION → Anti-vision input (10s timeout + IH display)
 * 3. IDENTITY → Identity statement input
 * 4. MISSION → Mission input
 * 5. QUESTS → 2 quest inputs
 * 6. OPTICAL_CALIBRATION → Pinch to 2.0x (continuous haptics)
 * 7. FIRST_JUDGMENT → 5s YES/NO (fail → full reset)
 *
 * Design principles:
 * - No welcome screen (hospitality forbidden)
 * - No back buttons (forward only)
 * - Judgment failure resets to step 1 (sunk cost maximization)
 * - Android back button disabled
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingManager } from '../../../core/onboarding/OnboardingManager';
import { OnboardingStep, StepData } from '../../../core/onboarding/types';
import { updateAppState } from '../../../database/client';
import { CovenantPhase } from './CovenantPhase';
import { ExcavationPhase } from './ExcavationPhase';
import { LensSyncPhase } from './LensSyncPhase';
import { JudgmentPhase } from './JudgmentPhase';
import { IdentityStep } from './steps/IdentityStep';
import { MissionStep } from './steps/MissionStep';
import { QuestsStep } from './steps/QuestsStep';
import { theme } from '../../theme/theme';

const RESET_FLASH_DURATION = 1500; // 1.5 seconds

export function UnifiedOnboardingFlow() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('covenant');
  const [manager, setManager] = useState<OnboardingManager | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [showResetFlash, setShowResetFlash] = useState(false);

  const resetFlashOpacity = useRef(new Animated.Value(0)).current;

  // Disable Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  // Initialize manager
  useEffect(() => {
    let mounted = true;

    const initManager = async () => {
      try {
        const mgr = await OnboardingManager.getInstance();
        if (!mounted) return;

        setManager(mgr);

        const step = await mgr.getCurrentStep();
        if (!mounted) return;

        const isComplete = await mgr.isOnboardingComplete();
        if (!mounted) return;

        if (isComplete) {
          try {
            router.replace('/');
          } catch (routerError) {
            console.error('Router error:', routerError);
          }
          return;
        }

        setCurrentStep(step);
      } catch (err) {
        console.error('Error initializing manager:', err);
        if (mounted) {
          setError(err as Error);
        }
      }
    };

    initManager();

    return () => {
      mounted = false;
    };
  }, []);

  // Handle step completion
  const handleCompleteStep = async (step: OnboardingStep, data: StepData) => {
    if (!manager) return;

    try {
      await manager.completeStep(step, data);
      const nextStep = await manager.getCurrentStep();

      const isComplete = await manager.isOnboardingComplete();
      if (isComplete) {
        try {
          await updateAppState('active');
        } catch (updateErr) {
          console.error('Failed to update app state:', updateErr);
        }
        router.replace('/');
        return;
      }

      setCurrentStep(nextStep);
    } catch (stepErr) {
      console.error('Error completing step:', stepErr);
    }
  };

  // Handle Judgment failure - reset to covenant
  const handleJudgmentFail = async () => {
    if (!manager) return;

    setShowResetFlash(true);

    // Red flash animation
    Animated.sequence([
      Animated.timing(resetFlashOpacity, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(resetFlashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Reset after flash
    setTimeout(async () => {
      try {
        await manager.resetOnboarding();
      } catch (resetErr) {
        console.error('Error resetting onboarding:', resetErr);
      }
      setShowResetFlash(false);
      setCurrentStep('covenant');
      resetFlashOpacity.setValue(0);
    }, RESET_FLASH_DURATION);
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'covenant':
        return (
          <CovenantPhase
            onComplete={() => handleCompleteStep('covenant', null)}
          />
        );

      case 'excavation':
        return (
          <ExcavationPhase
            onComplete={(text) =>
              handleCompleteStep('excavation', { antiVision: text })
            }
          />
        );

      case 'identity':
        return (
          <IdentityStep
            onComplete={(data) => handleCompleteStep('identity', data)}
          />
        );

      case 'mission':
        return (
          <MissionStep
            onComplete={(data) => handleCompleteStep('mission', data)}
          />
        );

      case 'quests':
        return (
          <QuestsStep
            onComplete={(data) => handleCompleteStep('quests', data)}
          />
        );

      case 'optical_calibration':
        return (
          <LensSyncPhase
            onComplete={() => handleCompleteStep('optical_calibration', null)}
          />
        );

      case 'first_judgment':
        return (
          <JudgmentPhase
            onComplete={() => handleCompleteStep('first_judgment', null)}
            onFail={handleJudgmentFail}
          />
        );

      default:
        return (
          <CovenantPhase
            onComplete={() => handleCompleteStep('covenant', null)}
          />
        );
    }
  };

  if (error) {
    return (
      <View style={styles.container} testID="onboarding-container">
        <Text style={styles.errorText}>{t('error.boundary.title')}: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="onboarding-container">
      {renderStep()}

      {/* Reset Flash Overlay */}
      {showResetFlash && (
        <Animated.View
          testID="reset-flash"
          style={[
            styles.resetFlash,
            { opacity: resetFlashOpacity },
          ]}
        >
          <Text style={styles.resetText}>{t('ceremony.flow.restart')}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: theme.typography.fontSize.heading,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    padding: theme.spacing.lg,
  },
  resetFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  resetText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading * 1.5,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
  },
});
