/**
 * One Day OS - WelcomeStep Component
 *
 * First step of the onboarding flow.
 * Displays the ONE DAY OS title and introduction text.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styles } from '../onboarding.styles';

interface WelcomeStepProps {
  onBegin: () => void;
}

export function WelcomeStep({ onBegin }: WelcomeStepProps) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>ONE DAY OS</Text>
      <Text style={styles.heading}>ようこそ</Text>
      <Text style={styles.description}>
        あなたの人生を一日で再構築するシステム。最悪の未来を定義し、アイデンティティを宣言し、日々のクエストを実行せよ。
      </Text>
      <Pressable testID="begin-button" style={styles.button} onPress={onBegin}>
        <Text style={styles.buttonText}>開始</Text>
      </Pressable>
    </View>
  );
}
