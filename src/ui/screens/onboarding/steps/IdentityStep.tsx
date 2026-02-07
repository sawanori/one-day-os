/**
 * One Day OS - IdentityStep Component
 *
 * Third step of the onboarding flow.
 * User declares their identity statement.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { theme } from '../../../theme/theme';
import { styles } from '../onboarding.styles';

interface IdentityStepProps {
  onComplete: (data: { identity: string }) => void;
  onBack: () => void;
}

export function IdentityStep({ onComplete, onBack }: IdentityStepProps) {
  const [identityText, setIdentityText] = useState('');
  const isValid = identityText.trim().length > 0;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.heading}>アイデンティティ</Text>

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>これは何か:</Text>
        <Text style={styles.explanationText}>
          あなたが何者であるかの宣言。{'\n'}
          この宣言に従って行動し続けることがIHを維持する鍵。
        </Text>
        <Text style={styles.exampleTitle}>例:</Text>
        <Text style={styles.exampleText}>
          「私は毎日成長し続ける人間だ」
        </Text>
      </View>

      <Text style={styles.prompt}>あなたはどんな人間ですか？</Text>
      <View style={styles.identityContainer}>
        <Text style={styles.identityPrefix}>私は〜な人間だ</Text>
        <TextInput
          testID="identity-input"
          style={styles.textInput}
          placeholder="入力してください"
          placeholderTextColor={theme.colors.foreground + '80'}
          value={identityText}
          onChangeText={setIdentityText}
        />
      </View>
      <View style={styles.buttonRow}>
        <Pressable testID="back-button" style={styles.buttonSecondary} onPress={onBack}>
          <Text style={styles.buttonText}>戻る</Text>
        </Pressable>
        <Pressable
          testID="next-button"
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={() => isValid && onComplete({ identity: identityText })}
          disabled={!isValid}
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.buttonText}>次へ</Text>
        </Pressable>
      </View>
    </View>
  );
}
