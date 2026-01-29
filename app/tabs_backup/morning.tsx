/**
 * One Day OS - Morning Layer
 * Anti-Vision Display & Rejection Interface
 */

import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { theme } from '../../src/ui/theme/theme';
import { PhaseGuard } from '../../src/ui/components/PhaseGuard';
import { GlitchText } from '../../src/ui/components/GlitchText';
import { OnboardingManager } from '../../src/core/onboarding/OnboardingManager';
import { IdentityEngine } from '../../src/core/identity/IdentityEngine';

export default function MorningScreen() {
  const [antiVision, setAntiVision] = useState<string>('');
  const [quests, setQuests] = useState<[string, string]>(['', '']);
  const [currentIH, setCurrentIH] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadData = async () => {
        try {
          const manager = await OnboardingManager.getInstance();
          const engine = await IdentityEngine.getInstance();

          if (!isMounted) return;

          const antiVisionData = await manager.getAntiVision();
          const questsData = await manager.getQuests();
          const ihData = await engine.getCurrentIH();

          setAntiVision(antiVisionData || '');
          setQuests(questsData || ['', '']);
          setCurrentIH(ihData);
        } catch (error) {
          console.error('Error loading morning layer data:', error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      loadData();

      return () => {
        isMounted = false;
      };
    }, [])
  );
  return (
    <PhaseGuard phase="MORNING">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>モーニングレイヤー</Text>
          <Text style={styles.subheaderText}>アンチビジョン表示</Text>
        </View>

        {/* Explanatory Text */}
        <View style={styles.explanationContainer}>
          <GlitchText ih={currentIH} variant="caption">
            説明:
          </GlitchText>
          <Text style={styles.explanationText}>
            「6:00-12:00のみアクセス可能。{'\n'}
            今日のクエストを確認し、アンチビジョンを刻め。」
          </Text>
          <Text style={styles.operationLabel}>操作:</Text>
          <Text style={styles.operationText}>
            「この画面は閲覧のみ。クエスト完了はイブニングレイヤーで。」
          </Text>
        </View>

      {/* Anti-Vision Display Area */}
      <ScrollView style={styles.antiVisionContainer} contentContainerStyle={styles.antiVisionContent}>
        <Text style={styles.antiVisionTitle}>この未来を拒絶する</Text>
        <Text style={styles.antiVisionText}>
          {isLoading ? '[読み込み中...]' : antiVision || '[未設定]'}
        </Text>
      </ScrollView>

      {/* Quests Display Section */}
      <View style={styles.questsSection}>
        <Text style={styles.questsSectionTitle}>今日のクエスト</Text>
        <Text style={styles.questsSectionSubtitle}>
          (完了はイブニングレイヤーで)
        </Text>

        {isLoading ? (
          <Text style={styles.questText}>[読み込み中...]</Text>
        ) : (
          <>
            <View style={styles.questItem}>
              <Text style={styles.questNumber}>1.</Text>
              <Text style={styles.questText}>{quests[0] || '[未設定]'}</Text>
            </View>
            <View style={styles.questItem}>
              <Text style={styles.questNumber}>2.</Text>
              <Text style={styles.questText}>{quests[1] || '[未設定]'}</Text>
            </View>
          </>
        )}
      </View>

      {/* Rejection Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.rejectButton,
            pressed && styles.rejectButtonPressed,
          ]}
          onPress={() => {
            // TODO: Implement rejection logic
            console.log('Rejection button pressed');
          }}
        >
          <Text style={styles.rejectButtonText}>この未来を拒絶する</Text>
        </Pressable>
      </View>
    </View>
    </PhaseGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.foreground,
  },
  headerText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  subheaderText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.foreground,
  },
  explanationContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.foreground,
  },
  explanationText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.fontSize.caption * theme.typography.lineHeight.relaxed,
  },
  operationLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    marginTop: theme.spacing.sm,
  },
  operationText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    marginTop: theme.spacing.xs,
    lineHeight: theme.typography.fontSize.caption * theme.typography.lineHeight.relaxed,
  },
  antiVisionContainer: {
    flex: 1,
  },
  antiVisionContent: {
    padding: theme.spacing.md,
  },
  antiVisionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accent,
    marginBottom: theme.spacing.lg,
  },
  antiVisionText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.foreground,
    lineHeight: theme.typography.fontSize.body * theme.typography.lineHeight.relaxed,
  },
  buttonContainer: {
    padding: theme.spacing.md,
    borderTopWidth: 2,
    borderTopColor: theme.colors.foreground,
  },
  rejectButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
  },
  rejectButtonPressed: {
    backgroundColor: theme.colors.foreground,
  },
  rejectButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.background,
    textAlign: 'center',
  },
  questsSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 2,
    borderTopColor: theme.colors.foreground,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.foreground,
  },
  questsSectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  questsSectionSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
  },
  questItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.foreground,
  },
  questNumber: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accent,
    marginRight: theme.spacing.sm,
    minWidth: 24,
  },
  questText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.foreground,
    flex: 1,
    lineHeight: theme.typography.fontSize.body * theme.typography.lineHeight.normal,
  },
});
