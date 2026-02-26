/**
 * MirrorInterrogation Component
 *
 * Quest Interrogation "The Mirror" (鏡の試練)
 * Forces user to confront their anti-vision and commit to killing an old habit
 * IH drains -2%/sec when typing stops for 5 seconds
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlitchText } from '../../effects/GlitchText';
import { ThemedText } from '../../components/ThemedText';
import { theme } from '../../theme/theme';
import { HapticEngine } from '../../../core/HapticEngine';

export interface MirrorInterrogationProps {
  antiVision: string; // Anti-vision from onboarding
  onComplete: (habitToKill: string) => void;
  onHealthDrain: (amount: number) => void; // IH drain callback
}

const TYPING_TIMEOUT_MS = 5000; // 5 seconds
const DRAIN_INTERVAL_MS = 1000; // 1 second
const DRAIN_AMOUNT = 2; // -2% per second
const MIN_HABIT_LENGTH = 10; // Minimum 10 characters

export const MirrorInterrogation: React.FC<MirrorInterrogationProps> = ({
  antiVision,
  onComplete,
  onHealthDrain,
}) => {
  const { t } = useTranslation();
  const [habitText, setHabitText] = useState('');
  const [isDraining, setIsDraining] = useState(false);

  // Refs for timeout and interval management
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const drainIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timers
  const clearAllTimers = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
  };

  // Start IH drain
  const startDrain = () => {
    if (drainIntervalRef.current) return; // Already draining

    setIsDraining(true);

    // Drain immediately
    onHealthDrain(DRAIN_AMOUNT);
    HapticEngine.punishFailure();

    // Continue draining every second
    drainIntervalRef.current = setInterval(() => {
      onHealthDrain(DRAIN_AMOUNT);
      HapticEngine.punishFailure();
    }, DRAIN_INTERVAL_MS);
  };

  // Stop IH drain
  const stopDrain = () => {
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
    setIsDraining(false);
  };

  // Handle text input change
  const handleTextChange = (text: string) => {
    setHabitText(text);

    // Stop current drain
    stopDrain();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start new timeout
    typingTimeoutRef.current = setTimeout(() => {
      startDrain();
    }, TYPING_TIMEOUT_MS);
  };

  // Handle submit
  const handleSubmit = () => {
    if (habitText.length >= MIN_HABIT_LENGTH) {
      clearAllTimers();
      onComplete(habitText);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const isSubmitEnabled = habitText.length >= MIN_HABIT_LENGTH;

  return (
    <View style={styles.container}>
      {/* Anti-vision display with intense glitch */}
      <View style={styles.antiVisionContainer}>
        <GlitchText
          text={antiVision}
          style={styles.antiVisionText}
          severity={1.0}
          health={0}
        />
      </View>

      {/* Interrogation question */}
      <ThemedText style={styles.questionText}>
        {t('quest.mirror.question')}
      </ThemedText>

      {/* Input field with flash effect when draining */}
      <View style={[styles.inputContainer, isDraining && styles.inputDraining]}>
        <TextInput
          style={styles.input}
          value={habitText}
          onChangeText={handleTextChange}
          placeholder={t('quest.mirror.placeholder')}
          placeholderTextColor={theme.colors.ih.low}
          multiline
          textAlignVertical="top"
          testID="habit-input"
        />
      </View>

      {/* Character count indicator */}
      <ThemedText
        style={[
          styles.charCount,
          habitText.length >= MIN_HABIT_LENGTH && styles.charCountValid,
        ]}
      >
        {habitText.length} / {MIN_HABIT_LENGTH}
      </ThemedText>

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.button, !isSubmitEnabled && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!isSubmitEnabled}
        accessibilityState={{ disabled: !isSubmitEnabled }}
        testID="submit-button"
      >
        <ThemedText style={styles.buttonText}>{t('quest.mirror.submit')}</ThemedText>
      </TouchableOpacity>

      {/* Warning text if draining */}
      {isDraining && (
        <ThemedText style={styles.warningText}>
          Identity Health -2%/秒
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  antiVisionContainer: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  antiVisionText: {
    color: theme.colors.accent, // Red
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
  },
  questionText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.fontSize.body,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontFamily: theme.typography.fontFamily,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.body,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    minHeight: 120,
  },
  inputDraining: {
    borderColor: theme.colors.accent, // Red flash when draining
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  input: {
    color: theme.colors.foreground,
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    minHeight: 100,
  },
  charCount: {
    color: theme.colors.ih.low,
    fontSize: theme.typography.fontSize.caption,
    textAlign: 'right',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily,
  },
  charCountValid: {
    color: theme.colors.ih.high, // Green when valid
  },
  button: {
    backgroundColor: theme.colors.foreground,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.borderRadius.none,
    marginBottom: theme.spacing.md,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.ih.low,
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily,
  },
  warningText: {
    color: theme.colors.accent,
    fontSize: theme.typography.fontSize.body,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.bold,
  },
});
