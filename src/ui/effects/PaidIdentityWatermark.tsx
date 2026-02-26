/**
 * PaidIdentityWatermark
 *
 * Subtle permanent watermark for users who have purchased Identity Insurance.
 * Shows a "$" symbol at low opacity in the bottom-right corner.
 * This is a permanent mark of shame.
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { InsuranceManager } from '../../core/insurance';
import { theme } from '../theme/theme';

export function PaidIdentityWatermark() {
    const [showWatermark, setShowWatermark] = useState(false);

    useEffect(() => {
        InsuranceManager.hasEverUsedInsurance()
            .then(setShowWatermark)
            .catch(() => setShowWatermark(false));
    }, []);

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
