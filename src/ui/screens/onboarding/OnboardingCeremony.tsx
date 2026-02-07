/**
 * One Day OS - OnboardingCeremony Component
 *
 * Orchestrates the 4-phase onboarding ceremony flow:
 * 1. CovenantPhase → 2. ExcavationPhase → 3. LensSyncPhase → 4. JudgmentPhase
 *
 * Features:
 * - Sequential phase progression (no skipping)
 * - Anti-vision text state management
 * - Harsh reset on Phase 4 failure (returns to Phase 1)
 * - Reset modal with red flash effect
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CovenantPhase } from './CovenantPhase';
import { ExcavationPhase } from './ExcavationPhase';
import { LensSyncPhase } from './LensSyncPhase';
import { JudgmentPhase } from './JudgmentPhase';
import { theme } from '../../theme/theme';

export interface OnboardingCeremonyProps {
  onCeremonyComplete: (antiVisionText: string) => void;
}

type CeremonyPhase = 'covenant' | 'excavation' | 'lens_sync' | 'judgment';

export function OnboardingCeremony({ onCeremonyComplete }: OnboardingCeremonyProps) {
  const [currentPhase, setCurrentPhase] = useState<CeremonyPhase>('covenant');
  const [antiVisionText, setAntiVisionText] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const resetFlashOpacity = useRef(new Animated.Value(0)).current;

  // Phase 1 completion handler
  const handleCovenantComplete = () => {
    setCurrentPhase('excavation');
  };

  // Phase 2 completion handler
  const handleExcavationComplete = (text: string) => {
    setAntiVisionText(text);
    setCurrentPhase('lens_sync');
  };

  // Phase 3 completion handler
  const handleLensSyncComplete = () => {
    setCurrentPhase('judgment');
  };

  // Phase 4 success handler
  const handleJudgmentComplete = () => {
    onCeremonyComplete(antiVisionText);
  };

  // Phase 4 failure handler - reset to Phase 1
  const handleJudgmentFail = () => {
    setShowResetModal(true);

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

    // Auto-dismiss modal and reset after 1.5 seconds
    setTimeout(() => {
      setShowResetModal(false);
      setCurrentPhase('covenant');
      setAntiVisionText(''); // Clear saved text
      resetFlashOpacity.setValue(0);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      {/* Phase Rendering */}
      {currentPhase === 'covenant' && <CovenantPhase onComplete={handleCovenantComplete} />}
      {currentPhase === 'excavation' && <ExcavationPhase onComplete={handleExcavationComplete} />}
      {currentPhase === 'lens_sync' && <LensSyncPhase onComplete={handleLensSyncComplete} />}
      {currentPhase === 'judgment' && (
        <JudgmentPhase onComplete={handleJudgmentComplete} onFail={handleJudgmentFail} />
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <Animated.View
          testID="reset-modal"
          style={[
            styles.resetModal,
            {
              opacity: resetFlashOpacity,
            },
          ]}
        >
          <Text style={styles.resetText}>最初からやり直せ</Text>
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
  resetModal: {
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
