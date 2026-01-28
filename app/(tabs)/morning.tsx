/**
 * One Day OS - Morning Layer
 * Anti-Vision Display & Rejection Interface
 */

import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { theme } from '../../src/ui/theme/theme';

export default function MorningScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>モーニングレイヤー</Text>
        <Text style={styles.subheaderText}>アンチビジョン表示</Text>
      </View>

      {/* Anti-Vision Display Area */}
      <ScrollView style={styles.antiVisionContainer} contentContainerStyle={styles.antiVisionContent}>
        <Text style={styles.antiVisionTitle}>この未来を拒絶する</Text>
        <Text style={styles.antiVisionText}>
          {/* Placeholder for anti-vision text scroll */}
          [アンチビジョンのスクロールテキスト]
          {'\n\n'}
          あなたが拒絶する未来がここにスクロール表示されます
          {'\n\n'}
          例:
          {'\n'}
          - 他人の期待に振り回される人生
          {'\n'}
          - 決断できずに流される日々
          {'\n'}
          - 本質を見失った仕事
        </Text>
      </ScrollView>

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
});
