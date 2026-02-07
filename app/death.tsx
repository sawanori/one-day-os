
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler, TouchableOpacity, Animated } from 'react-native';
import { ThemedText } from '../src/ui/components/ThemedText';
import { theme } from '../src/ui/theme/theme';
import { IdentityEngine } from '../src/core/identity/IdentityEngine';
import { FileDeleteAnimation } from '../src/ui/effects/FileDeleteAnimation';
import { DespairModeManager } from '../src/core/despair/DespairModeManager';
import { WipeManager } from '../src/core/identity/WipeManager';
import { getDB } from '../src/database/client';
import { useRouter } from 'expo-router';

const FILES_TO_DELETE = [
    'identity.db',
    'quests.db',
    'notifications.db',
    'daily_state.db',
];

export default function DeathScreen() {
    const router = useRouter();
    const [stage, setStage] = useState<'sentencing' | 'wiping' | 'void'>('sentencing');
    const [progress] = useState(new Animated.Value(0));
    const [isLocked, setIsLocked] = useState(true);
    const [remainingHours, setRemainingHours] = useState(24);

    // Lock back button
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
    }, []);

    // M6: Store timeout IDs for cleanup
    const deathSequenceTimeouts = React.useRef<NodeJS.Timeout[]>([]);

    // Run the sequence
    useEffect(() => {
        runDeathSequence();

        return () => {
            deathSequenceTimeouts.current.forEach(id => clearTimeout(id));
            deathSequenceTimeouts.current = [];
        };
    }, []);

    // Check lockout status
    useEffect(() => {
        const checkLockout = async () => {
            const db = getDB();
            const wipeManager = new WipeManager(db);
            const despairManager = DespairModeManager.getInstance(db, wipeManager);

            const canReset = await despairManager.canResetup();
            setIsLocked(!canReset);

            if (!canReset) {
                const remaining = await despairManager.getRemainingLockoutMs();
                const hours = Math.ceil(remaining / (1000 * 60 * 60));
                setRemainingHours(hours);
            }
        };

        checkLockout();

        // Update every minute
        const interval = setInterval(checkLockout, 60000);
        return () => clearInterval(interval);
    }, []);

    const runDeathSequence = async () => {
        // Stage 1: sentencing (2s)
        const id1 = setTimeout(async () => {
            setStage('wiping');

            // Start progress bar animation
            Animated.timing(progress, {
                toValue: 100,
                duration: 3000,
                useNativeDriver: false,
            }).start();

            // Execute the Wipe via WipeManager
            const db = getDB();
            const wipeManager = new WipeManager(db);
            await wipeManager.executeWipe('IH_ZERO', 0);

            // Stage 3: The Void (after wipe)
            const id2 = setTimeout(() => {
                setStage('void');
            }, 3000);
            deathSequenceTimeouts.current.push(id2);
        }, 2000);
        deathSequenceTimeouts.current.push(id1);
    };

    const activeResurrection = async () => {
        // "Identity Insurance" (IAP would go here)
        const engine = await IdentityEngine.getInstance();
        await engine.useInsurance();
        router.replace('/');
    };

    // DEV: Skip lockout and go to onboarding
    const devSkipLockout = async () => {
        const db = getDB();
        const wipeManager = new WipeManager(db);
        const despairManager = DespairModeManager.getInstance(db, wipeManager);
        await despairManager.exitDespairMode();
        router.replace('/onboarding');
    };

    const progressWidth = progress.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    if (stage === 'sentencing') {
        return (
            <View style={styles.container}>
                <ThemedText type="title" style={styles.textRed}>IDENTITY COLLAPSED.</ThemedText>
                <ThemedText style={styles.subtext}>You failed to maintain the structure.</ThemedText>
            </View>
        );
    }

    if (stage === 'wiping') {
        return (
            <View style={styles.container}>
                <ThemedText type="title" style={styles.textGlitch}>EXECUTING WIPE...</ThemedText>
                <View testID="death-progress-bar" style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            { width: progressWidth },
                        ]}
                    />
                </View>
                <FileDeleteAnimation files={FILES_TO_DELETE} />
            </View>
        );
    }

    // The Void
    return (
        <View style={styles.voidContainer}>
            <ThemedText style={styles.voidText}>Welcome back to the old you.</ThemedText>

            {isLocked ? (
                // Lockout Message (24 hours)
                <View style={styles.lockoutContainer}>
                    <ThemedText style={styles.lockoutTitle}>LOCKED</ThemedText>
                    <ThemedText style={styles.lockoutText}>
                        You cannot rebuild for {remainingHours} hours.
                    </ThemedText>
                    <ThemedText style={styles.lockoutSubtext}>
                        This is the consequence.
                    </ThemedText>
                    {/* DEV: Skip lockout button */}
                    {__DEV__ && (
                        <TouchableOpacity style={styles.devButton} onPress={devSkipLockout}>
                            <ThemedText style={styles.devButtonText}>[DEV] Skip Lockout</ThemedText>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                // Hidden Revival Button (after 24 hours)
                <TouchableOpacity style={styles.reviveBtn} onPress={activeResurrection}>
                    <ThemedText style={styles.reviveText}>Wait... I have Insurance.</ThemedText>
                    <ThemedText style={styles.revivePrice}>[¥1,000]</ThemedText>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    textRed: {
        color: theme.colors.error,
        letterSpacing: 4,
        textAlign: 'center',
        marginBottom: 20,
    },
    textGlitch: {
        color: '#00FFFF', // Cyan for contrast
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 40,
    },
    subtext: {
        color: theme.colors.secondary,
        textAlign: 'center',
    },
    progressBar: {
        width: '80%',
        height: 4,
        backgroundColor: '#333',
        marginBottom: 20,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.error,
    },
    voidContainer: {
        flex: 1,
        backgroundColor: '#000', // Pure black
        justifyContent: 'center',
        alignItems: 'center',
    },
    voidText: {
        color: '#333',
        fontSize: 14,
        letterSpacing: 1,
        marginBottom: 100,
    },
    reviveBtn: {
        opacity: 0.3, // Hard to see
        alignItems: 'center',
    },
    reviveText: {
        color: theme.colors.secondary,
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    revivePrice: {
        color: theme.colors.accent,
        fontSize: 10,
        marginTop: 4,
    },
    lockoutContainer: {
        alignItems: 'center',
        padding: 20,
    },
    lockoutTitle: {
        color: theme.colors.error,
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 20,
        fontFamily: 'Courier New',
    },
    lockoutText: {
        color: theme.colors.foreground,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: 'Courier New',
    },
    lockoutSubtext: {
        color: theme.colors.secondary,
        fontSize: 12,
        fontStyle: 'italic',
        textAlign: 'center',
        fontFamily: 'Courier New',
    },
    devButton: {
        marginTop: 40,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FF6600',
        backgroundColor: 'rgba(255, 102, 0, 0.2)',
    },
    devButtonText: {
        color: '#FF6600',
        fontSize: 12,
        fontFamily: 'Courier New',
    },
});
