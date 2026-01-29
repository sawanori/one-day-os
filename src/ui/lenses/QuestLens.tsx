
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../theme/colors';
import { IdentityEngine } from '../../core/IdentityEngine';

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
        await IdentityEngine.restoreHealth(5);
    };

    return (
        <View style={styles.container}>
            <ThemedText type="subtitle" style={styles.label}>LENS: 2.0x [TODAY]</ThemedText>

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
                Only these matters. Ignoring the rest.
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        padding: 24,
        justifyContent: 'center',
    },
    label: {
        color: Colors.dark.secondary,
        letterSpacing: 2,
        marginBottom: 32,
        fontSize: 12,
        alignSelf: 'center',
    },
    questContainer: {
        gap: 16,
    },
    questCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        backgroundColor: Colors.dark.surface,
        borderWidth: 1,
        borderColor: Colors.dark.secondary,
    },
    questCompleted: {
        borderColor: Colors.dark.success,
        opacity: 0.5,
    },
    indicatorContainer: {
        marginRight: 16,
    },
    indicator: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: Colors.dark.primary,
    },
    indicatorActive: {
        backgroundColor: Colors.dark.success,
        borderColor: Colors.dark.success,
    },
    textContainer: {
        flex: 1,
    },
    questType: {
        color: Colors.dark.accent,
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 1,
    },
    questTitle: {
        color: Colors.dark.primary,
        fontSize: 18,
        fontWeight: '500',
    },
    textCompleted: {
        textDecorationLine: 'line-through',
        color: Colors.dark.secondary,
    },
    footer: {
        marginTop: 40,
        textAlign: 'center',
        color: Colors.dark.secondary,
        fontStyle: 'italic',
    },
});
