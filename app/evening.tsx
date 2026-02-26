
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../src/ui/components/ThemedText';
import { theme } from '../src/ui/theme/theme';
import { IdentityEngine } from '../src/core/identity/IdentityEngine';
import { EVENING_AUDIT_CONSTANTS } from '../src/constants';
import { StressContainer } from '../src/ui/layout/StressContainer';
import { PhaseGuard } from '../src/ui/components/PhaseGuard';

export default function EveningAudit() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [enemyName, setEnemyName] = useState('');
    const [win, setWin] = useState<boolean | null>(null);

    const handleFinish = async () => {
        // Audit Logic
        const engine = await IdentityEngine.getInstance();
        if (win) {
            await engine.restoreHealth(EVENING_AUDIT_CONSTANTS.RESTORE_AMOUNT);
        } else {
            await engine.applyDamage(EVENING_AUDIT_CONSTANTS.PENALTY_AMOUNT);
        }
        router.replace('/');
    };

    return (
        <StressContainer>
            <PhaseGuard phase="EVENING">
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <ThemedText type="subtitle" style={styles.header}>EVENING AUDIT</ThemedText>

                        {step === 0 && (
                            <View>
                                <ThemedText style={styles.prompt}>
                                    Name the "Enemy" required to be defeated today.
                                </ThemedText>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Procrastination? Fear? Ego?"
                                    placeholderTextColor="#666"
                                    value={enemyName}
                                    onChangeText={setEnemyName}
                                />
                                <TouchableOpacity style={styles.btn} onPress={() => setStep(1)}>
                                    <ThemedText style={styles.btnText}>NEXT</ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 1 && (
                            <View>
                                <ThemedText style={styles.prompt}>
                                    Did you kill {enemyName || 'the enemy'}? Or did it own you?
                                </ThemedText>

                                <View style={styles.row}>
                                    <TouchableOpacity
                                        style={[styles.choiceBtn, styles.lossBtn]}
                                        onPress={() => setWin(false)}
                                    >
                                        <ThemedText style={styles.btnText}>LOST (WEAKNESS)</ThemedText>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.choiceBtn, styles.winBtn]}
                                        onPress={() => setWin(true)}
                                    >
                                        <ThemedText style={styles.btnText}>YES (VICTORY)</ThemedText>
                                    </TouchableOpacity>
                                </View>

                                {win !== null && (
                                    <TouchableOpacity style={styles.btn} onPress={handleFinish}>
                                        <ThemedText style={styles.btnText}>SUBMIT TO O.S.</ThemedText>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </PhaseGuard>
        </StressContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 24,
        paddingTop: 60,
    },
    content: {
        paddingBottom: 40,
    },
    header: {
        color: theme.colors.accent,
        marginBottom: 40,
        textAlign: 'center',
        letterSpacing: 2,
    },
    prompt: {
        color: theme.colors.foreground,
        fontSize: 20,
        marginBottom: 32,
        textAlign: 'center',
    },
    input: {
        backgroundColor: theme.colors.surface,
        color: theme.colors.foreground,
        padding: 16,
        fontSize: 18,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 32,
        textAlign: 'center',
    },
    btn: {
        backgroundColor: theme.colors.foreground,
        padding: 16,
        alignItems: 'center',
    },
    btnText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    choiceBtn: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
    },
    lossBtn: {
        borderColor: theme.colors.error,
        backgroundColor: '#330000',
    },
    winBtn: {
        borderColor: theme.colors.success,
        backgroundColor: '#003300',
    },
});
