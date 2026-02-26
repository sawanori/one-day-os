/**
 * One Day OS - LensSyncPhase Component
 *
 * Phase 3 of Onboarding Ceremony: Lens Synchronization
 *
 * A 5-phase guided tutorial that teaches users about the three lens focal lengths:
 * - MISSION (0.5x): 1-year vision
 * - IDENTITY (1.0x): Current self
 * - QUEST (2.0x): Today's actions
 *
 * Phase Flow:
 * 1. EXPLAIN_MISSION → tap to continue
 * 2. PINCH_TO_IDENTITY → pinch gesture 0.5x→1.0x
 * 3. EXPLAIN_IDENTITY → tap to continue
 * 4. PINCH_TO_QUEST → pinch gesture 1.0x→2.0x
 * 5. EXPLAIN_QUEST → auto-complete after 3s
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, PanResponder, GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { HapticEngine } from '../../../core/HapticEngine';
import { theme } from '../../theme/theme';
import { getDistanceFromEvent } from '../../../utils/touchUtils';

type LensPhase =
  | 'explain_mission'
  | 'pinch_to_identity'
  | 'explain_identity'
  | 'pinch_to_quest'
  | 'explain_quest';

const EXPLAIN_DELAY = 3000; // 3 seconds before tap is available
const CIRCLE_RADIUS = 100;

// Lens data for each focal length
const LENS_DATA = {
  mission: { scale: 0.5, i18nKey: 'mission' },
  identity: { scale: 1.0, i18nKey: 'identity' },
  quest: { scale: 2.0, i18nKey: 'quest' },
} as const;

export interface LensSyncPhaseProps {
  onComplete: () => void;
}

export function LensSyncPhase({ onComplete }: LensSyncPhaseProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<LensPhase>('explain_mission');
  const [displayScale, setDisplayScale] = useState(0.5);
  const [canTap, setCanTap] = useState(false);

  // Animation values
  const textOpacity = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintBlinkAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Pinch state
  const initialDistance = useRef(0);
  const baseScale = useRef(0.5);
  const currentScaleRef = useRef(0.5);
  const previousScaleRef = useRef(0.5);
  const isPinching = useRef(false);

  // Timer refs
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // CRITICAL: Phase ref for PanResponder closure fix
  const phaseRef = useRef<LensPhase>(phase);

  // Sync phase ref with state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Get current lens info based on phase
  const getCurrentLensKey = () => {
    const currentPhase = phaseRef.current;
    switch (currentPhase) {
      case 'explain_mission': return 'mission';
      case 'pinch_to_identity': return 'mission';
      case 'explain_identity': return 'identity';
      case 'pinch_to_quest': return 'identity';
      case 'explain_quest': return 'quest';
    }
  };

  const isExplainPhase = phase.startsWith('explain_');
  const isPinchPhase = phase.startsWith('pinch_');

  // Start explain phase animations
  useEffect(() => {
    if (!isExplainPhase) return;

    setCanTap(false);
    textOpacity.setValue(0);
    hintOpacity.setValue(0);

    // Fade in text
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // After delay, enable tap and start hint blink
    tapTimerRef.current = setTimeout(() => {
      if (phase === 'explain_quest') {
        // Auto-complete after delay
        completeTimerRef.current = setTimeout(() => {
          onComplete();
        }, EXPLAIN_DELAY);
        return;
      }

      setCanTap(true);

      // Start hint blink animation
      hintBlinkAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(hintOpacity, {
            toValue: 0.8,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(hintOpacity, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      hintBlinkAnim.current.start();
    }, EXPLAIN_DELAY);

    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
      hintBlinkAnim.current?.stop();
    };
  }, [phase, isExplainPhase, textOpacity, hintOpacity, onComplete]);

  // Handle tap on explain phases
  const handleTap = () => {
    if (!canTap || !isExplainPhase) return;

    hintBlinkAnim.current?.stop();

    const currentPhase = phaseRef.current;
    if (currentPhase === 'explain_mission') {
      setPhase('pinch_to_identity');
    } else if (currentPhase === 'explain_identity') {
      setPhase('pinch_to_quest');
    }
  };

  // Get scale range for current pinch phase (MUST use phaseRef for closure)
  const getScaleRange = () => {
    const currentPhase = phaseRef.current;
    if (currentPhase === 'pinch_to_identity') return { min: 0.5, max: 1.0, snapThreshold: 0.85 };
    if (currentPhase === 'pinch_to_quest') return { min: 1.0, max: 2.0, snapThreshold: 1.7 };
    return { min: 0.5, max: 2.0, snapThreshold: 1.0 };
  };

  // PanResponder for pinch phases
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        return (event.nativeEvent.touches?.length ?? 0) >= 2;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.numberActiveTouches >= 2;
      },
      onPanResponderGrant: (event) => {
        const distance = getDistanceFromEvent(event);
        if (distance !== null) {
          initialDistance.current = distance;
          baseScale.current = currentScaleRef.current;
          isPinching.current = true;
        }
      },
      onPanResponderMove: (event) => {
        if (!isPinching.current) return;
        const currentDistance = getDistanceFromEvent(event);
        if (currentDistance === null || initialDistance.current === 0) return;

        const ratio = currentDistance / initialDistance.current;
        const { min, max } = getScaleRange();
        const newScale = Math.max(min, Math.min(baseScale.current * ratio, max));

        // Haptic feedback on 0.1x changes
        const delta = Math.abs(newScale - previousScaleRef.current);
        if (delta >= 0.1) {
          HapticEngine.lensApertureClick();
          previousScaleRef.current = newScale;
        }

        currentScaleRef.current = newScale;
        setDisplayScale(newScale);
      },
      onPanResponderRelease: () => {
        if (!isPinching.current) return;
        isPinching.current = false;

        const finalScale = currentScaleRef.current;
        const { min, snapThreshold } = getScaleRange();
        const currentPhase = phaseRef.current;

        if (finalScale >= snapThreshold) {
          // Success: snap to target
          const target = currentPhase === 'pinch_to_identity' ? 1.0 : 2.0;
          HapticEngine.boundarySnap();
          currentScaleRef.current = target;
          previousScaleRef.current = target;
          setDisplayScale(target);

          // Transition to next explain phase
          if (currentPhase === 'pinch_to_identity') {
            setPhase('explain_identity');
          } else if (currentPhase === 'pinch_to_quest') {
            setPhase('explain_quest');
          }
        } else {
          // Fail: snap back to min
          currentScaleRef.current = min;
          previousScaleRef.current = min;
          setDisplayScale(min);
          HapticEngine.punishFailure();
        }

        initialDistance.current = 0;
      },
    })
  ).current;

  const lensKey = getCurrentLensKey();

  // Circle border style based on phase
  const circleBorderColor = isPinchPhase ? theme.colors.foreground : theme.colors.accent;
  const circleBorderStyle = isPinchPhase ? 'dashed' : 'solid';

  return (
    <View style={styles.container} {...(isPinchPhase ? panResponder.panHandlers : {})}>
      {/* Scale Display Circle */}
      <View style={styles.circleContainer}>
        <View
          testID="target-circle"
          style={[
            styles.circle,
            { borderColor: circleBorderColor, borderStyle: circleBorderStyle },
          ]}
        >
          <Text style={styles.scaleText}>{displayScale.toFixed(1)}x</Text>
        </View>
      </View>

      {/* Lens Label */}
      <Animated.View style={[styles.labelContainer, { opacity: isExplainPhase ? textOpacity : 1 }]}>
        <Text style={styles.labelText}>
          {t(`ceremony.lensSync.${lensKey}.label`)}
        </Text>
      </Animated.View>

      {/* Explanation Text (explain phases only) */}
      {isExplainPhase && (
        <Animated.View style={[styles.descriptionContainer, { opacity: textOpacity }]}>
          <Text style={styles.descriptionText}>
            {t(`ceremony.lensSync.${lensKey}.description`)}
          </Text>
        </Animated.View>
      )}

      {/* Tap to continue hint (explain phases, after delay) */}
      {isExplainPhase && phase !== 'explain_quest' && (
        <Pressable onPress={handleTap} style={styles.tapArea}>
          <Animated.View style={[styles.hintContainer, { opacity: hintOpacity }]}>
            <View style={styles.hintLine} />
            <Text style={styles.hintText}>{t('ceremony.lensSync.tapToContinue')}</Text>
            <View style={styles.hintLine} />
          </Animated.View>
        </Pressable>
      )}

      {/* Pinch hint (pinch phases) */}
      {isPinchPhase && (
        <View style={styles.pinchHintContainer}>
          <Text style={styles.pinchHintText}>{t('ceremony.lensSync.pinchHint')}</Text>
        </View>
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
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    borderRadius: CIRCLE_RADIUS,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: 64,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
  },
  labelContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  labelText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
  },
  descriptionContainer: {
    marginTop: 16,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  descriptionText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    lineHeight: theme.typography.fontSize.body * theme.typography.lineHeight.relaxed,
    textAlign: 'center',
  },
  tapArea: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 20, // Larger tap area
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  pinchHintContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  pinchHintText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    letterSpacing: 6,
    textAlign: 'center',
  },
});
