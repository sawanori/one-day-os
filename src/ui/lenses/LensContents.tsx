import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { GlitchText } from '../effects/GlitchText';
import { theme } from '../theme/theme';

interface Quest {
  id: number;
  quest_text: string;
  is_completed: number;
  created_at: string;
  completed_at: string | null;
}

interface MissionContentProps {
  glitchSeverity: number;
  mission: string;
  antiVision: string;
  health: number;
}

interface IdentityContentProps {
  glitchSeverity: number;
  identity: string;
  health: number;
}

interface QuestContentProps {
  glitchSeverity: number;
  quests: Quest[];
  onToggle: (id: number) => void;
}

// Mission Content (0.5x - 1 Year Plan)
export const MissionContent = ({ glitchSeverity, mission, antiVision, health }: MissionContentProps) => {
  return (
    <ScrollView style={styles.missionContainer} contentContainerStyle={styles.missionContent}>
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.label}>LENS: 0.5x [1年計画]</ThemedText>
        <GlitchText
          text={mission}
          style={styles.missionText}
          severity={glitchSeverity}
          health={health}
        />
      </View>

      <View style={[styles.section, styles.antiVisionContainer]}>
        <ThemedText type="subtitle" style={styles.fearLabel}>ANTI-VISION (あなたが想定する最悪の未来)</ThemedText>
        <ThemedText style={styles.antiVisionText}>{antiVision}</ThemedText>
      </View>
    </ScrollView>
  );
};

// Identity Content (1.0x - Identity Statement)
export const IdentityContent = ({ glitchSeverity, identity, health }: IdentityContentProps) => {
  return (
    <View style={styles.identityContainer}>
      <ThemedText type="subtitle" style={styles.identityLabel}>LENS: 1.0x [IDENTITY - あなたの理想の状態]</ThemedText>

      <View style={styles.card}>
        <ThemedText style={styles.prefix}>I AM A PERSON WHO...</ThemedText>
        <GlitchText
          text={identity.replace('I am a person who ', '')}
          style={styles.statement}
          severity={glitchSeverity}
          health={health}
        />
      </View>

      <ThemedText style={styles.subtext}>
        これが自然な状態。努力は不要。
      </ThemedText>
    </View>
  );
};

// Quest Content (2.0x - Today's Tasks)
export const QuestContent = ({ glitchSeverity, quests, onToggle }: QuestContentProps) => {
  return (
    <View style={styles.questContainer}>
      <ThemedText type="subtitle" style={styles.questLabel}>LENS: 2.0x [今日]</ThemedText>

      <View style={styles.questList}>
        {quests.map((quest) => (
          <TouchableOpacity
            key={quest.id}
            style={[styles.questCard, quest.is_completed === 1 && styles.questCompleted]}
            onPress={() => onToggle(quest.id)}
          >
            <View style={styles.indicatorContainer}>
              <View style={[styles.indicator, quest.is_completed === 1 && styles.indicatorActive]} />
            </View>
            <View style={styles.textContainer}>
              <ThemedText style={styles.questType}>QUEST</ThemedText>
              <ThemedText style={[styles.questTitle, quest.is_completed === 1 && styles.textCompleted]}>
                {quest.quest_text}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ThemedText style={styles.footer}>
        これだけが重要。他は無視。
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  // Mission styles
  missionContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  missionContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  section: {
    marginBottom: 40,
  },
  label: {
    color: theme.colors.secondary,
    letterSpacing: 2,
    marginBottom: 12,
    fontSize: 12,
    textTransform: 'uppercase',
    fontFamily: theme.typography.fontFamilySerif,
  },
  missionText: {
    color: theme.colors.foreground,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 52,
  },
  antiVisionContainer: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.error,
    paddingLeft: 16,
  },
  fearLabel: {
    color: theme.colors.error,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: theme.typography.fontFamilySerif,
  },
  antiVisionText: {
    color: theme.colors.foreground,
    fontSize: 20,
    fontStyle: 'italic',
    opacity: 0.8,
    lineHeight: 28,
  },

  // Identity styles
  identityContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  identityLabel: {
    color: theme.colors.secondary,
    letterSpacing: 2,
    marginBottom: 24,
    fontSize: 12,
    alignSelf: 'center',
    fontFamily: theme.typography.fontFamilySerif,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  prefix: {
    color: theme.colors.secondary,
    fontSize: 14,
    marginBottom: 16,
    textTransform: 'uppercase',
    fontFamily: theme.typography.fontFamilySerif,
  },
  statement: {
    color: theme.colors.foreground,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
  },
  subtext: {
    color: theme.colors.secondary,
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
  },

  // Quest styles
  questContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  questLabel: {
    color: theme.colors.secondary,
    letterSpacing: 2,
    marginBottom: 32,
    fontSize: 12,
    alignSelf: 'center',
    fontFamily: theme.typography.fontFamilySerif,
  },
  questList: {
    gap: 16,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  questCompleted: {
    borderColor: theme.colors.success,
    opacity: 0.5,
  },
  indicatorContainer: {
    marginRight: 16,
  },
  indicator: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: theme.colors.foreground,
  },
  indicatorActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  textContainer: {
    flex: 1,
  },
  questType: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
    fontFamily: theme.typography.fontFamilySerif,
  },
  questTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: '500',
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.secondary,
  },
  footer: {
    marginTop: 40,
    textAlign: 'center',
    color: theme.colors.secondary,
    fontStyle: 'italic',
  },
});
