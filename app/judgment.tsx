
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../src/ui/theme/theme';
import { ThemedText } from '../src/ui/components/ThemedText';
import { IdentityEngine } from '../src/core/identity/IdentityEngine';
import { HapticEngine } from '../src/core/HapticEngine';
import { StressContainer } from '../src/ui/layout/StressContainer';

type PresetValue = 'YES' | 'NO' | 'yes' | 'no' | undefined;

export default function JudgmentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const id = params.id;
    const question = params.question;
    const preset = (params.preset as PresetValue);
    const [timeLeft, setTimeLeft] = useState(5);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Lock Back Button to force decision
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
    }, []);

    // Preset auto-submit
    useEffect(() => {
        if (preset) {
            const normalizedPreset = preset.toUpperCase();
            if (normalizedPreset === 'YES') {
                handleDecision(true);
            } else if (normalizedPreset === 'NO') {
                handleDecision(false);
            }
        }
    }, [preset]);

    // Countdown Logic（presetがある場合は動かない）
    useEffect(() => {
        if (preset) return; // Preset時はタイマー無効

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                const next = prev - 1;
                if (next <= 0) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    handleTimeout();
                    return 0;
                }
                HapticEngine.lightClick(); // Tick Tock
                return next;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleTimeout = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        await HapticEngine.punishFailure();
        // Timeout = Hesitation = Failure
        const engine = await IdentityEngine.getInstance();
        await engine.applyDamage(10);
        router.replace('/');
    };

    const handleDecision = async (result: boolean) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const engine = await IdentityEngine.getInstance();

        if (result) {
            await HapticEngine.snapLens(); // Satisfying click
            await engine.restoreHealth(2);
        } else {
            await HapticEngine.punishFailure();
            await engine.applyDamage(5); // Honest failure is better than hesitation?
        }

        router.replace('/');
    };

    return (
        <StressContainer>
            <View style={styles.container}>
                <ThemedText style={styles.label}>IMMEDIATE JUDGMENT REQURIED</ThemedText>

                {/* The Question */}
                <View style={styles.questionContainer}>
                    <ThemedText type="title" style={styles.question}>
                        {question || "Did you act on your mission?"}
                    </ThemedText>
                </View>

                {/* Timer */}
                <ThemedText type="title" style={[styles.timer, { color: timeLeft < 3 ? theme.colors.error : theme.colors.foreground }]}>
                    0:0{timeLeft}
                </ThemedText>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.button, styles.noBtn]}
                        onPress={() => handleDecision(false)}
                        activeOpacity={0.8}
                    >
                        <ThemedText type="title" style={styles.btnText}>NO</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.yesBtn]}
                        onPress={() => handleDecision(true)}
                        activeOpacity={0.8}
                    >
                        <ThemedText type="title" style={styles.btnText}>YES</ThemedText>
                    </TouchableOpacity>
                </View>

                <ThemedText style={styles.hint}>Hesitation is defeat.</ThemedText>
            </View>
        </StressContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    label: {
        fontSize: 12,
        letterSpacing: 2,
        color: theme.colors.secondary,
        marginBottom: 40,
    },
    questionContainer: {
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    question: {
        textAlign: 'center',
        fontSize: 28,
    },
    timer: {
        fontSize: 60,
        fontFamily: 'Courier New', // Monospace for numbers
        marginBottom: 60,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 20,
        width: '100%',
        height: 120,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
    },
    noBtn: {
        borderColor: theme.colors.error,
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
    },
    yesBtn: {
        borderColor: theme.colors.success,
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
    },
    btnText: {
        fontSize: 32,
        fontWeight: '900',
    },
    hint: {
        marginTop: 40,
        fontSize: 10,
        color: '#666',
    }
});
