/**
 * GapInterrogation Component
 *
 * Quest Interrogation "The Gap" (断絶の宣告)
 * Forces user to confront the gap between identity and previous weak action
 * Rejects vague or similar responses with harsh "Invalid" judgment
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { GlitchText } from '../../effects/GlitchText';
import { ThemedText } from '../../components/ThemedText';
import { theme } from '../../theme/theme';
import { HapticEngine } from '../../../core/HapticEngine';

export interface GapInterrogationProps {
  identityStatement: string; // "I am a person who..."
  previousAction: string; // Mirror で入力した行動
  onComplete: (painfulAction: string) => void;
  onInvalid: () => void; // Invalid時のコールバック（IH -10%）
}

const MIN_ACTION_LENGTH = 20; // Minimum 20 characters
const SIMILARITY_THRESHOLD = 0.7; // 70% similarity rejection threshold

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  // Calculate Levenshtein distance
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
};

/**
 * Check if text contains only vague expressions
 */
const isVagueExpression = (text: string): boolean => {
  const vaguePatterns = [
    /^[^頑張やす]*頑張[^頑張やす]*$/,  // Only contains "頑張る"
    /^[^やす]*やる[^やす]*$/,        // Only contains "やる"
    /^[^す]*する[^す]*$/,            // Only contains "する"
  ];

  return vaguePatterns.some(pattern => pattern.test(text));
};

export const GapInterrogation: React.FC<GapInterrogationProps> = ({
  identityStatement,
  previousAction,
  onComplete,
  onInvalid,
}) => {
  const [actionText, setActionText] = useState('');
  const [showInvalid, setShowInvalid] = useState(false);

  // Validate input and determine if it's acceptable
  const isInvalid = (text: string): boolean => {
    // Too short
    if (text.length < MIN_ACTION_LENGTH) {
      return true;
    }

    // Too similar to previous action
    const similarity = calculateSimilarity(text, previousAction);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return true;
    }

    // Contains only vague expressions
    if (isVagueExpression(text)) {
      return true;
    }

    return false;
  };

  // Handle submit
  const handleSubmit = () => {
    if (isInvalid(actionText)) {
      // Show "Invalid" judgment
      setShowInvalid(true);

      // Trigger punishment haptic
      HapticEngine.punishFailure();

      // Call Invalid callback (IH penalty)
      onInvalid();

      // Clear input to force re-entry
      setActionText('');

      // Hide Invalid text after 2 seconds
      setTimeout(() => {
        setShowInvalid(false);
      }, 2000);
    } else {
      // Valid input - proceed
      onComplete(actionText);
    }
  };

  return (
    <View style={styles.container}>
      {/* Identity statement */}
      <View style={styles.identityContainer}>
        <ThemedText style={styles.identityText}>
          {identityStatement}
        </ThemedText>
      </View>

      {/* Previous action with strikethrough */}
      <View style={styles.previousActionContainer}>
        <ThemedText style={styles.previousActionText}>
          {previousAction}
        </ThemedText>
      </View>

      {/* Interrogation question */}
      <ThemedText style={styles.questionText}>
        もっと『痛み』を伴う、逃げられない具体的行動を再提示せよ
      </ThemedText>

      {/* Invalid message with glitch effect */}
      {showInvalid && (
        <View style={styles.invalidContainer}>
          <GlitchText
            text="Invalid"
            style={styles.invalidText}
            severity={1.0}
            health={0}
          />
        </View>
      )}

      {/* Input field */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={actionText}
          onChangeText={setActionText}
          placeholder="痛みを伴う行動を入力..."
          placeholderTextColor={theme.colors.ih.low}
          multiline
          textAlignVertical="top"
          testID="action-input"
        />
      </View>

      {/* Submit button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        testID="submit-button"
      >
        <ThemedText style={styles.buttonText}>提示</ThemedText>
      </TouchableOpacity>
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
  identityContainer: {
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  identityText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
  },
  previousActionContainer: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  previousActionText: {
    color: theme.colors.ih.low, // Gray
    fontSize: theme.typography.fontSize.body,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    textDecorationLine: 'line-through', // Strikethrough
  },
  questionText: {
    color: theme.colors.foreground,
    fontSize: theme.typography.fontSize.body,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontFamily: theme.typography.fontFamily,
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.body,
  },
  invalidContainer: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  invalidText: {
    color: theme.colors.accent, // Red
    fontSize: theme.typography.fontSize.heading * 1.5,
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    minHeight: 120,
  },
  input: {
    color: theme.colors.foreground,
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    minHeight: 100,
  },
  button: {
    backgroundColor: theme.colors.foreground,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.borderRadius.none,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily,
  },
});
