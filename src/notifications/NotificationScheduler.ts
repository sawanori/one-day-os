/**
 * One Day OS - NotificationScheduler
 * Manages scheduling and handling of daily identity questions
 */

import * as Notifications from 'expo-notifications';
import type { CalendarTriggerInput } from 'expo-notifications';
import i18n from 'i18next';
import { getReflectionQuestions, NOTIFICATION_SCHEDULE } from '../constants';

const CATEGORY_IDENTIFIER = 'IDENTITY_QUESTION';

export class NotificationScheduler {
  /**
   * Initialize notification system
   * Sets up notification handler and categories
   */
  async initialize(): Promise<void> {
    // Set up notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Set up notification categories with YES/NO actions
    await Notifications.setNotificationCategoryAsync(
      CATEGORY_IDENTIFIER,
      [
        {
          identifier: 'YES',
          buttonTitle: i18n.t('notification.buttonYes'),
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'NO',
          buttonTitle: i18n.t('notification.buttonNo'),
          options: {
            opensAppToForeground: true,
          },
        },
      ]
    );
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<{ granted: boolean; status: string }> {
    const { status } = await Notifications.requestPermissionsAsync();
    return {
      granted: status === 'granted',
      status,
    };
  }

  /**
   * Check and ensure notification permissions are granted
   */
  private async ensurePermissions(): Promise<void> {
    // Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      // Already granted, no need to request
      return;
    }

    if (existingStatus === 'denied') {
      // Permission was explicitly denied
      throw new Error('Notification permission not granted');
    }

    // Request permission if undetermined
    const { status: newStatus } = await Notifications.requestPermissionsAsync();

    if (newStatus !== 'granted') {
      throw new Error('Notification permission not granted');
    }
  }

  /**
   * Schedule all 6 daily notifications
   * @returns Array of notification IDs
   */
  async scheduleDailyNotifications(): Promise<string[]> {
    // Ensure we have permission before scheduling
    await this.ensurePermissions();

    const notificationIds: string[] = [];

    // Schedule each of the 6 daily notifications
    for (let i = 0; i < NOTIFICATION_SCHEDULE.TIMES.length; i++) {
      const { hour, minute } = NOTIFICATION_SCHEDULE.TIMES[i];
      const question = getReflectionQuestions()[i];

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: question,
          body: i18n.t('notification.body'),
          categoryIdentifier: CATEGORY_IDENTIFIER,
        },
        trigger: {
          type: 'calendar',
          hour,
          minute,
          repeats: true,
        } as CalendarTriggerInput
      });

      notificationIds.push(notificationId);
    }

    return notificationIds;
  }

  /**
   * Cancel all scheduled notifications and reschedule them
   * Useful for timezone changes or schedule updates
   * @returns Array of new notification IDs
   */
  async rescheduleDailyNotifications(): Promise<string[]> {
    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule new notifications
    return this.scheduleDailyNotifications();
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Cancel a specific notification by ID
   * @param notificationId The ID of the notification to cancel
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Get all currently scheduled notifications
   * @returns Array of scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }
}
