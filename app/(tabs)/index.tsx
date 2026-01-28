/**
 * One Day OS - Core Identity Layer
 * Central Identity Statement Display
 */

import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../src/ui/theme/theme';
import { GlitchText } from '../../src/ui/components/GlitchText';

export default function CoreScreen() {
  // TODO: Get actual IH value from PhaseManager
  const currentIH = 75; // Placeholder

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>コアレイヤー</Text>
        <Text style={styles.subheaderText}>アイデンティティ宣言</Text>
      </View>

      {/* Central Identity Display */}
      <View style={styles.identityContainer}>
        {/* IH Display with Glitch Effect */}
        <View style={styles.ihDisplay}>
          <Text style={styles.ihLabel}>アイデンティティ・ヘルス</Text>
          <GlitchText ih={currentIH} variant="title">
            IH {currentIH}
          </GlitchText>
        </View>

        {/* Identity Statement */}
        <View style={styles.statementContainer}>
          <GlitchText ih={currentIH} variant="heading">
            私は
          </GlitchText>
          <View style={styles.statementBox}>
            <Text style={styles.statementText}>
              {/* Placeholder for identity statement */}
              [Identity Statement Placeholder]
              {'\n\n'}
              "決断する人間だ"
            </Text>
          </View>
        </View>

        {/* 3-Layer Lens Placeholder */}
        <View style={styles.lensContainer}>
          <Text style={styles.lensTitle}>三層レンズ</Text>
          <View style={styles.lensButtons}>
            <View style={styles.lensButton}>
              <Text style={styles.lensButtonText}>0.5x</Text>
              <Text style={styles.lensButtonLabel}>ミクロ（今日）</Text>
            </View>
            <View style={[styles.lensButton, styles.lensButtonActive]}>
              <Text style={[styles.lensButtonText, styles.lensButtonTextActive]}>1.0x</Text>
              <Text style={[styles.lensButtonLabel, styles.lensButtonLabelActive]}>現在（今）</Text>
            </View>
            <View style={styles.lensButton}>
              <Text style={styles.lensButtonText}>2.0x</Text>
              <Text style={styles.lensButtonLabel}>マクロ（1年）</Text>
            </View>
          </View>
        </View>
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
  identityContainer: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  ihDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  ihLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  statementContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  statementBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    width: '100%',
  },
  statementText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.heading,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  lensContainer: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
  },
  lensTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  lensButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  lensButton: {
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    borderRadius: theme.borderRadius.none,
    minWidth: 80,
  },
  lensButtonActive: {
    backgroundColor: theme.colors.foreground,
  },
  lensButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  lensButtonTextActive: {
    color: theme.colors.background,
  },
  lensButtonLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.caption,
    color: theme.colors.foreground,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  lensButtonLabelActive: {
    color: theme.colors.background,
  },
});
