/**
 * One Day OS - OnboardingFlow Component
 *
 * 5-step onboarding flow with Brutalist design:
 * 1. Welcome - Introduction to One Day OS
 * 2. Anti-Vision - Define the worst possible future
 * 3. Identity - Who are you? ("I am a person who...")
 * 4. Mission - One year mission statement
 * 5. Quests - Two daily quests
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingManager, OnboardingStep } from '../../../core/onboarding/OnboardingManager';
import { updateAppState } from '../../../database/client';
import { theme } from '../../theme/theme';

export function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [manager, setManager] = useState<OnboardingManager | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Input states for each step
  const [antiVisionText, setAntiVisionText] = useState('');
  const [identityText, setIdentityText] = useState('');
  const [missionText, setMissionText] = useState('');
  const [quest1Text, setQuest1Text] = useState('');
  const [quest2Text, setQuest2Text] = useState('');

  // Initialize manager and load current step
  useEffect(() => {
    let mounted = true;

    const initManager = async () => {
      try {
        const mgr = await OnboardingManager.getInstance();
        if (!mounted) {
          return;
        }

        setManager(mgr);

        const step = await mgr.getCurrentStep();
        if (!mounted) {
          return;
        }

        setCurrentStep(step);

        const isComplete = await mgr.isOnboardingComplete();
        if (!mounted) {
          return;
        }

        if (isComplete) {
          // Navigate to main app (handled by router mock in tests)
          try {
            router.replace('/');
          } catch (routerError) {
            console.error('Router error:', routerError);
          }
        }
        setIsInitialized(true);
      } catch (err) {
        console.error('Error initializing manager:', err);
        if (mounted) {
          setError(err as Error);
        }
      }
    };

    initManager();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle step completion
  const handleCompleteStep = async (step: OnboardingStep, data: any) => {
    if (!manager) return;

    try {
      await manager.completeStep(step, data);
      const nextStep = await manager.getCurrentStep();
      setCurrentStep(nextStep);

      const isComplete = await manager.isOnboardingComplete();
      if (isComplete) {
        // Update app state to 'active' before navigating
        try {
          await updateAppState('active');
        } catch (error) {
          console.error('Failed to update app state:', error);
          // Continue with navigation even if app_state update fails
          // On next app start, isOnboardingComplete() will be true
          // and user will be redirected to main app automatically
        }
        router.replace('/');
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Button handler for welcome step
  const handleWelcomePress = () => {
    if (manager) {
      handleCompleteStep('welcome', null);
    }
  };

  // Render functions for each step
  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>ONE DAY OS</Text>
      <Text style={styles.heading}>ようこそ</Text>
      <Text style={styles.description}>
        あなたの人生を一日で再構築するシステム。最悪の未来を定義し、アイデンティティを宣言し、日々のクエストを実行せよ。
      </Text>
      <Pressable testID="begin-button" style={styles.button} onPress={handleWelcomePress}>
        <Text style={styles.buttonText}>開始</Text>
      </Pressable>
    </View>
  );

  const renderAntiVision = () => {
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
          <Pressable testID="back-button" style={styles.buttonSecondary} onPress={handleBack}>
            <Text style={styles.buttonText}>戻る</Text>
          </Pressable>
          <Pressable
            testID="next-button"
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={() => isValid && handleCompleteStep('anti-vision', { antiVision: antiVisionText })}
            disabled={!isValid}
            accessibilityState={{ disabled: !isValid }}
          >
            <Text style={styles.buttonText}>次へ</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderIdentity = () => {
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
          <Pressable testID="back-button" style={styles.buttonSecondary} onPress={handleBack}>
            <Text style={styles.buttonText}>戻る</Text>
          </Pressable>
          <Pressable
            testID="next-button"
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={() => isValid && handleCompleteStep('identity', { identity: identityText })}
            disabled={!isValid}
            accessibilityState={{ disabled: !isValid }}
          >
            <Text style={styles.buttonText}>次へ</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderMission = () => {
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
          <Pressable testID="back-button" style={styles.buttonSecondary} onPress={handleBack}>
            <Text style={styles.buttonText}>戻る</Text>
          </Pressable>
          <Pressable
            testID="next-button"
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={() => isValid && handleCompleteStep('mission', { mission: missionText })}
            disabled={!isValid}
            accessibilityState={{ disabled: !isValid }}
          >
            <Text style={styles.buttonText}>次へ</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderQuests = () => {
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
          <Pressable testID="back-button" style={styles.buttonSecondary} onPress={handleBack}>
            <Text style={styles.buttonText}>戻る</Text>
          </Pressable>
          <Pressable
            testID="complete-button"
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={() => isValid && handleCompleteStep('quests', { quests: [quest1Text, quest2Text] })}
            disabled={!isValid}
            accessibilityState={{ disabled: !isValid }}
          >
            <Text style={styles.buttonText}>完了</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render current step
  const renderStep = () => {
    try {
      switch (currentStep) {
        case 'welcome':
          return renderWelcome();
        case 'anti-vision':
          return renderAntiVision();
        case 'identity':
          return renderIdentity();
        case 'mission':
          return renderMission();
        case 'quests':
          return renderQuests();
        default:
          return renderWelcome();
      }
    } catch (err) {
      console.error('[renderStep] Error:', err);
      throw err;
    }
  };

  if (error) {
    return (
      <View style={styles.container} testID="onboarding-container">
        <Text style={styles.heading}>エラー: {error.message}</Text>
      </View>
    );
  }

  // Always render the current step, even before initialization completes
  // This prevents the component structure from changing dramatically
  return (
    <View style={styles.container} testID="onboarding-container">
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  stepContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize.title,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  heading: {
    fontSize: theme.typography.fontSize.heading,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  description: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    lineHeight: theme.typography.fontSize.body * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.xl,
  },
  prompt: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
  },
  identityContainer: {
    marginBottom: theme.spacing.lg,
  },
  identityPrefix: {
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: 0,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  textInputMulti: {
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: 0,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  textInputSpacing: {
    marginTop: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: 0,
    padding: theme.spacing.md,
    alignItems: 'center',
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: 0,
    padding: theme.spacing.md,
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  explanationBox: {
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  explanationTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  explanationText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    lineHeight: theme.typography.fontSize.caption * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.md,
  },
  exampleTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  exampleText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.accent,
    lineHeight: theme.typography.fontSize.caption * theme.typography.lineHeight.relaxed,
  },
});
