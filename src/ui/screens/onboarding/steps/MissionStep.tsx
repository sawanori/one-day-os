/**
 * One Day OS - MissionStep Component
 *
 * Fourth step of the onboarding flow.
 * User defines their one-year mission statement.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../theme/theme';
import { styles } from '../onboarding.styles';

interface MissionStepProps {
  onComplete: (data: { mission: string }) => void;
}

export function MissionStep({ onComplete }: MissionStepProps) {
  const { t } = useTranslation();
  const [missionText, setMissionText] = useState('');
  const isValid = missionText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepContainer}>
      <Text style={styles.heading}>{t('onboarding.mission.heading')}</Text>

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>{t('onboarding.mission.explanationTitle')}</Text>
        <Text style={styles.explanationText}>
          {t('onboarding.mission.explanation')}
        </Text>
        <Text style={styles.exampleTitle}>{t('onboarding.mission.exampleTitle')}</Text>
        <Text style={styles.exampleText}>
          {t('onboarding.mission.example')}
        </Text>
      </View>

      <Text style={styles.prompt}>{t('onboarding.mission.prompt')}</Text>
      <TextInput
        testID="mission-input"
        style={styles.textInputMulti}
        placeholder={t('onboarding.mission.placeholder')}
        placeholderTextColor={theme.colors.foreground + '80'}
        value={missionText}
        onChangeText={setMissionText}
        multiline
        numberOfLines={4}
      />
          <Pressable
            testID="next-button"
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={() => isValid && onComplete({ mission: missionText })}
            disabled={!isValid}
            accessibilityState={{ disabled: !isValid }}
          >
            <Text style={styles.buttonText}>{t('common.next')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
