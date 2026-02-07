
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { GlitchText } from '../effects/GlitchText';
import { theme } from '../theme/theme';
import { IdentityEngine } from '../../core/identity/IdentityEngine';

export function MissionLens() {
    const [mission, setMission] = useState<string>('Destroy old patterns.');
    const [antiVision, setAntiVision] = useState<string>('Stagnation. Regret. Wasted Potential.');
    const [health, setHealth] = useState(100);

    useEffect(() => {
        const checkHealth = async () => {
            const engine = await IdentityEngine.getInstance();
            const status = await engine.checkHealth();
            setHealth(status.health);
        };
        checkHealth();

        const interval = setInterval(checkHealth, 2000);
        return () => clearInterval(interval);
    }, []);

    // Calculate glitch severity based on health
    const glitchSeverity = Math.max(0, (100 - health) / 100);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.label}>LENS: 0.5x [1年計画]</ThemedText>
                <GlitchText
                    text={mission}
                    style={styles.missionText}
                    severity={glitchSeverity}
                />
            </View>

            <View style={[styles.section, styles.antiVisionContainer]}>
                <ThemedText type="subtitle" style={styles.fearLabel}>ANTI-VISION (あなたが想定する最悪の未来)</ThemedText>
                <ThemedText style={styles.antiVisionText}>{antiVision}</ThemedText>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        color: theme.colors.secondary,
        letterSpacing: 2,
        marginBottom: 12,
        fontSize: 12,
        textTransform: 'uppercase',
        fontFamily: theme.typography.fontFamilySerif,
    },
    missionText: {
        color: theme.colors.foreground,
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 40,
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
        fontSize: 16,
        fontStyle: 'italic',
        opacity: 0.8,
    },
});
