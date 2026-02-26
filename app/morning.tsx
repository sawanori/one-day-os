
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../src/ui/components/ThemedText';
import { theme } from '../src/ui/theme/theme';
import { getDB } from '../src/database/client';
import { StressContainer } from '../src/ui/layout/StressContainer';
import { PhaseGuard } from '../src/ui/components/PhaseGuard';
import { getLocalDatetime } from '../src/utils/date';

export default function MorningExcavation() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '', q4: '' });
    const [quests, setQuests] = useState({ quest1: '', quest2: '' });
    const [canProceed, setCanProceed] = useState(false);
    const [antiVision, setAntiVision] = useState('');

    // Load anti-vision from database
    useEffect(() => {
        const loadAntiVision = async () => {
            try {
                const db = getDB();
                const row = await db.getFirstAsync<{ anti_vision: string }>(
                    'SELECT anti_vision FROM identity WHERE id = 1'
                );
                if (row?.anti_vision) {
                    setAntiVision(row.anti_vision);
                }
            } catch (error) {
                console.error('Failed to load anti-vision:', error);
            }
        };
        loadAntiVision();
    }, []);

    // Prevent back button
    useEffect(() => {
        const onBackPress = () => true;
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    // Check if at least one quest field has non-empty content
    const hasValidQuests = quests.quest1.trim().length > 0 || quests.quest2.trim().length > 0;

    const handleNext = async () => {
        if (step === 0 && !canProceed) return; // Anti-vision timer

        if (step === 5) {
            if (!hasValidQuests) {
                Alert.alert('NO QUESTS', 'Define at least one quest. No excuses.');
                return;
            }
            // Final Step: Save & Exit
            await saveMorningData();
            router.replace('/');
            return;
        }
        setStep(s => s + 1);
    };

    const saveMorningData = async () => {
        const db = getDB();

        // Use local datetime string so DATE(created_at) matches getTodayString() in DailyManager.
        // datetime('now') returns UTC which causes date mismatch in timezones like JST (UTC+9).
        const localDatetime = getLocalDatetime();

        // Save Quests
        if (quests.quest1) {
            await db.runAsync(
                'INSERT INTO quests (quest_text, is_completed, created_at) VALUES (?, 0, ?)',
                [quests.quest1, localDatetime]
            );
        }
        if (quests.quest2) {
            await db.runAsync(
                'INSERT INTO quests (quest_text, is_completed, created_at) VALUES (?, 0, ?)',
                [quests.quest2, localDatetime]
            );
        }

        // Morning ritual completed
    };

    const renderStep = () => {
        switch (step) {
            case 0: // Anti-Vision
                return (
                    <View>
                        <ThemedText type="subtitle" style={styles.stepTitle}>STEP 0: FACE REALITY</ThemedText>
                        <ThemedText style={styles.prompt}>
                            Read your Anti-Vision. This is the future you are currently building.
                        </ThemedText>
                        <View style={styles.antiVisionBox}>
                            <ThemedText style={styles.antiVisionText}>
                                {antiVision || 'Loading...'}
                            </ThemedText>
                        </View>
                        <ThemedText style={styles.timerText}>{canProceed ? "PROCEED" : "ABSORB THE PAIN..."}</ThemedText>
                    </View>
                );
            case 1:
                return (
                    <View>
                        <ThemedText type="subtitle" style={styles.stepTitle}>Q1: IDENTIFY THE ROT</ThemedText>
                        <ThemedText style={styles.prompt}>What mediocrity have you accepted as 'normal'?</ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="Don't lie."
                            placeholderTextColor="#666"
                            multiline
                            value={answers.q1}
                            onChangeText={t => setAnswers({ ...answers, q1: t })}
                        />
                    </View>
                );
            case 2:
                return (
                    <View>
                        <ThemedText type="subtitle" style={styles.stepTitle}>Q2: THE REPEAT OFFENDERS</ThemedText>
                        <ThemedText style={styles.prompt}>List the 3 things you complained about this year. Again.</ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="Same old story..."
                            placeholderTextColor="#666"
                            multiline
                            value={answers.q2}
                            onChangeText={t => setAnswers({ ...answers, q2: t })}
                        />
                    </View>
                );
            case 3:
                return (
                    <View>
                        <ThemedText type="subtitle" style={styles.stepTitle}>Q3: THE MIRROR TEST</ThemedText>
                        <ThemedText style={styles.prompt}>
                            Ignore your words. Based ONLY on your actions yesterday, what do you want?
                        </ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Comfort, Validation, Sleep..."
                            placeholderTextColor="#666"
                            multiline
                            value={answers.q3}
                            onChangeText={t => setAnswers({ ...answers, q3: t })}
                        />
                    </View>
                );
            case 4:
                return (
                    <View>
                        <ThemedText type="subtitle" style={styles.stepTitle}>Q4: THE SHAME TEST</ThemedText>
                        <ThemedText style={styles.prompt}>
                            What truth about your life would destroy you if your hero saw it?
                        </ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="Expose it."
                            placeholderTextColor="#666"
                            multiline
                            value={answers.q4}
                            onChangeText={t => setAnswers({ ...answers, q4: t })}
                        />
                    </View>
                );
            case 5:
                return (
                    <View>
                        <ThemedText type="subtitle" style={styles.stepTitle}>FINAL: ORDERS FOR THE DAY</ThemedText>
                        <ThemedText style={styles.prompt}>
                            Define 2 Critical Actions. Everything else is noise.
                        </ThemedText>

                        <ThemedText style={styles.label}>BOSS QUEST (High Leverage)</ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="Move the needle."
                            placeholderTextColor="#666"
                            value={quests.quest1}
                            onChangeText={t => setQuests({ ...quests, quest1: t })}
                        />

                        <ThemedText style={styles.label}>MINION QUEST (Maintenance)</ThemedText>
                        <TextInput
                            style={styles.input}
                            placeholder="Get it done."
                            placeholderTextColor="#666"
                            value={quests.quest2}
                            onChangeText={t => setQuests({ ...quests, quest2: t })}
                        />
                    </View>
                );
        }
    };

    // Anti-vision timer logic
    useEffect(() => {
        if (step === 0) {
            const timer = setTimeout(() => setCanProceed(true), 15000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    return (
        <StressContainer>
            <PhaseGuard phase="MORNING">
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        {renderStep()}
                    </ScrollView>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (step === 0 && !canProceed) && styles.disabledButton,
                            (step === 5 && !hasValidQuests) && styles.disabledButton,
                        ]}
                        onPress={handleNext}
                        disabled={(step === 0 && !canProceed) || (step === 5 && !hasValidQuests)}
                    >
                        <ThemedText style={styles.buttonText}>
                            {step === 0 && !canProceed ? "WAIT..." : step === 5 ? "START DAY" : "NEXT"}
                        </ThemedText>
                    </TouchableOpacity>
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
    stepTitle: {
        color: theme.colors.error,
        marginBottom: 24,
        fontSize: 14,
        letterSpacing: 2,
    },
    prompt: {
        color: theme.colors.foreground,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 32,
        lineHeight: 28,
    },
    antiVisionBox: {
        backgroundColor: '#330000',
        padding: 24,
        borderLeftWidth: 4,
        borderLeftColor: 'red',
        marginBottom: 32,
    },
    antiVisionText: {
        color: '#ffcccc',
        fontStyle: 'italic',
        fontSize: 16,
    },
    input: {
        backgroundColor: theme.colors.surface,
        color: theme.colors.foreground,
        padding: 16,
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 24,
    },
    label: {
        color: theme.colors.secondary,
        marginBottom: 8,
        fontSize: 12,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: theme.colors.foreground,
        padding: 18,
        alignItems: 'center',
        marginBottom: 20,
    },
    disabledButton: {
        backgroundColor: '#333',
    },
    buttonText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    timerText: {
        color: theme.colors.secondary,
        textAlign: 'center',
        marginBottom: 16,
    }
});
