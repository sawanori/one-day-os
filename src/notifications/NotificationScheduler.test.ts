/**
 * One Day OS - NotificationScheduler Tests (TDD)
 * Tests for notification scheduling system
 *
 * NOTE: These tests are written BEFORE implementation (TDD approach)
 * All tests should FAIL initially until NotificationScheduler.ts is implemented
 */

import { NotificationScheduler } from './NotificationScheduler';
import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
}));

// Notification schedule based on updated constants/index.ts
const EXPECTED_NOTIFICATION_TIMES = [
  { hour: 6, minute: 0, question: 'あなたは誰か？' },
  { hour: 9, minute: 0, question: 'あなたは何をしているか？' },
  { hour: 12, minute: 0, question: 'なぜそれをしているのか？' },
  { hour: 15, minute: 0, question: 'それはあなたのアイデンティティと一致しているか？' },
  { hour: 18, minute: 0, question: '次に何をするか？' },
  { hour: 21, minute: 0, question: '何を避けようとしているか？' },
] as const;

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
    jest.clearAllMocks();

    // Default: permissions granted
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('mock-notification-id');
    (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(undefined);
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('スケジュール設定テスト', () => {
    test('6つの通知が正しい時間にスケジュールされる', async () => {
      const notificationIds = await scheduler.scheduleDailyNotifications();

      // Should schedule exactly 5 notifications
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
      expect(notificationIds).toHaveLength(6);
      expect(notificationIds.every(id => typeof id === 'string')).toBe(true);
    });

    test('6:00の通知が正しく設定される', async () => {
      await scheduler.scheduleDailyNotifications();

      const firstCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
      expect(firstCall.content.title).toBe('あなたは誰か？');
      expect(firstCall.trigger.hour).toBe(6);
      expect(firstCall.trigger.minute).toBe(0);
      expect(firstCall.trigger.repeats).toBe(true);
    });

    test('9:00の通知が正しく設定される', async () => {
      await scheduler.scheduleDailyNotifications();

      const secondCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[1][0];
      expect(secondCall.content.title).toBe('あなたは何をしているか？');
      expect(secondCall.trigger.hour).toBe(9);
      expect(secondCall.trigger.minute).toBe(0);
      expect(secondCall.trigger.repeats).toBe(true);
    });

    test('12:00の通知が正しく設定される', async () => {
      await scheduler.scheduleDailyNotifications();

      const thirdCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[2][0];
      expect(thirdCall.content.title).toBe('なぜそれをしているのか？');
      expect(thirdCall.trigger.hour).toBe(12);
      expect(thirdCall.trigger.minute).toBe(0);
      expect(thirdCall.trigger.repeats).toBe(true);
    });

    test('15:00の通知が正しく設定される', async () => {
      await scheduler.scheduleDailyNotifications();

      const fourthCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[3][0];
      expect(fourthCall.content.title).toBe('それはあなたのアイデンティティと一致しているか？');
      expect(fourthCall.trigger.hour).toBe(15);
      expect(fourthCall.trigger.minute).toBe(0);
      expect(fourthCall.trigger.repeats).toBe(true);
    });

    test('18:00の通知が正しく設定される', async () => {
      await scheduler.scheduleDailyNotifications();

      const fifthCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[4][0];
      expect(fifthCall.content.title).toBe('次に何をするか？');
      expect(fifthCall.trigger.hour).toBe(18);
      expect(fifthCall.trigger.minute).toBe(0);
      expect(fifthCall.trigger.repeats).toBe(true);
    });

    test('21:00の通知が正しく設定される', async () => {
      await scheduler.scheduleDailyNotifications();

      const sixthCall = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[5][0];
      expect(sixthCall.content.title).toBe('何を避けようとしているか？');
      expect(sixthCall.trigger.hour).toBe(21);
      expect(sixthCall.trigger.minute).toBe(0);
      expect(sixthCall.trigger.repeats).toBe(true);
    });

    test('各通知に正しい質問テキストが設定される', async () => {
      await scheduler.scheduleDailyNotifications();

      const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
      expect(calls).toHaveLength(6);

      EXPECTED_NOTIFICATION_TIMES.forEach((expected, index) => {
        const call = calls[index][0];
        expect(call.content.title).toBe(expected.question);
      });
    });

    test('通知がリピート設定される（毎日）', async () => {
      await scheduler.scheduleDailyNotifications();

      const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;

      calls.forEach(call => {
        expect(call[0].trigger.repeats).toBe(true);
      });
    });

    test('通知トリガーがDailyTriggerInputとして正しく設定される', async () => {
      await scheduler.scheduleDailyNotifications();

      const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;

      EXPECTED_NOTIFICATION_TIMES.forEach((expected, index) => {
        const trigger = calls[index][0].trigger;
        expect(trigger.hour).toBe(expected.hour);
        expect(trigger.minute).toBe(expected.minute);
        expect(trigger.repeats).toBe(true);
      });
    });
  });

  describe('権限要求テスト', () => {
    test('通知権限が未許可の場合、権限を要求する', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      await scheduler.scheduleDailyNotifications();

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
    });

    test('権限が拒否された場合、エラーを返す', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await expect(scheduler.scheduleDailyNotifications()).rejects.toThrow(
        'Notification permission not granted'
      );

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    test('権限要求が拒否された場合、エラーを返す', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      await expect(scheduler.scheduleDailyNotifications()).rejects.toThrow(
        'Notification permission not granted'
      );

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    test('権限が許可された場合、スケジュールが実行される', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await scheduler.scheduleDailyNotifications();

      expect(result).toHaveLength(6);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
    });

    test('権限が初回で許可されている場合、権限要求をスキップする', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      await scheduler.scheduleDailyNotifications();

      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
    });
  });

  describe('再スケジュールテスト', () => {
    test('rescheduleDailyNotifications()が既存の通知をキャンセルする', async () => {
      await scheduler.rescheduleDailyNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    test('rescheduleDailyNotifications()が新しい通知をスケジュールする', async () => {
      const notificationIds = await scheduler.rescheduleDailyNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
      expect(notificationIds).toHaveLength(6);
    });

    test('再スケジュール後も6つの通知が正しくスケジュールされる', async () => {
      await scheduler.rescheduleDailyNotifications();

      const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
      expect(calls).toHaveLength(6);

      EXPECTED_NOTIFICATION_TIMES.forEach((expected, index) => {
        const call = calls[index][0];
        expect(call.content.title).toBe(expected.question);
        expect(call.trigger.hour).toBe(expected.hour);
        expect(call.trigger.minute).toBe(expected.minute);
      });
    });

    test('タイムゾーン変更時に正しく再スケジュールされる', async () => {
      // First schedule
      await scheduler.scheduleDailyNotifications();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);

      jest.clearAllMocks();

      // Reschedule after timezone change
      await scheduler.rescheduleDailyNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
    });

    test('再スケジュールが複数回実行されても正しく動作する', async () => {
      await scheduler.rescheduleDailyNotifications();
      await scheduler.rescheduleDailyNotifications();
      await scheduler.rescheduleDailyNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(3);
      // Last call should have scheduled 6 notifications
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(18); // 3 times * 6
    });
  });

  describe('キャンセルテスト', () => {
    test('cancelAllNotifications()がすべての通知をキャンセルする', async () => {
      await scheduler.cancelAllNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    });

    test('スケジュール後にキャンセルできる', async () => {
      await scheduler.scheduleDailyNotifications();
      await scheduler.cancelAllNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
    });

    test('特定の通知のみキャンセルできる', async () => {
      const notificationIds = await scheduler.scheduleDailyNotifications();
      const idToCancel = notificationIds[0];

      await scheduler.cancelNotification(idToCancel);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(idToCancel);
    });

    test('複数の特定通知を個別にキャンセルできる', async () => {
      const notificationIds = await scheduler.scheduleDailyNotifications();

      await scheduler.cancelNotification(notificationIds[0]);
      await scheduler.cancelNotification(notificationIds[2]);
      await scheduler.cancelNotification(notificationIds[4]);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(notificationIds[0]);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(notificationIds[2]);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(notificationIds[4]);
    });

    test('存在しない通知IDをキャンセルしてもエラーが発生しない', async () => {
      await expect(scheduler.cancelNotification('non-existent-id')).resolves.not.toThrow();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('通知アクションテスト', () => {
    test('YES/NOボタンが通知に含まれる', async () => {
      await scheduler.scheduleDailyNotifications();

      const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;

      calls.forEach(call => {
        const categoryIdentifier = call[0].content.categoryIdentifier;
        expect(categoryIdentifier).toBe('IDENTITY_QUESTION');
      });
    });

    test('アクションボタンのIDが正しく設定される', async () => {
      // Initialize should set up categories
      await scheduler.initialize();

      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
        'IDENTITY_QUESTION',
        [
          {
            identifier: 'YES',
            buttonTitle: 'はい',
            options: {
              opensAppToForeground: true,
            },
          },
          {
            identifier: 'NO',
            buttonTitle: 'いいえ',
            options: {
              opensAppToForeground: true,
            },
          },
        ]
      );
    });

    test('通知カテゴリが初期化時に設定される', async () => {
      await scheduler.initialize();

      expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalled();
    });

    test('各通知が正しいカテゴリ識別子を持つ', async () => {
      await scheduler.scheduleDailyNotifications();

      const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;

      calls.forEach(call => {
        expect(call[0].content.categoryIdentifier).toBe('IDENTITY_QUESTION');
      });
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('expo-notificationsが利用不可の場合の挙動', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Notifications API not available')
      );

      await expect(scheduler.scheduleDailyNotifications()).rejects.toThrow(
        'Notifications API not available'
      );
    });

    test('スケジュール失敗時の挙動', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Failed to schedule notification')
      );

      await expect(scheduler.scheduleDailyNotifications()).rejects.toThrow(
        'Failed to schedule notification'
      );
    });

    test('部分的なスケジュール失敗時の挙動', async () => {
      let callCount = 0;
      (Notifications.scheduleNotificationAsync as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 3) {
          return Promise.reject(new Error('Failed on third notification'));
        }
        return Promise.resolve(`notification-${callCount}`);
      });

      await expect(scheduler.scheduleDailyNotifications()).rejects.toThrow(
        'Failed on third notification'
      );
    });

    test('キャンセル失敗時にエラーをスローする', async () => {
      (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(
        new Error('Failed to cancel notifications')
      );

      await expect(scheduler.cancelAllNotifications()).rejects.toThrow(
        'Failed to cancel notifications'
      );
    });

    test('権限取得失敗時のエラーハンドリング', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission check failed')
      );

      await expect(scheduler.scheduleDailyNotifications()).rejects.toThrow(
        'Permission check failed'
      );
    });

    test('権限要求失敗時のエラーハンドリング', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission request failed')
      );

      await expect(scheduler.scheduleDailyNotifications()).rejects.toThrow(
        'Permission request failed'
      );
    });
  });

  describe('通知ハンドラー設定テスト', () => {
    test('initialize()が通知ハンドラーを設定する', async () => {
      await scheduler.initialize();

      expect(Notifications.setNotificationHandler).toHaveBeenCalled();
    });

    test('通知ハンドラーが正しい設定で呼ばれる', async () => {
      await scheduler.initialize();

      const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0];
      expect(handler).toHaveProperty('handleNotification');
      expect(typeof handler.handleNotification).toBe('function');
    });

    test('handleNotificationが正しい値を返す', async () => {
      await scheduler.initialize();

      const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0];
      const result = await handler.handleNotification();

      expect(result).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    });
  });

  describe('スケジュール状態確認テスト', () => {
    test('getScheduledNotifications()がスケジュール済み通知を返す', async () => {
      const mockScheduledNotifications = [
        { identifier: 'notif-1', content: {}, trigger: {} },
        { identifier: 'notif-2', content: {}, trigger: {} },
      ];

      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(
        mockScheduledNotifications
      );

      const result = await scheduler.getScheduledNotifications();

      expect(result).toEqual(mockScheduledNotifications);
      expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    test('スケジュール後にgetScheduledNotifications()を呼べる', async () => {
      await scheduler.scheduleDailyNotifications();

      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
        { identifier: 'notif-1', content: {}, trigger: {} },
        { identifier: 'notif-2', content: {}, trigger: {} },
        { identifier: 'notif-3', content: {}, trigger: {} },
        { identifier: 'notif-4', content: {}, trigger: {} },
        { identifier: 'notif-5', content: {}, trigger: {} },
        { identifier: 'notif-6', content: {}, trigger: {} },
      ]);

      const result = await scheduler.getScheduledNotifications();
      expect(result).toHaveLength(6);
    });
  });

  describe('境界値テスト', () => {
    test('同じ通知を複数回スケジュールしても問題ない', async () => {
      await scheduler.scheduleDailyNotifications();
      await scheduler.cancelAllNotifications();
      await scheduler.scheduleDailyNotifications();

      // Should work without errors
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    test('スケジュール前にキャンセルを呼んでもエラーにならない', async () => {
      await expect(scheduler.cancelAllNotifications()).resolves.not.toThrow();
    });

    test('通知が0件の状態でgetScheduledNotificationsを呼べる', async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);

      const result = await scheduler.getScheduledNotifications();
      expect(result).toEqual([]);
    });
  });

  describe('並行処理テスト', () => {
    test('複数のスケジュール操作が並行実行されても整合性が保たれる', async () => {
      const promises = [
        scheduler.scheduleDailyNotifications(),
        scheduler.scheduleDailyNotifications(),
        scheduler.scheduleDailyNotifications(),
      ];

      await Promise.all(promises);

      // Should complete without errors
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    test('スケジュールとキャンセルが並行実行されても問題ない', async () => {
      const promises = [
        scheduler.scheduleDailyNotifications(),
        scheduler.cancelAllNotifications(),
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });
});
