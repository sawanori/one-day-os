/**
 * One Day OS - NotificationScheduler
 * Manages scheduling and handling of daily identity questions
 */

import * as Notifications from 'expo-notifications';

// Notification schedule matching test expectations
const FIVE_QUESTIONS = [
  { hour: 11, minute: 0, question: '何を避けようとしているか？' },
  { hour: 13, minute: 30, question: '観察者は君を「何を望んでいる人間」と結論づけるか？' },
  { hour: 15, minute: 15, question: '嫌いな人生か、欲しい人生か？' },
  { hour: 17, minute: 0, question: '重要でないふりをしている「最重要のこと」は？' },
  { hour: 19, minute: 30, question: '今日の行動は本当の欲求か、自己防衛か？' },
] as const;

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
      }),
    });

    // Set up notification categories with YES/NO actions
    await Notifications.setNotificationCategoryAsync(
      CATEGORY_IDENTIFIER,
      [
        {
          identifier: 'YES',
          buttonTitle: 'YES',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'NO',
          buttonTitle: 'NO',
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
   * Schedule all 5 daily notifications
   * @returns Array of notification IDs
   */
  async scheduleDailyNotifications(): Promise<string[]> {
    // Ensure we have permission before scheduling
    await this.ensurePermissions();

    const notificationIds: string[] = [];

    // Schedule each of the 5 daily notifications
    for (const { hour, minute, question } of FIVE_QUESTIONS) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: question,
          categoryIdentifier: CATEGORY_IDENTIFIER,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        } as any, // Type assertion needed due to mock limitations
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
