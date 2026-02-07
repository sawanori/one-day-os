/**
 * One Day OS - QuestsStep Component
 *
 * Fifth and final step of the onboarding flow.
 * User sets two daily quests.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { theme } from '../../../theme/theme';
import { styles } from '../onboarding.styles';

interface QuestsStepProps {
  onComplete: (data: { quests: string[] }) => void;
  onBack: () => void;
}

export function QuestsStep({ onComplete, onBack }: QuestsStepProps) {
  const [quest1Text, setQuest1Text] = useState('');
  const [quest2Text, setQuest2Text] = useState('');
  const isValid = quest1Text.trim().length > 0 && quest2Text.trim().length > 0;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.heading}>クエスト</Text>

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>これは何か:</Text>
        <Text style={styles.explanationText}>
          今日一日で達成すべき具体的なタスク。{'\n'}
          2つのクエストを設定してください。
        </Text>
        <Text style={styles.exampleTitle}>例:</Text>
        <Text style={styles.exampleText}>
          「朝6時に起きる」{'\n'}
          「コーディング3時間」
        </Text>
      </View>

      <Text style={styles.prompt}>毎日達成するクエストを2つ設定</Text>
      <TextInput
        testID="quest1-input"
        style={styles.textInput}
        placeholder="クエスト1"
        placeholderTextColor={theme.colors.foreground + '80'}
        value={quest1Text}
        onChangeText={setQuest1Text}
      />
      <TextInput
        testID="quest2-input"
        style={[styles.textInput, styles.textInputSpacing]}
        placeholder="クエスト2"
        placeholderTextColor={theme.colors.foreground + '80'}
        value={quest2Text}
        onChangeText={setQuest2Text}
      />
      <View style={styles.buttonRow}>
        <Pressable testID="back-button" style={styles.buttonSecondary} onPress={onBack}>
          <Text style={styles.buttonText}>戻る</Text>
        </Pressable>
        <Pressable
          testID="complete-button"
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={() => isValid && onComplete({ quests: [quest1Text, quest2Text] })}
          disabled={!isValid}
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.buttonText}>完了</Text>
        </Pressable>
      </View>
    </View>
  );
}
