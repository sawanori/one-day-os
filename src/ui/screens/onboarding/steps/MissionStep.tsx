/**
 * One Day OS - MissionStep Component
 *
 * Fourth step of the onboarding flow.
 * User defines their one-year mission statement.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { theme } from '../../../theme/theme';
import { styles } from '../onboarding.styles';

interface MissionStepProps {
  onComplete: (data: { mission: string }) => void;
  onBack: () => void;
}

export function MissionStep({ onComplete, onBack }: MissionStepProps) {
  const [missionText, setMissionText] = useState('');
  const isValid = missionText.trim().length > 0;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.heading}>使命</Text>

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>これは何か:</Text>
        <Text style={styles.explanationText}>
          今から1年後に達成する目標。{'\n'}
          アンチビジョンから逃げるための具体的なゴール。
        </Text>
        <Text style={styles.exampleTitle}>例:</Text>
        <Text style={styles.exampleText}>
          「1年後、年収600万円のエンジニアになる」
        </Text>
      </View>

      <Text style={styles.prompt}>今年の最重要ミッションは？</Text>
      <TextInput
        testID="mission-input"
        style={styles.textInputMulti}
        placeholder="入力してください"
        placeholderTextColor={theme.colors.foreground + '80'}
        value={missionText}
        onChangeText={setMissionText}
        multiline
        numberOfLines={4}
      />
      <View style={styles.buttonRow}>
        <Pressable testID="back-button" style={styles.buttonSecondary} onPress={onBack}>
          <Text style={styles.buttonText}>戻る</Text>
        </Pressable>
        <Pressable
          testID="next-button"
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={() => isValid && onComplete({ mission: missionText })}
          disabled={!isValid}
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.buttonText}>次へ</Text>
        </Pressable>
      </View>
    </View>
  );
}
