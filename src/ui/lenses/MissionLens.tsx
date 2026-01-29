
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../theme/colors';
import { getDB } from '../../database/client';

export function MissionLens() {
    const [mission, setMission] = useState<string>('Destroy old patterns.');
    const [antiVision, setAntiVision] = useState<string>('Stagnation. Regret. Wasted Potential.');

    useEffect(() => {
        // Load data from DB
        // In a real implementation, fetch from 'identity_core' and 'anti_vision'
    }, []);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.label}>LENS: 0.5x [1 YEAR]</ThemedText>
                <ThemedText type="title" style={styles.missionText}>{mission}</ThemedText>
            </View>

            <View style={[styles.section, styles.antiVisionContainer]}>
                <ThemedText type="subtitle" style={styles.fearLabel}>ANTI-VISION (FUEL)</ThemedText>
                <ThemedText style={styles.antiVisionText}>{antiVision}</ThemedText>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    content: {
        padding: 24,
        justifyContent: 'center',
        minHeight: '100%',
    },
    section: {
        marginBottom: 40,
    },
    label: {
        color: Colors.dark.secondary,
        letterSpacing: 2,
        marginBottom: 12,
        fontSize: 12,
        textTransform: 'uppercase',
    },
    missionText: {
        color: Colors.dark.primary,
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 40,
    },
    antiVisionContainer: {
        borderLeftWidth: 2,
        borderLeftColor: Colors.dark.error,
        paddingLeft: 16,
    },
    fearLabel: {
        color: Colors.dark.error,
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 8,
    },
    antiVisionText: {
        color: Colors.dark.text,
        fontSize: 16,
        fontStyle: 'italic',
        opacity: 0.8,
    },
});
