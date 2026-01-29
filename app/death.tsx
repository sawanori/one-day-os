
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler, TouchableOpacity, Animated } from 'react-native';
import { ThemedText } from '../src/ui/components/ThemedText';
import { Colors } from '../src/ui/theme/colors';
import { WipeAnimation } from '../src/core/WipeAnimation';
import { IdentityEngine } from '../src/core/IdentityEngine';
import { useRouter } from 'expo-router';

export default function DeathScreen() {
    const router = useRouter();
    const [stage, setStage] = useState<'sentencing' | 'wiping' | 'void'>('sentencing');
    const [progress] = useState(new Animated.Value(0));

    // Lock back button
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
    }, []);

    // Run the sequence
    useEffect(() => {
        runDeathSequence();
    }, []);

    const runDeathSequence = async () => {
        // Stage 1: sentencing (2s)
        setTimeout(async () => {
            setStage('wiping');

            // Start progress bar animation
            Animated.timing(progress, {
                toValue: 100,
                duration: 3000,
                useNativeDriver: false,
            }).start();

            // Execute the Wipe
            await WipeAnimation.executeWipe();

            // Stage 3: The Void (after wipe)
            setTimeout(() => {
                setStage('void');
            }, 3000);
        }, 2000);
    };

    const activeResurrection = async () => {
        // "Identity Insurance" (IAP would go here)
        await IdentityEngine.useInsurance();
        router.replace('/');
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
                <ThemedText style={styles.fileText}>Deleting: src/identity_core.db...</ThemedText>
                <ThemedText style={styles.fileText}>Deleting: src/anti_vision.db...</ThemedText>
                <ThemedText style={styles.fileText}>Deleting: src/future_self.db...</ThemedText>
            </View>
        );
    }

    // The Void
    return (
        <View style={styles.voidContainer}>
            <ThemedText style={styles.voidText}>Welcome back to the old you.</ThemedText>

            {/* Hidden Revival Button */}
            <TouchableOpacity style={styles.reviveBtn} onPress={activeResurrection}>
                <ThemedText style={styles.reviveText}>Wait... I have Insurance.</ThemedText>
                <ThemedText style={styles.revivePrice}>[¥1,000]</ThemedText>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    textRed: {
        color: Colors.dark.error,
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
        color: Colors.dark.secondary,
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
        backgroundColor: Colors.dark.error,
    },
    fileText: {
        color: '#333',
        fontFamily: 'Courier New',
        fontSize: 10,
        marginBottom: 4,
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
        color: Colors.dark.secondary,
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    revivePrice: {
        color: Colors.dark.accent,
        fontSize: 10,
        marginTop: 4,
    }
});
