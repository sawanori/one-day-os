/**
 * One Day OS - AntiVisionStep Component
 *
 * Second step of the onboarding flow.
 * User defines their worst possible future (anti-vision).
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { theme } from '../../../theme/theme';
import { styles } from '../onboarding.styles';

interface AntiVisionStepProps {
  onComplete: (data: { antiVision: string }) => void;
  onBack: () => void;
}

export function AntiVisionStep({ onComplete, onBack }: AntiVisionStepProps) {
  const [antiVisionText, setAntiVisionText] = useState('');
  const isValid = antiVisionText.trim().length > 0;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.heading}>アンチビジョン</Text>

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>これは何か:</Text>
        <Text style={styles.explanationText}>
          あなたが絶対に避けたい最悪の未来。{'\n'}
          これを明確化することで、逃げられない現実を作る。
        </Text>
        <Text style={styles.exampleTitle}>例:</Text>
        <Text style={styles.exampleText}>
          「40歳で貯金ゼロ、無職、孤独死」
        </Text>
      </View>

      <Text style={styles.prompt}>5年後の最悪の火曜日を想像してください</Text>
      <TextInput
        testID="anti-vision-input"
        style={styles.textInputMulti}
        placeholder="入力してください"
        placeholderTextColor={theme.colors.foreground + '80'}
        value={antiVisionText}
        onChangeText={setAntiVisionText}
        multiline
        numberOfLines={6}
      />
      <View style={styles.buttonRow}>
        <Pressable testID="back-button" style={styles.buttonSecondary} onPress={onBack}>
          <Text style={styles.buttonText}>戻る</Text>
        </Pressable>
        <Pressable
          testID="next-button"
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={() => isValid && onComplete({ antiVision: antiVisionText })}
          disabled={!isValid}
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.buttonText}>次へ</Text>
        </Pressable>
      </View>
    </View>
  );
}
