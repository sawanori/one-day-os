
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { GlitchText } from '../effects/GlitchText';
import { Colors } from '../theme/colors';
import { IdentityEngine } from '../../core/IdentityEngine';

export function IdentityLens() {
    const [identity, setIdentity] = useState<string>('I am a person who executes without hesitation.');
    const [health, setHealth] = useState(100);

    useEffect(() => {
        const checkHealth = async () => {
            const status = await IdentityEngine.checkHealth();
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
            <ThemedText type="subtitle" style={styles.label}>LENS: 1.0x [IDENTITY]</ThemedText>

            <View style={styles.card}>
                <ThemedText style={styles.prefix}>I AM A PERSON WHO...</ThemedText>
                <GlitchText
                    text={identity.replace('I am a person who ', '')}
                    style={styles.statement}
                    severity={glitchSeverity}
                />
            </View>

            <ThemedText style={styles.subtext}>
                This is your natural state. Effort is not required.
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
        marginBottom: 24,
        fontSize: 12,
        alignSelf: 'center',
    },
    card: {
        backgroundColor: Colors.dark.surface,
        padding: 32,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: Colors.dark.secondary,
    },
    prefix: {
        color: Colors.dark.secondary,
        fontSize: 14,
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    statement: {
        color: Colors.dark.primary,
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 36,
    },
    subtext: {
        color: Colors.dark.secondary,
        marginTop: 24,
        textAlign: 'center',
        fontSize: 12,
    },
});
