/**
 * One Day OS - LensSyncPhase Component
 *
 * Phase 3 of Onboarding Ceremony: Lens Synchronization
 *
 * A pinch-to-zoom challenge that requires:
 * - Pinch gesture to exactly 2.0x
 * - Real-time scale display
 * - Target circle visualization
 * - Glitch effect on failure (release before 2.0x)
 * - Haptic feedback on success/failure
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useLensGesture, LensZoom } from '../../lenses/useLensGesture';
import { HapticEngine } from '../../../core/HapticEngine';
import { GlitchText } from '../../effects/GlitchText';
import { theme } from '../../theme/theme';

export interface LensSyncPhaseProps {
  onComplete: () => void;
}

const TARGET_SCALE = 2.0;
const CIRCLE_RADIUS = 120;

export function LensSyncPhase({ onComplete }: LensSyncPhaseProps) {
  const [currentScale, setCurrentScale] = useState<number>(1.0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);

  const handleLensChange = async (lens: LensZoom) => {
    if (isSuccess) return;

    if (lens === TARGET_SCALE) {
      // Success: reached 2.0x
      setIsSuccess(true);
      await HapticEngine.snapLens();
      onComplete();
    } else {
      // Failure: released before reaching 2.0x
      await HapticEngine.punishFailure();
      setShowGlitch(true);

      // Hide glitch after 300ms
      setTimeout(() => {
        setShowGlitch(false);
      }, 300);
    }
  };

  const { panResponder, scale } = useLensGesture(handleLensChange);

  // Listen to scale changes for real-time display
  useEffect(() => {
    const listenerId = scale.addListener(({ value }) => {
      setCurrentScale(value);
    });

    return () => {
      scale.removeListener(listenerId);
    };
  }, [scale]);

  // Determine if target is reached
  const isTargetReached = currentScale >= TARGET_SCALE;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Instruction Text */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          ピンチで2.0xまで拡大せよ。中途半端は許されない。
        </Text>
      </View>

      {/* Target Circle with Scale Display */}
      <View style={styles.targetContainer}>
        {/* Target Circle */}
        <View
          testID="target-circle"
          style={[
            styles.targetCircle,
            {
              borderStyle: isTargetReached ? 'solid' : 'dashed',
              borderColor: isTargetReached ? theme.colors.accent : theme.colors.foreground,
            },
          ]}
        />

        {/* Scale Display */}
        <View style={styles.scaleDisplay}>
          {showGlitch ? (
            <GlitchText
              text={`${currentScale.toFixed(1)}x`}
              style={styles.scaleText}
              severity={1.0}
            />
          ) : (
            <Text style={styles.scaleText}>{`${currentScale.toFixed(1)}x`}</Text>
          )}
        </View>
      </View>

      {/* Glitch Overlay on Failure */}
      {showGlitch && <View style={styles.glitchOverlay} />}
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
  instructionContainer: {
    position: 'absolute',
    top: 80,
    paddingHorizontal: theme.spacing.lg,
  },
  instructionText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
  },
  targetContainer: {
    position: 'relative',
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetCircle: {
    position: 'absolute',
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    borderRadius: CIRCLE_RADIUS,
    borderWidth: 4,
  },
  scaleDisplay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: 64,
    fontWeight: theme.typography.fontWeight.bold,
  },
  glitchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.accent,
    opacity: 0.3,
  },
});
