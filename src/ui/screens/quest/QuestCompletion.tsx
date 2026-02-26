/**
 * QuestCompletion Component
 *
 * Quest Completion v4 Ultra
 * - Instant 0.1s clear animation to black Identity screen
 * - Random doubt question (Japanese, harsh tone)
 * - Silent IH recovery (+1% to +3%, no display)
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import i18n from 'i18next';
import { ThemedText } from '../../components/ThemedText';
import { theme } from '../../theme/theme';

export interface QuestCompletionProps {
  onIHRecover: (amount: number) => void; // Silent IH recovery callback (+1% to +3%)
  onNavigateBack: () => void; // Navigate back to Identity screen after 0.1s
}

/**
 * Get doubt questions dynamically using i18n
 */
const getDoubtQuestions = (): string[] => [
  i18n.t('quest.completion.doubt1'),
  i18n.t('quest.completion.doubt2'),
  i18n.t('quest.completion.doubt3'),
  i18n.t('quest.completion.doubt4'),
  i18n.t('quest.completion.doubt5'),
];

const CLEAR_ANIMATION_MS = 100; // 0.1 seconds
const MIN_RECOVERY = 1; // +1%
const MAX_RECOVERY = 3; // +3%

/**
 * Generate random IH recovery amount (+1% to +3%)
 */
const generateRecoveryAmount = (): number => {
  return Math.floor(Math.random() * (MAX_RECOVERY - MIN_RECOVERY + 1)) + MIN_RECOVERY;
};

/**
 * Select random doubt question
 */
const selectDoubtQuestion = (): string => {
  const questions = getDoubtQuestions();
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
};

export const QuestCompletion: React.FC<QuestCompletionProps> = ({
  onIHRecover,
  onNavigateBack,
}) => {
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // H10: Wrap callbacks in refs to avoid dependency changes causing re-runs
  const onIHRecoverRef = useRef(onIHRecover);
  onIHRecoverRef.current = onIHRecover;
  const onNavigateBackRef = useRef(onNavigateBack);
  onNavigateBackRef.current = onNavigateBack;

  // Select doubt question on mount (once)
  const doubtQuestion = useRef(selectDoubtQuestion()).current;

  useEffect(() => {
    // 1. Silent IH recovery (immediate, no display)
    const recoveryAmount = generateRecoveryAmount();
    onIHRecoverRef.current(recoveryAmount);

    // 2. Navigate back to Identity screen after 0.1s
    navigationTimeoutRef.current = setTimeout(() => {
      onNavigateBackRef.current();
    }, CLEAR_ANIMATION_MS);

    // Cleanup on unmount
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []); // No deps needed - refs always have latest values

  return (
    <View style={styles.container} testID="completion-container">
      {/* Random doubt question - displayed briefly before navigation */}
      <ThemedText style={styles.doubtText} testID="doubt-question">
        {doubtQuestion}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Pure black
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  doubtText: {
    color: theme.colors.foreground, // Pure white
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.body,
  },
});
