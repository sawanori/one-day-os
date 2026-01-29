
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../src/ui/components/ThemedText';
import { Colors } from '../src/ui/theme/colors';
import { IdentityEngine } from '../src/core/IdentityEngine';

export default function EveningAudit() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [enemyName, setEnemyName] = useState('');
    const [win, setWin] = useState<boolean | null>(null);

    const handleFinish = async () => {
        // Audit Logic
        if (win) {
            await IdentityEngine.restoreHealth(10);
        } else {
            await IdentityEngine.applyDamage(20);
        }
        router.replace('/');
    };

    return (
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
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        padding: 24,
        paddingTop: 60,
    },
    content: {
        paddingBottom: 40,
    },
    header: {
        color: Colors.dark.accent,
        marginBottom: 40,
        textAlign: 'center',
        letterSpacing: 2,
    },
    prompt: {
        color: Colors.dark.text,
        fontSize: 20,
        marginBottom: 32,
        textAlign: 'center',
    },
    input: {
        backgroundColor: Colors.dark.surface,
        color: Colors.dark.text,
        padding: 16,
        fontSize: 18,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 32,
        textAlign: 'center',
    },
    btn: {
        backgroundColor: Colors.dark.primary,
        padding: 16,
        alignItems: 'center',
    },
    btnText: {
        color: Colors.dark.background,
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
        borderColor: Colors.dark.error,
        backgroundColor: '#330000',
    },
    winBtn: {
        borderColor: Colors.dark.success,
        backgroundColor: '#003300',
    },
});
