/**
 * PaidIdentityWatermark
 *
 * Subtle permanent watermark for users who have purchased Identity Insurance.
 * Shows a "$" symbol at low opacity in the bottom-right corner.
 * This is a permanent mark of shame.
 *
 * Re-checks every 10 seconds and on screen focus to detect insurance purchases.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { InsuranceManager } from '../../core/insurance';
import { theme } from '../theme/theme';

const RECHECK_INTERVAL_MS = 10000; // 10 seconds

export function PaidIdentityWatermark() {
    const [showWatermark, setShowWatermark] = useState(false);

    const checkInsurance = useCallback(() => {
        InsuranceManager.hasEverUsedInsurance()
            .then(setShowWatermark)
            .catch(() => setShowWatermark(false));
    }, []);

    // Check on mount and poll every 10 seconds
    useEffect(() => {
        checkInsurance();
        const interval = setInterval(checkInsurance, RECHECK_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [checkInsurance]);

    // Re-check when screen regains focus
    useFocusEffect(
        useCallback(() => {
            checkInsurance();
        }, [checkInsurance])
    );

    if (!showWatermark) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <ThemedText style={styles.symbol}>$</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 300,
    },
    symbol: {
        color: theme.colors.accent,
        fontSize: 24,
        fontFamily: theme.typography.fontFamily,
        opacity: 0.08,
    },
});
