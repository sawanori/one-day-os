/**
 * One Day OS - ExcavationPhase Component
 *
 * Phase 2 of Onboarding Ceremony: Forced Excavation (強制発掘)
 *
 * Features:
 * - Multi-line text input (minimum 3 lines required)
 * - 10-second timeout mechanism with IH penalty
 * - Red flash effect on timeout
 * - Haptic feedback on timeout
 * - Brutalist design (black background, white/red accents)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { GlitchText } from '../../effects/GlitchText';
import { HapticEngine } from '../../../core/HapticEngine';
import { IdentityEngine } from '../../../core/identity/IdentityEngine';

export interface ExcavationPhaseProps {
  onComplete: (antiVisionText: string) => void;
}

const TIMEOUT_DURATION = 10000; // 10 seconds
const FLASH_DURATION = 500; // 500ms red flash

export function ExcavationPhase({ onComplete }: ExcavationPhaseProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [currentIH, setCurrentIH] = useState<number>(100);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // Calculate if input is valid (3 or more non-empty lines)
  const isValidInput = () => {
    const lines = inputText.split('\n').filter((line) => line.trim().length > 0);
    return lines.length >= 3;
  };

  // Handle timeout penalty
  const applyTimeoutPenalty = async () => {
    try {
      const engine = await IdentityEngine.getInstance();
      await engine.applyOnboardingStagnationPenalty();

      // Update IH display
      const updatedIH = await engine.getCurrentIH();
      setCurrentIH(updatedIH);

      // Trigger haptic feedback
      await HapticEngine.punishFailure();

      // Show red flash effect
      triggerFlashEffect();

      // Show warning message
      setShowWarning(true);

      // Reset timeout to allow for repeated penalties
      resetTimeout();
    } catch (error) {
      console.error('Failed to apply timeout penalty:', error);
    }
  };

  // Trigger red flash animation
  const triggerFlashEffect = () => {
    setShowFlash(true);

    // Fade in quickly
    Animated.timing(flashOpacity, {
      toValue: 0.7,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      // Fade out
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowFlash(false);
        flashOpacity.setValue(0);
      });
    });
  };

  // Reset timeout when user types
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      applyTimeoutPenalty();
    }, TIMEOUT_DURATION);
  };

  // Handle text input change
  const handleTextChange = (text: string) => {
    setInputText(text);
    setShowWarning(false); // Clear warning on new input
    resetTimeout();
  };

  // Handle submit
  const handleSubmit = () => {
    if (!isValidInput()) {
      return;
    }

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Call completion callback
    onComplete(inputText);
  };

  // Load current IH on mount
  useEffect(() => {
    const loadIH = async () => {
      try {
        const engine = await IdentityEngine.getInstance();
        const ih = await engine.getCurrentIH();
        setCurrentIH(ih);
      } catch (error) {
        console.error('Failed to load IH:', error);
      }
    };
    loadIH();
  }, []);

  // Initialize timeout on mount
  useEffect(() => {
    resetTimeout();

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Red Flash Overlay - absolute positioned, stays outside ScrollView */}
      {showFlash && (
        <Animated.View
          testID="flash-overlay"
          style={[
            styles.flashOverlay,
            {
              opacity: flashOpacity,
            },
          ]}
        />
      )}

      {/* IH Display - absolute positioned, stays outside ScrollView */}
      <View style={styles.ihContainer}>
        <Text style={[
          styles.ihText,
          currentIH < 80 && { color: theme.colors.accent }
        ]}>
          IH: {currentIH}%
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <GlitchText
              text={t('ceremony.excavation.title')}
              style={styles.title}
              severity={showWarning ? 0.5 : 0}
            />
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{t('ceremony.excavation.instruction')}</Text>

          {/* Text Input */}
          <TextInput
            testID="anti-vision-input"
            style={styles.textInput}
            multiline
            numberOfLines={10}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder={t('ceremony.excavation.placeholder')}
            placeholderTextColor={theme.colors.warning}
            cursorColor={theme.colors.accent}
            autoFocus
          />

          {/* Warning Message */}
          {showWarning && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>{t('ceremony.excavation.warning')}</Text>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            testID="submit-button"
            style={[
              styles.submitButton,
              !isValidInput() && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isValidInput()}
          >
            <Text
              style={[
                styles.submitButtonText,
                !isValidInput() && styles.submitButtonTextDisabled,
              ]}
            >
              {t('ceremony.excavation.submit')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.accent,
    zIndex: 1000,
  },
  ihContainer: {
    position: 'absolute',
    top: 40,
    right: theme.spacing.lg,
    zIndex: 1001,
  },
  ihText: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
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
    marginBottom: theme.spacing.xl,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    padding: theme.spacing.md,
    minHeight: 200,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.lg,
  },
  warningContainer: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.accent,
  },
  warningText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.foreground,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.foreground,
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.background,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
  },
  submitButtonTextDisabled: {
    color: theme.colors.foreground,
  },
});
