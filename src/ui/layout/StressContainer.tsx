
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { IdentityEngine } from '../../core/identity/IdentityEngine';
import { HapticEngine } from '../../core/HapticEngine';
import { NoiseOverlay } from '../effects/NoiseOverlay';
import { AntiVisionBleed } from '../effects/AntiVisionBleed';
import { AntiVisionFragments } from '../effects/AntiVisionFragments';
import { theme } from '../theme/theme';

export const StressContainer = ({ children }: { children: React.ReactNode }) => {
    const [health, setHealth] = useState(100);
    const [antiVision, setAntiVision] = useState('');
    const [jitter] = useState(new Animated.ValueXY({ x: 0, y: 0 }));

    useEffect(() => {
        // Fetch Anti-Vision on mount
        const fetchAntiVision = async () => {
            const engine = await IdentityEngine.getInstance();
            const content = await engine.getAntiVision();
            setAntiVision(content);
        };
        fetchAntiVision();

        // Poll Identity Health
        const interval = setInterval(async () => {
            const engine = await IdentityEngine.getInstance();
            const status = await engine.checkHealth();
            setHealth(status.health);

            // Fetch Anti-Vision content
            const content = await engine.getAntiVision();
            setAntiVision(content);

            // Heartbeat Effect (Low Health)
            if (status.health < 30) {
                triggerHeartbeat();
            }

            // Jitter Effect (Low Health)
            if (status.health < 50) {
                triggerJitter(status.health);
            }
        }, 2000); // Check every 2s

        return () => clearInterval(interval);
    }, []);

    const triggerHeartbeat = async () => {
        await HapticEngine.pulseHeartbeat();
    };

    const triggerJitter = (currentHealth: number) => {
        // Severity increases as health drops
        const severity = (50 - currentHealth) / 2; // 0 to 25

        Animated.sequence([
            Animated.timing(jitter, {
                toValue: { x: (Math.random() - 0.5) * severity, y: (Math.random() - 0.5) * severity },
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(jitter, {
                toValue: { x: 0, y: 0 },
                duration: 50,
                useNativeDriver: true,
            })
        ]).start();
    };

    // Calculate global noise opacity (INTENSIFIED: 0 at 100 health, 1.0 at 0 health)
    const noiseOpacity = Math.max(0, (100 - health) / 100);

    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            <Animated.View style={[styles.container, { transform: jitter.getTranslateTransform() }]} pointerEvents="box-none">
                {children}
            </Animated.View>
            <AntiVisionBleed antiVision={antiVision} health={health} />
            <AntiVisionFragments antiVision={antiVision} health={health} />
            <NoiseOverlay opacity={noiseOpacity} />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
    }
});
