/**
 * One Day OS - OnboardingFlow Component
 *
 * 5-step onboarding flow with Brutalist design:
 * 1. Welcome - Introduction to One Day OS
 * 2. Anti-Vision - Define the worst possible future
 * 3. Identity - Who are you? ("I am a person who...")
 * 4. Mission - One year mission statement
 * 5. Quests - Two daily quests
 */

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingManager, OnboardingStep } from '../../../core/onboarding/OnboardingManager';
import { updateAppState } from '../../../database/client';
import { styles } from './onboarding.styles';
import { WelcomeStep, AntiVisionStep, IdentityStep, MissionStep, QuestsStep } from './steps';

export function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [manager, setManager] = useState<OnboardingManager | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize manager and load current step
  useEffect(() => {
    let mounted = true;

    const initManager = async () => {
      try {
        const mgr = await OnboardingManager.getInstance();
        if (!mounted) {
          return;
        }

        setManager(mgr);

        const step = await mgr.getCurrentStep();
        if (!mounted) {
          return;
        }

        setCurrentStep(step);

        const isComplete = await mgr.isOnboardingComplete();
        if (!mounted) {
          return;
        }

        if (isComplete) {
          // Navigate to main app (handled by router mock in tests)
          try {
            router.replace('/');
          } catch (routerError) {
            console.error('Router error:', routerError);
          }
        }
        setIsInitialized(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle step completion
  const handleCompleteStep = async (step: OnboardingStep, data: any) => {
    if (!manager) return;

    try {
      await manager.completeStep(step, data);
      const nextStep = await manager.getCurrentStep();
      setCurrentStep(nextStep);

      const isComplete = await manager.isOnboardingComplete();
      if (isComplete) {
        // Update app state to 'active' before navigating
        try {
          await updateAppState('active');
        } catch (error) {
          console.error('Failed to update app state:', error);
          // Continue with navigation even if app_state update fails
          // On next app start, isOnboardingComplete() will be true
          // and user will be redirected to main app automatically
        }
        router.replace('/');
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Button handler for welcome step
  const handleWelcomePress = () => {
    if (manager) {
      handleCompleteStep('welcome', null);
    }
  };

  // Render current step
  const renderStep = () => {
    try {
      switch (currentStep) {
        case 'welcome':
          return <WelcomeStep onBegin={handleWelcomePress} />;
        case 'anti-vision':
          return (
            <AntiVisionStep
              onComplete={(data) => handleCompleteStep('anti-vision', data)}
              onBack={handleBack}
            />
          );
        case 'identity':
          return (
            <IdentityStep
              onComplete={(data) => handleCompleteStep('identity', data)}
              onBack={handleBack}
            />
          );
        case 'mission':
          return (
            <MissionStep
              onComplete={(data) => handleCompleteStep('mission', data)}
              onBack={handleBack}
            />
          );
        case 'quests':
          return (
            <QuestsStep
              onComplete={(data) => handleCompleteStep('quests', data)}
              onBack={handleBack}
            />
          );
        default:
          return <WelcomeStep onBegin={handleWelcomePress} />;
      }
    } catch (err) {
      console.error('[renderStep] Error:', err);
      throw err;
    }
  };

  if (error) {
    return (
      <View style={styles.container} testID="onboarding-container">
        <Text style={styles.heading}>エラー: {error.message}</Text>
      </View>
    );
  }

  // Always render the current step, even before initialization completes
  // This prevents the component structure from changing dramatically
  return (
    <View style={styles.container} testID="onboarding-container">
      {renderStep()}
    </View>
  );
}
