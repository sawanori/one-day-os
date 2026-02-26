
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, BackHandler, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme } from '../src/ui/theme/theme';
import { ThemedText } from '../src/ui/components/ThemedText';
import { JudgmentEngine } from '../src/core/judgment';
import type { JudgmentCategory, JudgmentResponse } from '../src/constants';
import { JUDGMENT_CONSTANTS } from '../src/constants';
import { HapticEngine } from '../src/core/HapticEngine';

type PresetValue = 'YES' | 'NO' | 'yes' | 'no' | undefined;

/**
 * Heartbeat pulse interval based on remaining time.
 * Starts slow (~1000ms) and accelerates as timer decreases, like a panicking heartbeat.
 */
function getHeartbeatInterval(timeLeft: number, totalTime: number): number {
    const ratio = timeLeft / totalTime;
    // 1000ms at full time, down to 200ms at 0
    return Math.max(200, Math.floor(ratio * 1000));
}

export default function JudgmentScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const scheduleId = params.scheduleId ? Number(params.scheduleId) : null;
    const category = (params.category as JudgmentCategory) || 'SURVIVAL';
    const questionKey = String(params.questionKey || '');
    const question = Array.isArray(params.question) ? params.question[0] : params.question;
    const scheduledAt = String(params.scheduledAt || new Date().toISOString());
    const preset = (params.preset as PresetValue);
    const [timeLeft, setTimeLeft] = useState<number>(JUDGMENT_CONSTANTS.IN_APP_TIMEOUT_SECONDS);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    // Heartbeat pulsing red overlay
    const pulseOpacity = useRef(new Animated.Value(0.05)).current;
    const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);

    // Lock Back Button to force decision
    useEffect(() => {
        startTimeRef.current = Date.now();
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

    // Heartbeat animation: pulsing red overlay that accelerates as time runs out
    useEffect(() => {
        if (preset) return;
        if (timeLeft <= 0) return;

        const interval = getHeartbeatInterval(timeLeft, JUDGMENT_CONSTANTS.IN_APP_TIMEOUT_SECONDS);

        if (pulseAnimRef.current) {
            pulseAnimRef.current.stop();
        }

        const halfDuration = interval / 2;
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseOpacity, {
                    toValue: 0.15,
                    duration: halfDuration,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseOpacity, {
                    toValue: 0.05,
                    duration: halfDuration,
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimRef.current = anim;
        anim.start();

        return () => {
            if (pulseAnimRef.current) {
                pulseAnimRef.current.stop();
            }
        };
    }, [timeLeft]);

    // Countdown Logic
    useEffect(() => {
        if (preset) return;

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
        try {
            const engine = await JudgmentEngine.getInstance();
            const result = await engine.recordResponse(
                scheduleId,
                category,
                questionKey,
                String(question || ''),
                'TIMEOUT',
                null,
                scheduledAt
            );
            if (result.wipeTriggered) {
                router.replace('/death');
                return;
            }
        } catch (error) {
            console.error('Failed to record timeout:', error);
        }
        router.replace('/');
    };

    const handleDecision = async (result: boolean) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const responseTimeMs = Date.now() - startTimeRef.current;
        const response: JudgmentResponse = result ? 'YES' : 'NO';

        try {
            const engine = await JudgmentEngine.getInstance();
            const judgmentResult = await engine.recordResponse(
                scheduleId,
                category,
                questionKey,
                String(question || ''),
                response,
                responseTimeMs,
                scheduledAt
            );
            if (judgmentResult.wipeTriggered) {
                router.replace('/death');
                return;
            }
        } catch (error) {
            console.error('Failed to record judgment:', error);
        }
        router.replace('/');
    };

    return (
        <View style={styles.container}>
            {/* Pulsing red heartbeat overlay */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    styles.pulseOverlay,
                    { opacity: pulseOpacity },
                ]}
                pointerEvents="none"
            />

            <ThemedText style={styles.label}>{t('judgment.screen.label')}</ThemedText>

            {/* The Question */}
            <View style={styles.questionContainer}>
                <ThemedText type="title" style={styles.question}>
                    {question || t('ceremony.judgment.question')}
                </ThemedText>
            </View>

            {/* Timer */}
            <ThemedText type="title" style={[styles.timer, { color: timeLeft < 3 ? theme.colors.error : theme.colors.foreground }]}>
                0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
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

            <ThemedText style={styles.hint}>{t('judgment.screen.hint')}</ThemedText>
        </View>
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
    pulseOverlay: {
        backgroundColor: '#FF0000',
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
