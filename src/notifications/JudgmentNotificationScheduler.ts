/**
 * One Day OS - JudgmentNotificationScheduler
 * Schedules OS notifications for judgment times from the daily schedule.
 * Separate from NotificationScheduler (legacy identity questions).
 */

import * as Notifications from 'expo-notifications';
import type { CalendarTriggerInput } from 'expo-notifications';
import { JudgmentEngine } from '../core/judgment';
import type { JudgmentScheduleRecord } from '../core/judgment';
import type { JudgmentCategory } from '../constants';

const JUDGMENT_CATEGORY_IDENTIFIER = 'JUDGMENT';

export class JudgmentNotificationScheduler {
  /**
   * Initialize judgment notification category (tap-to-open only, no action buttons).
   * Must be called before scheduling any judgment notifications.
   */
  static async initialize(): Promise<void> {
    // Summons model: no action buttons on notifications.
    // User must tap the notification to open the app, then face the 5-second judgment.
    // We still register the category (without actions) so existing references work.
    await Notifications.setNotificationCategoryAsync(
      JUDGMENT_CATEGORY_IDENTIFIER,
      [] // No action buttons — tap-to-open only
    );
  }

  /**
   * Schedule OS notifications for each judgment in the daily schedule.
   * Skips entries that are already fired, already have a notification_id, or whose time has passed.
   */
  static async scheduleNotifications(
    schedules: JudgmentScheduleRecord[]
  ): Promise<void> {
    const engine = await JudgmentEngine.getInstance();
    const now = new Date();

    for (const schedule of schedules) {
      // Skip already fired
      if (schedule.is_fired === 1) continue;

      // Skip if notification already scheduled
      if (schedule.notification_id) continue;

      // Parse scheduled_time (HH:MM format)
      const [hourStr, minuteStr] = schedule.scheduled_time.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // Skip if time has already passed today
      const scheduledDate = new Date(
        `${schedule.scheduled_date}T${schedule.scheduled_time}:00`
      );
      if (scheduledDate <= now) continue;

      // Get rendered question for notification body
      const { questionKey, questionRendered } =
        await engine.getRenderedQuestion(schedule.category as JudgmentCategory);

      // Schedule the OS notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'ONE DAY OS',
          body: questionRendered,
          categoryIdentifier: JUDGMENT_CATEGORY_IDENTIFIER,
          interruptionLevel: 'timeSensitive',
          data: {
            type: 'judgment',
            scheduleId: schedule.id,
            category: schedule.category,
            questionKey,
            questionRendered,
            scheduledAt: `${schedule.scheduled_date}T${schedule.scheduled_time}:00`,
          },
        },
        trigger: {
          type: 'calendar',
          hour,
          minute,
          repeats: false,
        } as CalendarTriggerInput,
      });

      // Store notification ID in DB (does NOT mark as fired)
      await engine.updateNotificationId(schedule.id, notificationId);
    }
  }

  /**
   * Cancel all scheduled judgment notifications.
   * Filters by categoryIdentifier to avoid cancelling legacy identity notifications.
   */
  static async cancelAllJudgmentNotifications(): Promise<void> {
    const allScheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of allScheduled) {
      if (
        notification.content.categoryIdentifier ===
        JUDGMENT_CATEGORY_IDENTIFIER
      ) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  }
}
