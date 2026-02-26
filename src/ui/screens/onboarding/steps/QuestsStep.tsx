/**
 * One Day OS - QuestsStep Component
 *
 * Fifth and final step of the onboarding flow.
 * User sets two daily quests.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../theme/theme';
import { styles } from '../onboarding.styles';

interface QuestsStepProps {
  onComplete: (data: { quests: [string, string] }) => void;
}

export function QuestsStep({ onComplete }: QuestsStepProps) {
  const { t } = useTranslation();
  const [quest1Text, setQuest1Text] = useState('');
  const [quest2Text, setQuest2Text] = useState('');
  const isValid = quest1Text.trim().length > 0 && quest2Text.trim().length > 0;

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
          <Text style={styles.heading}>{t('onboarding.quests.heading')}</Text>

          {/* Explanation */}
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>{t('onboarding.quests.explanationTitle')}</Text>
            <Text style={styles.explanationText}>
              {t('onboarding.quests.explanation')}
            </Text>
            <Text style={styles.exampleTitle}>{t('onboarding.quests.exampleTitle')}</Text>
            <Text style={styles.exampleText}>
              {t('onboarding.quests.example')}
            </Text>
          </View>

          <Text style={styles.prompt}>{t('onboarding.quests.prompt')}</Text>
          <TextInput
            testID="quest1-input"
            style={styles.textInput}
            placeholder={t('onboarding.quests.placeholder1')}
            placeholderTextColor={theme.colors.foreground + '80'}
            value={quest1Text}
            onChangeText={setQuest1Text}
          />
          <TextInput
            testID="quest2-input"
            style={[styles.textInput, styles.textInputSpacing]}
            placeholder={t('onboarding.quests.placeholder2')}
            placeholderTextColor={theme.colors.foreground + '80'}
            value={quest2Text}
            onChangeText={setQuest2Text}
          />
          <Pressable
            testID="complete-button"
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={() => isValid && onComplete({ quests: [quest1Text, quest2Text] })}
            disabled={!isValid}
            accessibilityState={{ disabled: !isValid }}
          >
            <Text style={styles.buttonText}>{t('common.submit')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
