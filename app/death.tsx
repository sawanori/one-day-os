
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, BackHandler, Animated } from 'react-native';
import { ThemedText } from '../src/ui/components/ThemedText';
import { theme } from '../src/ui/theme/theme';
import { IdentityEngine } from '../src/core/identity/IdentityEngine';
import { FileDeleteAnimation } from '../src/ui/effects/FileDeleteAnimation';
import { WipeManager } from '../src/core/identity/WipeManager';
import { getDB } from '../src/database/client';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HapticEngine } from '../src/core/HapticEngine';
import { INSURANCE_CONSTANTS } from '../src/constants';
import {
    IdentityBackupManager,
    InsuranceManager,
    IAPService,
} from '../src/core/insurance';
import { OnboardingManager } from '../src/core/onboarding';
import { JudgmentEngine } from '../src/core/judgment';
import type { InsuranceProduct } from '../src/core/insurance';
import { InsuranceModal } from '../src/ui/screens/InsuranceModal';

type DeathStage =
    | 'BACKUP'
    | 'SENTENCING'
    | 'WIPING_VISUAL'
    | 'INSURANCE_OFFER'
    | 'REVIVAL'
    | 'FINAL_WIPE'
    | 'VOID';

const FILES_TO_DELETE = [
    'identity.db',
    'quests.db',
    'notifications.db',
    'daily_state.db',
];

export default function DeathScreen() {
    const router = useRouter();
    const { t } = useTranslation();

    const [stage, setStage] = useState<DeathStage>('BACKUP');
    const progress = useRef(new Animated.Value(0)).current;
    const [countdown, setCountdown] = useState<number>(INSURANCE_CONSTANTS.OFFER_TIMEOUT_SECONDS);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [localizedPrice, setLocalizedPrice] = useState<string>(INSURANCE_CONSTANTS.PRICE_DISPLAY);

    // Refs for cleanup
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatCleanupRef = useRef<(() => void) | null>(null);
    const productRef = useRef<InsuranceProduct | null>(null);

    // Ref pattern to avoid stale closures in setTimeout/setInterval callbacks
    const isPurchasingRef = useRef(false);
    const insuranceEligibleRef = useRef(false);

    // Guard against double wipe execution (race condition between countdown and decline/error)
    const isWipingRef = useRef(false);

    // Guard against state updates after unmount
    const isMountedRef = useRef(true);

    // Keep refs in sync with state
    useEffect(() => { isPurchasingRef.current = isPurchasing; }, [isPurchasing]);

    // Lock back button
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
    }, []);

    // Main death sequence
    useEffect(() => {
        isMountedRef.current = true;
        runDeathSequence();
        return cleanup;
    }, []);

    const cleanup = () => {
        isMountedRef.current = false;
        timeoutsRef.current.forEach(id => clearTimeout(id));
        timeoutsRef.current = [];
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        if (heartbeatCleanupRef.current) {
            heartbeatCleanupRef.current();
            heartbeatCleanupRef.current = null;
        }
    };

    const runDeathSequence = async () => {
        // Stage 0: BACKUP (instant, invisible)
        const backupSuccess = await IdentityBackupManager.createBackup();

        if (!isMountedRef.current) return;

        // Check insurance eligibility while we're at it
        if (backupSuccess) {
            const eligibility = await InsuranceManager.checkEligibility();
            insuranceEligibleRef.current = eligibility.eligible;

            if (eligibility.eligible) {
                // Pre-fetch product info for localized price
                const product = await IAPService.getInstance().getProduct();
                productRef.current = product;

                if (!product) {
                    // No product registered in App Store / Google Play — cannot sell insurance
                    insuranceEligibleRef.current = false;
                } else if (isMountedRef.current) {
                    setLocalizedPrice(product.localizedPrice);
                }

                // Pre-fetch purchase count for potential future shame level display
                await InsuranceManager.getTotalPurchaseCount();
            }
        }

        if (!isMountedRef.current) return;

        // Stage 1: SENTENCING (2s)
        setStage('SENTENCING');
        // Start accelerating heartbeat haptic
        const heartbeatCleanup = await HapticEngine.acceleratingHeartbeat();
        heartbeatCleanupRef.current = heartbeatCleanup;

        const id1 = setTimeout(() => {
            if (!isMountedRef.current) return;

            // Stop heartbeat
            if (heartbeatCleanupRef.current) {
                heartbeatCleanupRef.current();
                heartbeatCleanupRef.current = null;
            }

            // Stage 2: WIPING_VISUAL (3s, animation only - NO actual wipe)
            setStage('WIPING_VISUAL');
            Animated.timing(progress, {
                toValue: INSURANCE_CONSTANTS.WIPE_PAUSE_PERCENT,
                duration: 3000,
                useNativeDriver: false,
            }).start();

            const id2 = setTimeout(() => {
                if (!isMountedRef.current) return;

                if (insuranceEligibleRef.current) {
                    // Stage 3: INSURANCE_OFFER
                    setStage('INSURANCE_OFFER');
                    HapticEngine.insuranceOffer();
                    startCountdown();
                } else {
                    // Skip insurance, go to final wipe
                    executeFinalWipe();
                }
            }, 3000);
            timeoutsRef.current.push(id2);
        }, 2000);
        timeoutsRef.current.push(id1);
    };

    const startCountdown = () => {
        setCountdown(INSURANCE_CONSTANTS.OFFER_TIMEOUT_SECONDS);
        countdownRef.current = setInterval(() => {
            if (isPurchasingRef.current) return; // Pause timer during Store processing

            setCountdown(prev => {
                const next = prev - 1;
                if (next <= 0) {
                    if (countdownRef.current) {
                        clearInterval(countdownRef.current);
                        countdownRef.current = null;
                    }
                    executeFinalWipe();
                    return 0;
                }
                return next;
            });
        }, 1000);
    };

    const handlePurchase = async () => {
        // Guard: never attempt purchase if product is unavailable
        if (!productRef.current) {
            executeFinalWipe();
            return;
        }

        setIsPurchasing(true);
        isPurchasingRef.current = true;

        try {
            const iap = IAPService.getInstance();
            const result = await iap.purchase();

            if (result.success && result.transactionId) {
                // Stop countdown
                if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;
                }

                // Finish transaction with store
                await iap.finishTransaction(result.transactionId);

                // Apply insurance (restore from backup, record purchase)
                const applied = await InsuranceManager.applyInsurance(
                    result.transactionId,
                    productRef.current
                );

                if (applied && isMountedRef.current) {
                    // Stage 4a: REVIVAL
                    setStage('REVIVAL');
                    HapticEngine.insurancePurchase();

                    // Update IdentityEngine in-memory IH
                    const engine = await IdentityEngine.getInstance();
                    await engine.setCurrentIH(INSURANCE_CONSTANTS.REVIVAL_IH);

                    // Navigate home after 2s
                    const id = setTimeout(() => {
                        if (isMountedRef.current) {
                            router.replace('/');
                        }
                    }, 2000);
                    timeoutsRef.current.push(id);
                    return;
                }
            }

            // Purchase failed or cancelled - resume countdown
            if (isMountedRef.current) {
                setIsPurchasing(false);
            }
            isPurchasingRef.current = false;
            if (result.error === 'cancelled' || result.error === 'timeout') {
                // User cancelled or timed out, keep offer visible for retry
                return;
            }
            // Other error - wipe
            executeFinalWipe();
        } catch (error) {
            console.error('[DeathScreen] Purchase error:', error);
            if (isMountedRef.current) {
                setIsPurchasing(false);
            }
            isPurchasingRef.current = false;
            executeFinalWipe();
        }
    };

    const handleDecline = () => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
        executeFinalWipe();
    };

    const executeFinalWipe = async () => {
        // Guard against double execution (race between countdown expiry and decline/error)
        if (isWipingRef.current) return;
        isWipingRef.current = true;

        // Always stop the countdown interval (may still be running if called from error paths)
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }

        if (isMountedRef.current) {
            setStage('FINAL_WIPE');
        }

        // Animate progress from 95% to 100%
        Animated.timing(progress, {
            toValue: 100,
            duration: 500,
            useNativeDriver: false,
        }).start();

        // Execute actual wipe
        const db = getDB();
        const wipeManager = new WipeManager(db);
        await wipeManager.executeWipe('IH_ZERO', 0);

        if (!isMountedRef.current) return;

        // Reset all singletons so they re-initialize from clean DB state.
        // This must happen AFTER wipe completes but BEFORE navigating to onboarding,
        // otherwise stale singleton state (e.g. OnboardingManager thinking step is 'complete')
        // will prevent re-onboarding from working.
        OnboardingManager.resetInstance();
        IdentityEngine.resetInstance();
        JudgmentEngine.resetInstance();

        // Stage 5: VOID (1s)
        const id = setTimeout(() => {
            if (!isMountedRef.current) return;
            setStage('VOID');
            const id2 = setTimeout(() => {
                if (isMountedRef.current) {
                    router.replace('/onboarding');
                }
            }, 1000);
            timeoutsRef.current.push(id2);
        }, 500);
        timeoutsRef.current.push(id);
    };

    const progressWidth = progress.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    // RENDER based on current stage

    if (stage === 'BACKUP') {
        return null;
    }

    if (stage === 'SENTENCING') {
        return (
            <View style={styles.container}>
                <ThemedText type="title" style={styles.textRed}>
                    {t('death.title', { defaultValue: 'You are dead.' })}
                </ThemedText>
                <ThemedText style={styles.subtext}>
                    {t('death.sentencing', { defaultValue: 'You failed to maintain the structure.' })}
                </ThemedText>
            </View>
        );
    }

    if (stage === 'WIPING_VISUAL') {
        return (
            <View style={styles.container}>
                <ThemedText type="title" style={styles.textGlitch}>
                    {t('death.wiping', { defaultValue: 'EXECUTING WIPE...' })}
                </ThemedText>
                <View testID="death-progress-bar" style={styles.progressBar}>
                    <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
                <FileDeleteAnimation files={FILES_TO_DELETE} />
            </View>
        );
    }

    if (stage === 'INSURANCE_OFFER') {
        return (
            <View style={styles.container}>
                <InsuranceModal
                    visible={true}
                    countdownSeconds={countdown}
                    onPurchase={handlePurchase}
                    onDecline={handleDecline}
                    isPurchasing={isPurchasing}
                    localizedPrice={localizedPrice}
                    headerElement={
                        <View style={styles.progressBarSmall}>
                            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                        </View>
                    }
                />
            </View>
        );
    }

    if (stage === 'REVIVAL') {
        return (
            <View style={styles.revivalContainer}>
                <ThemedText type="title" style={styles.paidIdentity}>
                    {t('insurance.postPurchase.label', { defaultValue: 'PAID IDENTITY' })}
                </ThemedText>
                <ThemedText style={styles.revivalComment}>
                    {t('insurance.postPurchase.comment', {
                        defaultValue: 'You survived. But never forget \u2014 your resolve was sold for {{price}}.',
                        price: localizedPrice,
                    })}
                </ThemedText>
                <ThemedText style={styles.revivalIH}>IH: {INSURANCE_CONSTANTS.REVIVAL_IH}%</ThemedText>
            </View>
        );
    }

    if (stage === 'FINAL_WIPE') {
        return (
            <View style={styles.container}>
                <ThemedText type="title" style={styles.textGlitch}>
                    {t('death.wiping', { defaultValue: 'EXECUTING WIPE...' })}
                </ThemedText>
                <View testID="death-progress-bar" style={styles.progressBar}>
                    <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
            </View>
        );
    }

    // VOID
    return (
        <View style={styles.voidContainer}>
            <ThemedText style={styles.voidText}>
                {t('death.void', { defaultValue: 'Welcome back to the old you.' })}
            </ThemedText>
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
        color: '#00FFFF',
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
    progressBarSmall: {
        width: '60%',
        height: 2,
        backgroundColor: '#333',
        marginBottom: 40,
        position: 'absolute',
        top: 60,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.error,
    },
    voidContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    voidText: {
        color: '#333',
        fontSize: 14,
        letterSpacing: 1,
    },
    revivalContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    paidIdentity: {
        color: theme.colors.error,
        letterSpacing: 6,
        textAlign: 'center',
        marginBottom: 30,
    },
    revivalComment: {
        color: theme.colors.secondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
        fontFamily: 'Courier New',
    },
    revivalIH: {
        color: theme.colors.error,
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
});
