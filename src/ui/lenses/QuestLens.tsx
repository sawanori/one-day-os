
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { theme } from '../theme/theme';
import { IdentityEngine } from '../../core/identity/IdentityEngine';

export function QuestLens() {
    const [quests, setQuests] = useState([
        { id: 1, title: 'Deep Work: 4 Hours', completed: false, type: 'BOSS' },
        { id: 2, title: 'Gym Session', completed: false, type: 'MINION' },
    ]);

    const toggleQuest = async (id: number) => {
        setQuests(prev => prev.map(q =>
            q.id === id ? { ...q, completed: !q.completed } : q
        ));
        // Reward IH on completion
        const engine = await IdentityEngine.getInstance();
        await engine.restoreHealth(5);
    };

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
                これだけが重要。他は無視。
            </ThemedText>
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
});
