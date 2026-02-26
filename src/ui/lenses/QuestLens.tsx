
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../components/ThemedText';
import { theme } from '../theme/theme';
import { IdentityEngine } from '../../core/identity/IdentityEngine';
import { JudgmentEngine } from '../../core/judgment';
import type { JudgmentScheduleRecord } from '../../core/judgment';

export function QuestLens() {
    const { t } = useTranslation();
    const [quests, setQuests] = useState([
        { id: 1, title: 'Deep Work: 4 Hours', completed: false, type: 'BOSS', rewardClaimed: false },
        { id: 2, title: 'Gym Session', completed: false, type: 'MINION', rewardClaimed: false },
    ]);
    const [nextJudgment, setNextJudgment] = useState<JudgmentScheduleRecord | null>(null);
    const [nextJudgmentLoaded, setNextJudgmentLoaded] = useState(false);

    const toggleQuest = async (id: number) => {
        const quest = quests.find(q => q.id === id);
        if (!quest) return;
        const isCompleting = !quest.completed;
        const wasAlreadyCompletedBefore = quest.rewardClaimed;

        setQuests(prev => prev.map(q =>
            q.id === id ? { ...q, completed: !q.completed, rewardClaimed: q.rewardClaimed || isCompleting } : q
        ));

        // Only reward IH on FIRST completion (not re-completion after toggle)
        if (isCompleting && !wasAlreadyCompletedBefore) {
            const engine = await IdentityEngine.getInstance();
            await engine.restoreHealth(5);
        }
    };

    // Fetch next judgment estimate every 10 seconds
    useEffect(() => {
        const fetchNextJudgment = async () => {
            try {
                const judgmentEngine = await JudgmentEngine.getInstance();
                const today = JudgmentEngine.getTodayDate();
                const currentTime = JudgmentEngine.getCurrentTime();
                const next = await judgmentEngine.getNextJudgment(today, currentTime);
                setNextJudgment(next);
                setNextJudgmentLoaded(true);
            } catch {
                // Judgment engine may not be initialized yet
            }
        };
        fetchNextJudgment();

        const interval = setInterval(fetchNextJudgment, 10000);
        return () => clearInterval(interval);
    }, []);

    // Calculate imprecise time range for next judgment
    const getNextJudgmentEstimate = (): { min: number; max: number } | null => {
        if (!nextJudgment) return null;

        const now = new Date();
        const [hours, minutes] = nextJudgment.scheduled_time.split(':').map(Number);
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);

        const diffMs = scheduledDate.getTime() - now.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin <= 0) return null;

        const min = Math.max(5, diffMin - 15);
        const max = diffMin + 15;

        return { min, max };
    };

    const estimate = getNextJudgmentEstimate();

    return (
        <View style={styles.container}>
            <ThemedText type="subtitle" style={styles.label}>LENS: 2.0x [今日]</ThemedText>

            <View style={styles.questContainer}>
                {quests.map((quest) => (
                    <TouchableOpacity
                        key={quest.id}
                        style={[styles.questCard, quest.completed && styles.questCompleted]}
                        onPress={() => toggleQuest(quest.id)}
                    >
                        <View style={styles.indicatorContainer}>
                            <View style={[styles.indicator, quest.completed && styles.indicatorActive]} />
                        </View>
                        <View style={styles.textContainer}>
                            <ThemedText style={styles.questType}>{quest.type}</ThemedText>
                            <ThemedText style={[styles.questTitle, quest.completed && styles.textCompleted]}>
                                {quest.title}
                            </ThemedText>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <ThemedText style={styles.footer}>
                {t('lens.quest.title')}
            </ThemedText>

            {/* Next Judgment Estimate */}
            {nextJudgmentLoaded && (
                <View style={styles.nextJudgmentSection}>
                    <View style={styles.nextJudgmentDivider} />
                    <ThemedText style={styles.nextJudgmentLabel}>
                        {t('judgment.screen.nextJudgment')}
                    </ThemedText>
                    <ThemedText style={styles.nextJudgmentEstimate}>
                        {estimate
                            ? t('judgment.screen.nextEstimate', { min: estimate.min, max: estimate.max })
                            : t('judgment.screen.todayComplete')
                        }
                    </ThemedText>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 24,
        justifyContent: 'center',
    },
    label: {
        color: theme.colors.secondary,
        letterSpacing: 2,
        marginBottom: 32,
        fontSize: 12,
        alignSelf: 'center',
        fontFamily: theme.typography.fontFamilySerif,
    },
    questContainer: {
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
    nextJudgmentSection: {
        marginTop: 32,
    },
    nextJudgmentDivider: {
        height: 1,
        backgroundColor: theme.colors.error,
        marginBottom: 12,
    },
    nextJudgmentLabel: {
        color: theme.colors.error,
        fontSize: 12,
        letterSpacing: 2,
        fontFamily: theme.typography.fontFamilySerif,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    nextJudgmentEstimate: {
        color: theme.colors.secondary,
        fontSize: 12,
        fontFamily: theme.typography.fontFamily,
    },
});
