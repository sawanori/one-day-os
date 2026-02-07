
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { GlitchText } from '../effects/GlitchText';
import { theme } from '../theme/theme';
import { IdentityEngine } from '../../core/identity/IdentityEngine';

export function IdentityLens() {
    const [identity, setIdentity] = useState<string>('I am a person who executes without hesitation.');
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

    // Calculate glitch severity based on health (0-100 -> 0-1)
    const glitchSeverity = Math.max(0, (100 - health) / 100);

    return (
        <View style={styles.container}>
            <ThemedText type="subtitle" style={styles.label}>LENS: 1.0x [IDENTITY - あなたの理想の状態]</ThemedText>

            <View style={styles.card}>
                <ThemedText style={styles.prefix}>I AM A PERSON WHO...</ThemedText>
                <GlitchText
                    text={identity.replace('I am a person who ', '')}
                    style={styles.statement}
                    severity={glitchSeverity}
                />
            </View>

            <ThemedText style={styles.subtext}>
                これが自然な状態。努力は不要。
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
});
