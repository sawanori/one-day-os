/**
 * One Day OS - IdentityStep Component
 *
 * Third step of the onboarding flow.
 * User declares their identity statement.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../theme/theme';
import { styles } from '../onboarding.styles';

interface IdentityStepProps {
  onComplete: (data: { identity: string }) => void;
}

export function IdentityStep({ onComplete }: IdentityStepProps) {
  const { t } = useTranslation();
  const [identityText, setIdentityText] = useState('');
  const isValid = identityText.trim().length > 0;

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
      <Text style={styles.heading}>{t('onboarding.identity.heading')}</Text>

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>{t('onboarding.identity.explanationTitle')}</Text>
        <Text style={styles.explanationText}>
          {t('onboarding.identity.explanation')}
        </Text>
        <Text style={styles.exampleTitle}>{t('onboarding.identity.exampleTitle')}</Text>
        <Text style={styles.exampleText}>
          {t('onboarding.identity.example')}
        </Text>
      </View>

      <Text style={styles.prompt}>{t('onboarding.identity.prompt')}</Text>
      <View style={styles.identityContainer}>
        <Text style={styles.identityPrefix}>{t('onboarding.identity.placeholderTemplate')}</Text>
        <TextInput
          testID="identity-input"
          style={styles.textInput}
          placeholder={t('onboarding.identity.placeholder')}
          placeholderTextColor={theme.colors.foreground + '80'}
          value={identityText}
          onChangeText={setIdentityText}
        />
      </View>
          <Pressable
            testID="next-button"
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={() => isValid && onComplete({ identity: identityText })}
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
