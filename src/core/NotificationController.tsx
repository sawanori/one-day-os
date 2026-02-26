
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { JudgmentEngine } from './judgment';
import { getDB } from '../database/client';
import { DB_TABLES, JUDGMENT_CONSTANTS } from '../constants';
import type { JudgmentCategory } from '../constants';

/**
 * NotificationController
 *
 * Summons model: notifications are tap-to-open only (no YES/NO action buttons).
 * When user taps a judgment notification:
 *   1. Check if judgment already recorded (dedup via judgment_log)
 *   2. Check 3-minute window: if >3 min since scheduledAt, apply -5 summons penalty
 *   3. Navigate to /judgment screen with params for the 5-second countdown
 */
export function NotificationController() {
    const router = useRouter();

    useEffect(() => {
        // Handle Notification Response (tap-to-open only in summons model)
        const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
            const data = response.notification.request.content.data;

            if (data?.type === 'judgment') {
                const scheduleId = data.scheduleId ? Number(data.scheduleId) : null;
                const category = (data.category as JudgmentCategory) || 'SURVIVAL';
                const questionKey = String(data.questionKey || '');
                const questionRendered = String(data.questionRendered || response.notification.request.content.body || '');
                const scheduledAt = String(data.scheduledAt || new Date().toISOString());

                // Dedup: check if this judgment was already recorded
                if (scheduleId) {
                    try {
                        const db = getDB();
                        const existing = db.getFirstSync<{ id: number }>(
                            `SELECT id FROM ${DB_TABLES.JUDGMENT_LOG} WHERE schedule_id = ? LIMIT 1`,
                            [scheduleId]
                        );
                        if (existing) {
                            // Already handled (e.g. by overdue resolution)
                            return;
                        }
                    } catch (error) {
                        console.error('[NotificationController] Dedup check failed:', error);
                    }
                }

                // Check 3-minute summons window and apply penalty if late
                try {
                    const engine = await JudgmentEngine.getInstance();
                    const scheduledTime = new Date(scheduledAt).getTime();
                    const now = Date.now();
                    const elapsedSeconds = (now - scheduledTime) / 1000;

                    if (elapsedSeconds > JUDGMENT_CONSTANTS.SUMMONS_TIMEOUT_SECONDS) {
                        // User was late opening the app — apply summons missed penalty (-5)
                        const penaltyResult = await engine.applySummonsPenalty(scheduleId, scheduledAt);
                        if (penaltyResult.wipeTriggered) {
                            console.warn('[NotificationController] Summons penalty triggered wipe');
                        }
                    }
                } catch (error) {
                    console.error('[NotificationController] Summons penalty check failed:', error);
                }

                // Navigate to judgment screen for 5-second in-app countdown.
                // Use the question from the notification payload (already rendered at schedule time)
                // to ensure consistency between what the user sees in the notification and in-app.
                setTimeout(() => {
                    router.push({
                        pathname: '/judgment',
                        params: {
                            scheduleId: String(scheduleId || ''),
                            category,
                            questionKey,
                            question: questionRendered,
                            scheduledAt,
                        }
                    });
                }, 500);
            }
        });

        return () => subscription.remove();
    }, [router]);

    return null;
}
