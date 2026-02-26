
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { IdentityEngine } from '../../core/identity/IdentityEngine';
import { HapticEngine } from '../../core/HapticEngine';
import { NoiseOverlay } from '../effects/NoiseOverlay';
import { AntiVisionBleed } from '../effects/AntiVisionBleed';
import { AntiVisionFragments } from '../effects/AntiVisionFragments';
import { EdgeVignette } from '../effects/EdgeVignette';
import { ScanlineOverlay } from '../effects/ScanlineOverlay';
import { theme } from '../theme/theme';
import { isFeatureEnabled } from '../../config/features';

export const StressContainer = ({ children }: { children: React.ReactNode }) => {
    const [health, setHealth] = useState(100);
    const [stressLevel, setStressLevel] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [antiVision, setAntiVision] = useState('');
    const [jitter] = useState(new Animated.ValueXY({ x: 0, y: 0 }));
    const [heartbeatOpacity] = useState(new Animated.Value(0));

    // Stale Closure 防止: useRef で最新値を保持（必須）
    const stressLevelRef = useRef<0 | 1 | 2 | 3 | 4>(0);
    const healthRef = useRef<number>(100);

    // IHを5段階に離散化してre-render頻度を削減
    const getStressLevel = (h: number): 0 | 1 | 2 | 3 | 4 => {
        if (h > 80) return 0;  // calm
        if (h > 60) return 1;  // uneasy
        if (h > 40) return 2;  // anxious
        if (h > 20) return 3;  // critical
        return 4;              // terminal
    };

    useEffect(() => {
        let isCancelled = false;

        const poll = async () => {
            if (isCancelled) return;

            const engine = await IdentityEngine.getInstance();
            const status = await engine.checkHealth();
            const newStressLevel = getStressLevel(status.health);

            // Ref で最新値を参照 (Stale Closure 回避)
            const prevStressLevel = stressLevelRef.current;
            const prevHealth = healthRef.current;

            if (newStressLevel !== prevStressLevel || status.health !== prevHealth) {
                stressLevelRef.current = newStressLevel;
                healthRef.current = status.health;
                setHealth(status.health);
                setStressLevel(newStressLevel);
            }

            // Anti-Vision はstressLevel変化時のみ更新
            if (newStressLevel !== prevStressLevel) {
                const content = await engine.getAntiVision();
                if (!isCancelled) setAntiVision(content);
            }

            // Heartbeat Effect (Level 3以上)
            if (newStressLevel >= 3) {
                triggerHeartbeat();
            }

            // Jitter Effect (Level 2以上)
            if (newStressLevel >= 2) {
                triggerJitter(status.health);
            }

            // 再帰的 setTimeout: 前の処理が完了してから次を予約
            if (!isCancelled) {
                setTimeout(poll, 2000);
            }
        };

        // 初回: Anti-Vision を取得してからポーリング開始
        const init = async () => {
            if (isCancelled) return;
            const engine = await IdentityEngine.getInstance();
            const content = await engine.getAntiVision();
            if (!isCancelled) setAntiVision(content);
            poll();
        };

        init();

        return () => {
            isCancelled = true;
        };
    }, []); // 依存配列は空 (stressLevelRef/healthRef.current で最新値にアクセスするため)

    const triggerHeartbeat = async () => {
        await HapticEngine.pulseHeartbeat();

        // IH < 20% の場合は赤フラッシュも同期
        if (healthRef.current < 20) {
            // 前のアニメーションが実行中の場合は停止してから開始する
            // stopAnimation() を呼ばないと Animated.sequence が競合してフラッシュが乱れる
            heartbeatOpacity.stopAnimation();

            Animated.sequence([
                Animated.timing(heartbeatOpacity, {
                    toValue: 0.08,
                    duration: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(heartbeatOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    };

    const triggerJitter = (currentHealth: number) => {
        // Severity increases as health drops, capped at 5px
        const severity = Math.min(5, (50 - currentHealth) / 10); // 0 to 5

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

    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            <Animated.View style={[styles.container, { transform: jitter.getTranslateTransform() }]} pointerEvents="box-none">
                {children}
            </Animated.View>
            {/* 心拍同期赤フラッシュ (IH<20%のみ発火) */}
            <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: '#FF0000', opacity: heartbeatOpacity, zIndex: 490 }]}
                pointerEvents="none"
            />
            <AntiVisionBleed antiVision={antiVision} health={health} />
            <AntiVisionFragments antiVision={antiVision} health={health} />
            {isFeatureEnabled('EDGE_VIGNETTE') && <EdgeVignette health={health} />}
            {isFeatureEnabled('SCANLINE_OVERLAY') && <ScanlineOverlay health={health} />}
            <NoiseOverlay health={health} />
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
