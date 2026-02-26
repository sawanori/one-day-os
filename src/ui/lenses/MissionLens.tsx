
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../components/ThemedText';
import { GlitchText } from '../effects/GlitchText';
import { theme } from '../theme/theme';
import { IdentityEngine } from '../../core/identity/IdentityEngine';
import { JudgmentEngine } from '../../core/judgment';
import type { JudgmentLogRecord } from '../../core/judgment';

interface TombstoneEntry {
    time: string;
    responseIndicator: string;
    ihBefore: number;
    ihAfter: number;
}

function buildTombstones(records: JudgmentLogRecord[]): TombstoneEntry[] {
    return records
        .filter(r => r.response !== 'YES')
        .map(r => ({
            time: r.scheduled_at.substring(11, 16), // Extract HH:MM from datetime
            responseIndicator: r.response === 'NO' ? 'NO' : '...',
            ihBefore: r.ih_before,
            ihAfter: r.ih_after,
        }));
}

function calculateTotalLoss(entries: TombstoneEntry[]): number {
    return entries.reduce((sum, e) => sum + (e.ihAfter - e.ihBefore), 0);
}

export function MissionLens() {
    const { t } = useTranslation();
    const [mission, setMission] = useState<string>('Destroy old patterns.');
    const [antiVision, setAntiVision] = useState<string>('Stagnation. Regret. Wasted Potential.');
    const [health, setHealth] = useState(100);
    const [tombstones, setTombstones] = useState<TombstoneEntry[]>([]);

    useEffect(() => {
        const checkHealth = async () => {
            const engine = await IdentityEngine.getInstance();
            const status = await engine.checkHealth();
            setHealth(status.health);

            // Fetch tombstone data (piggyback on health check interval)
            try {
                const judgmentEngine = await JudgmentEngine.getInstance();
                const today = JudgmentEngine.getTodayDate();
                const todayLog = await judgmentEngine.getTodayJudgmentLog(today);
                setTombstones(buildTombstones(todayLog));
            } catch {
                // Judgment engine may not be initialized yet
            }
        };
        checkHealth();

        const interval = setInterval(checkHealth, 2000);
        return () => clearInterval(interval);
    }, []);

    // Calculate glitch severity based on health
    const glitchSeverity = Math.max(0, (100 - health) / 100);
    const totalLoss = calculateTotalLoss(tombstones);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.label}>LENS: 0.5x [1年計画]</ThemedText>
                <GlitchText
                    text={mission}
                    style={styles.missionText}
                    severity={glitchSeverity}
                />
            </View>

            <View style={[styles.section, styles.antiVisionContainer]}>
                <ThemedText type="subtitle" style={styles.fearLabel}>ANTI-VISION ({t('lens.mission.title')})</ThemedText>
                <ThemedText style={styles.antiVisionText}>{antiVision}</ThemedText>
            </View>

            {/* Judgment Log Tombstones */}
            {tombstones.length > 0 && (
                <View style={styles.tombstoneSection}>
                    <View style={styles.tombstoneDivider} />
                    <ThemedText style={styles.tombstoneLabel}>
                        {t('judgment.screen.judgmentLog')}
                    </ThemedText>

                    {tombstones.map((entry, index) => (
                        <View key={`tombstone-${index}`} style={styles.tombstoneRow}>
                            <ThemedText style={styles.tombstoneTime}>{entry.time}</ThemedText>
                            <ThemedText style={[
                                styles.tombstoneResponse,
                                entry.responseIndicator === 'NO' && styles.tombstoneResponseNo,
                            ]}>
                                {entry.responseIndicator}
                            </ThemedText>
                            <ThemedText style={styles.tombstoneIH}>
                                IH: {entry.ihBefore}{'\u2192'}{entry.ihAfter}
                            </ThemedText>
                        </View>
                    ))}

                    <ThemedText style={styles.tombstoneTotalLoss}>
                        {t('judgment.screen.totalLoss', { delta: totalLoss })}
                    </ThemedText>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: 24,
        justifyContent: 'center',
        minHeight: '100%',
    },
    section: {
        marginBottom: 40,
    },
    label: {
        color: theme.colors.secondary,
        letterSpacing: 2,
        marginBottom: 12,
        fontSize: 12,
        textTransform: 'uppercase',
        fontFamily: theme.typography.fontFamilySerif,
    },
    missionText: {
        color: theme.colors.foreground,
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 40,
    },
    antiVisionContainer: {
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.error,
        paddingLeft: 16,
    },
    fearLabel: {
        color: theme.colors.error,
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 8,
        fontFamily: theme.typography.fontFamilySerif,
    },
    antiVisionText: {
        color: theme.colors.foreground,
        fontSize: 16,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    tombstoneSection: {
        marginTop: 32,
    },
    tombstoneDivider: {
        height: 1,
        backgroundColor: theme.colors.error,
        marginBottom: 12,
    },
    tombstoneLabel: {
        color: theme.colors.error,
        fontSize: 12,
        letterSpacing: 2,
        fontFamily: theme.typography.fontFamilySerif,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    tombstoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    tombstoneTime: {
        color: theme.colors.secondary,
        fontSize: 12,
        fontFamily: theme.typography.fontFamily,
        width: 50,
    },
    tombstoneResponse: {
        color: theme.colors.secondary,
        fontSize: 12,
        fontFamily: theme.typography.fontFamily,
        width: 30,
    },
    tombstoneResponseNo: {
        color: theme.colors.error,
    },
    tombstoneIH: {
        color: theme.colors.secondary,
        fontSize: 12,
        fontFamily: theme.typography.fontFamily,
        flex: 1,
    },
    tombstoneTotalLoss: {
        color: theme.colors.error,
        fontSize: 12,
        fontFamily: theme.typography.fontFamily,
        marginTop: 8,
        fontWeight: '700',
    },
});
