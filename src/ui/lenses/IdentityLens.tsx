
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../components/ThemedText';
import { GlitchText } from '../effects/GlitchText';
import { theme } from '../theme/theme';
import { IdentityEngine } from '../../core/identity/IdentityEngine';
import { JudgmentEngine } from '../../core/judgment';
import type { JudgmentLogRecord } from '../../core/judgment';
import { InsuranceManager } from '../../core/insurance';
import { getDB } from '../../database/client';

interface GhostText {
    id: number;
    text: string;
    color: string;
    opacity: number;
    top: number;
    left: number;
    fontSize: number;
}

function buildGhostTexts(records: JudgmentLogRecord[]): GhostText[] {
    const gridPositions = 12;
    const noCount = records.filter(r => r.response === 'NO').length;
    const highDensity = noCount >= 3;

    return records.map((record, index) => {
        const isNo = record.response === 'NO';
        const posIndex = record.id % gridPositions;
        const row = Math.floor(posIndex / 4);
        const col = posIndex % 4;

        return {
            id: record.id,
            text: isNo ? 'NO' : '...',
            color: isNo ? theme.colors.error : theme.colors.secondary,
            opacity: isNo ? 0.08 : 0.12,
            top: 10 + row * 30 + ((record.id * 7) % 20),
            left: 5 + col * 25 + ((record.id * 13) % 15),
            fontSize: highDensity ? 14 + (record.id % 10) : 18 + (record.id % 14),
        };
    });
}

export function IdentityLens() {
    const { t } = useTranslation();
    const [identity, setIdentity] = useState<string>('');
    const [health, setHealth] = useState(100);
    const [ghostTexts, setGhostTexts] = useState<GhostText[]>([]);
    const ghostTextsRef = useRef<GhostText[]>([]);
    const [purchaseCount, setPurchaseCount] = useState(0);

    useEffect(() => {
        InsuranceManager.getTotalPurchaseCount()
            .then(setPurchaseCount)
            .catch(() => setPurchaseCount(0));
    }, []);

    useEffect(() => {
        const checkHealth = async () => {
            const engine = await IdentityEngine.getInstance();
            const status = await engine.checkHealth();
            setHealth(status.health);

            // Load identity statement from database
            try {
                const db = getDB();
                const row = await db.getFirstAsync<{ identity_statement: string }>(
                    'SELECT identity_statement FROM identity WHERE id = 1'
                );
                if (row?.identity_statement) {
                    setIdentity(row.identity_statement);
                }
            } catch {
                // Database may not be initialized yet
            }

            // Fetch ghost text data (piggyback on health check interval)
            try {
                const judgmentEngine = await JudgmentEngine.getInstance();
                const failedJudgments = await judgmentEngine.getRecentFailedJudgments();
                const newGhosts = buildGhostTexts(failedJudgments);
                // Only update if the data actually changed (by comparing IDs)
                const currentIds = ghostTextsRef.current.map(g => g.id).join(',');
                const newIds = newGhosts.map(g => g.id).join(',');
                if (currentIds !== newIds) {
                    ghostTextsRef.current = newGhosts;
                    setGhostTexts(newGhosts);
                }
            } catch {
                // Judgment engine may not be initialized yet
            }
        };
        checkHealth();

        const interval = setInterval(checkHealth, 2000);
        return () => clearInterval(interval);
    }, []);

    // Calculate glitch severity based on health (0-100 -> 0-1)
    const glitchSeverity = Math.max(0, (100 - health) / 100);

    return (
        <View style={styles.container}>
            {/* Ghost text layer - behind everything */}
            {ghostTexts.map((ghost) => (
                <ThemedText
                    key={`ghost-${ghost.id}`}
                    style={[
                        styles.ghostText,
                        {
                            top: `${ghost.top}%`,
                            left: `${ghost.left}%`,
                            color: ghost.color,
                            opacity: ghost.opacity,
                            fontSize: ghost.fontSize,
                        },
                    ]}
                >
                    {ghost.text}
                </ThemedText>
            ))}

            <ThemedText type="subtitle" style={styles.label}>LENS: 1.0x [IDENTITY - {t('lens.identity.title')}]</ThemedText>

            {purchaseCount > 0 && (
                <View style={paidStyles.container}>
                    <ThemedText style={paidStyles.label}>
                        {t('insurance.postPurchase.label', { defaultValue: 'PAID IDENTITY' })}
                        {purchaseCount > 1 && ` \u00D7${purchaseCount}`}
                        {purchaseCount >= 3 && ` \u2014 ${t('insurance.postPurchase.serialCoward', { defaultValue: 'SERIAL COWARD' })}`}
                    </ThemedText>
                </View>
            )}

            <View style={styles.card}>
                <ThemedText style={styles.prefix}>I AM A PERSON WHO...</ThemedText>
                <GlitchText
                    text={identity.replace('I am a person who ', '')}
                    style={styles.statement}
                    severity={glitchSeverity}
                />
            </View>

            <ThemedText style={styles.subtext}>
                {t('lens.identity.subtitle')}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 24,
        justifyContent: 'center',
    },
    label: {
        color: theme.colors.secondary,
        letterSpacing: 2,
        marginBottom: 24,
        fontSize: 12,
        alignSelf: 'center',
        fontFamily: theme.typography.fontFamilySerif,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: 32,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: theme.colors.secondary,
    },
    prefix: {
        color: theme.colors.secondary,
        fontSize: 14,
        marginBottom: 16,
        textTransform: 'uppercase',
        fontFamily: theme.typography.fontFamilySerif,
    },
    statement: {
        color: theme.colors.foreground,
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 36,
    },
    subtext: {
        color: theme.colors.secondary,
        marginTop: 24,
        textAlign: 'center',
        fontSize: 12,
    },
    ghostText: {
        position: 'absolute',
        fontFamily: theme.typography.fontFamily,
        fontWeight: '700',
        zIndex: -1,
    },
});

const paidStyles = StyleSheet.create({
    container: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.colors.accent,
        marginBottom: 16,
        alignSelf: 'stretch',
    },
    label: {
        color: theme.colors.accent,
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: theme.typography.fontFamily,
        letterSpacing: 3,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
});
