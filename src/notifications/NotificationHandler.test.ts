/**
 * One Day OS - NotificationHandler Tests (TDD)
 * Tests for notification response handling and timeout detection
 *
 * NOTE: These tests are written BEFORE implementation (TDD approach)
 * All tests should FAIL initially until NotificationHandler.ts is implemented
 */

import { NotificationHandler } from './NotificationHandler';
import { IdentityEngine } from '../core/identity/IdentityEngine';
import * as SQLite from 'expo-sqlite';
import { AppState, AppStateStatus } from 'react-native';
import { NOTIFICATION_SCHEDULE } from '../constants';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

// Mock react-native AppState
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

// Mock IdentityEngine
jest.mock('../core/identity/IdentityEngine', () => ({
  IdentityEngine: {
    getInstance: jest.fn(),
    resetInstance: jest.fn(),
  },
}));

describe('NotificationHandler', () => {
  let handler: NotificationHandler;
  let mockEngine: jest.Mocked<IdentityEngine>;
  let mockDb: jest.Mocked<SQLite.SQLiteDatabase>;
  let appStateListener: ((state: AppStateStatus) => void) | null = null;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    appStateListener = null;

    // Create mock database
    mockDb = {
      runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      getAllAsync: jest.fn().mockResolvedValue([]),
      execAsync: jest.fn().mockResolvedValue(undefined),
    } as any;

    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

    // Create mock IdentityEngine
    mockEngine = {
      getCurrentIH: jest.fn().mockResolvedValue(100),
      setCurrentIH: jest.fn().mockResolvedValue(undefined),
      applyNotificationResponse: jest.fn().mockResolvedValue({
        previousIH: 100,
        newIH: 100,
        delta: 0,
        timestamp: Date.now(),
      }),
      applyQuestPenalty: jest.fn().mockResolvedValue({
        previousIH: 100,
        newIH: 80,
        delta: -20,
        timestamp: Date.now(),
      }),
      isWipeNeeded: jest.fn().mockResolvedValue(false),
      onWipeTrigger: jest.fn(),
    } as any;

    (IdentityEngine.getInstance as jest.Mock).mockResolvedValue(mockEngine);

    // Capture AppState listener
    (AppState.addEventListener as jest.Mock).mockImplementation((event: string, listener: any) => {
      if (event === 'change') {
        appStateListener = listener;
      }
      return { remove: jest.fn() };
    });

    // Create handler
    handler = new NotificationHandler();
    await handler.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('応答処理テスト', () => {
    test('YES応答時、IdentityEngineにYESを渡す', async () => {
      const notificationId = 'notif-123';

      await handler.handleResponse(notificationId, 'YES');

      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('YES');
    });

    test('NO応答時、IdentityEngineにNOを渡す（IH -15%）', async () => {
      mockEngine.applyNotificationResponse.mockResolvedValue({
        previousIH: 100,
        newIH: 85,
        delta: -15,
        timestamp: Date.now(),
      });

      const notificationId = 'notif-456';
      const result = await handler.handleResponse(notificationId, 'NO');

      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('NO');
      expect(result.delta).toBe(-15);
      expect(result.newIH).toBe(85);
    });

    test('応答がDBに永続化される', async () => {
      const notificationId = 'notif-789';
      const now = Date.now();

      await handler.handleResponse(notificationId, 'YES');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        expect.arrayContaining([
          expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/), // ISO timestamp
          notificationId,
        ])
      );
    });

    test('YES応答後にIHが変化しない', async () => {
      mockEngine.applyNotificationResponse.mockResolvedValue({
        previousIH: 100,
        newIH: 100,
        delta: 0,
        timestamp: Date.now(),
      });

      const result = await handler.handleResponse('notif-001', 'YES');

      expect(result.delta).toBe(0);
      expect(result.newIH).toBe(100);
    });

    test('応答済み通知に再度応答してもエラーにならない', async () => {
      const notificationId = 'notif-duplicate';

      await handler.handleResponse(notificationId, 'YES');
      await expect(handler.handleResponse(notificationId, 'YES')).resolves.not.toThrow();
    });

    test('無効な通知IDでもエラーにならない', async () => {
      await expect(handler.handleResponse('invalid-id', 'YES')).resolves.not.toThrow();
    });
  });

  describe('タイムアウト検知テスト', () => {
    test('15分以上未応答の通知がIGNORED扱いになる', async () => {
      const now = Date.now();
      const timeoutThreshold = now - NOTIFICATION_SCHEDULE.TIMEOUT_MS;

      // Mock DB to return a notification that timed out
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 1,
          scheduled_time: new Date(timeoutThreshold - 1000).toISOString(), // 1 second past timeout
          responded_at: null,
        },
      ]);

      mockEngine.applyNotificationResponse.mockResolvedValue({
        previousIH: 100,
        newIH: 85,
        delta: -15,
        timestamp: Date.now(),
      });

      await handler.checkTimeoutsOnResume();

      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('IGNORED');
    });

    test('タイムアウトチェックがAppState復帰時に実行される', async () => {
      const checkTimeoutsSpy = jest.spyOn(handler, 'checkTimeoutsOnResume');

      // Simulate app going to background then foreground
      if (appStateListener) {
        appStateListener('background');
        appStateListener('active');
      }

      expect(checkTimeoutsSpy).toHaveBeenCalled();
    });

    test('タイムアウト時にIdentityEngineにIGNOREDを渡す（IH -15%）', async () => {
      const now = Date.now();
      const timeoutThreshold = now - NOTIFICATION_SCHEDULE.TIMEOUT_MS;

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 2,
          scheduled_time: new Date(timeoutThreshold - 5000).toISOString(),
          responded_at: null,
        },
      ]);

      mockEngine.applyNotificationResponse.mockResolvedValue({
        previousIH: 85,
        newIH: 70,
        delta: -15,
        timestamp: Date.now(),
      });

      await handler.checkTimeoutsOnResume();

      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('IGNORED');
    });

    test('タイムアウト時刻がDB永続化から計算される', async () => {
      const scheduledTime = new Date(Date.now() - NOTIFICATION_SCHEDULE.TIMEOUT_MS - 10000);

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 3,
          scheduled_time: scheduledTime.toISOString(),
          responded_at: null,
        },
      ]);

      await handler.checkTimeoutsOnResume();

      // Should mark as timed out in DB
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        expect.arrayContaining([
          expect.any(String), // timeout_at timestamp
          3, // notification id
        ])
      );
    });

    test('タイムアウト前の通知は処理されない', async () => {
      const now = Date.now();
      const recentTime = new Date(now - (NOTIFICATION_SCHEDULE.TIMEOUT_MS / 2)); // Only 2.5 minutes ago

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 4,
          scheduled_time: recentTime.toISOString(),
          responded_at: null,
        },
      ]);

      await handler.checkTimeoutsOnResume();

      expect(mockEngine.applyNotificationResponse).not.toHaveBeenCalled();
    });

    test('複数のタイムアウト通知を一度に処理する', async () => {
      const now = Date.now();
      const oldTime = now - NOTIFICATION_SCHEDULE.TIMEOUT_MS - 10000;

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 5,
          scheduled_time: new Date(oldTime).toISOString(),
          responded_at: null,
        },
        {
          id: 6,
          scheduled_time: new Date(oldTime - 5000).toISOString(),
          responded_at: null,
        },
        {
          id: 7,
          scheduled_time: new Date(oldTime - 10000).toISOString(),
          responded_at: null,
        },
      ]);

      await handler.checkTimeoutsOnResume();

      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledTimes(3);
      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('IGNORED');
    });
  });

  describe('通知追跡テスト', () => {
    test('発火した通知がDBに記録される（scheduled_time）', async () => {
      const notificationId = 'notif-scheduled-1';
      const scheduledTime = new Date();

      await handler.recordNotificationFired(notificationId, scheduledTime);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([
          scheduledTime.toISOString(),
        ])
      );
    });

    test('応答済み通知は再度処理されない', async () => {
      const notificationId = 'notif-responded';

      // Mock DB to show notification was already responded to
      mockDb.getFirstAsync.mockResolvedValue({
        id: 1,
        scheduled_time: new Date().toISOString(),
        responded_at: new Date().toISOString(),
      });

      await handler.handleResponse(notificationId, 'YES');

      // Should not call applyNotificationResponse again
      expect(mockEngine.applyNotificationResponse).not.toHaveBeenCalled();
    });

    test('未応答通知の一覧を取得できる', async () => {
      const now = Date.now();

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 8,
          scheduled_time: new Date(now - 60000).toISOString(), // 1 minute ago
          responded_at: null,
        },
        {
          id: 9,
          scheduled_time: new Date(now - 120000).toISOString(), // 2 minutes ago
          responded_at: null,
        },
      ]);

      const pending = await handler.getPendingNotifications();

      expect(pending).toHaveLength(2);
      expect(pending[0]).toHaveProperty('id', 8);
      expect(pending[1]).toHaveProperty('id', 9);
    });

    test('応答済み通知は未応答一覧に含まれない', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 10,
          scheduled_time: new Date().toISOString(),
          responded_at: null,
        },
        {
          id: 11,
          scheduled_time: new Date().toISOString(),
          responded_at: new Date().toISOString(), // Already responded
        },
      ]);

      const pending = await handler.getPendingNotifications();

      expect(pending).toHaveLength(1);
      expect(pending[0]).toHaveProperty('id', 10);
    });
  });

  describe('IdentityEngine連携テスト', () => {
    test('応答処理後にIdentityEngine.applyNotificationResponse()が呼ばれる', async () => {
      await handler.handleResponse('notif-engine-1', 'YES');

      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledTimes(1);
      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('YES');
    });

    test('IHが0になった場合のwipeトリガー処理', async () => {
      mockEngine.applyNotificationResponse.mockResolvedValue({
        previousIH: 15,
        newIH: 0,
        delta: -15,
        timestamp: Date.now(),
      });

      mockEngine.isWipeNeeded.mockResolvedValue(true);

      const result = await handler.handleResponse('notif-wipe', 'NO');

      expect(result.newIH).toBe(0);
      expect(mockEngine.isWipeNeeded).toHaveBeenCalled();
    });

    test('複数のNO応答でIHが段階的に減少する', async () => {
      mockEngine.applyNotificationResponse
        .mockResolvedValueOnce({
          previousIH: 100,
          newIH: 85,
          delta: -15,
          timestamp: Date.now(),
        })
        .mockResolvedValueOnce({
          previousIH: 85,
          newIH: 70,
          delta: -15,
          timestamp: Date.now(),
        })
        .mockResolvedValueOnce({
          previousIH: 70,
          newIH: 55,
          delta: -15,
          timestamp: Date.now(),
        });

      await handler.handleResponse('notif-multi-1', 'NO');
      await handler.handleResponse('notif-multi-2', 'NO');
      const result = await handler.handleResponse('notif-multi-3', 'NO');

      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledTimes(3);
      expect(result.newIH).toBe(55);
    });

    test('IdentityEngineのエラーが適切に伝播する', async () => {
      mockEngine.applyNotificationResponse.mockRejectedValue(
        new Error('IdentityEngine error')
      );

      await expect(handler.handleResponse('notif-error', 'YES')).rejects.toThrow(
        'IdentityEngine error'
      );
    });
  });

  describe('AppState連携テスト', () => {
    test('フォアグラウンド復帰時にcheckTimeoutsOnResume()が実行される', async () => {
      const checkSpy = jest.spyOn(handler, 'checkTimeoutsOnResume');

      if (appStateListener) {
        appStateListener('active');
      }

      expect(checkSpy).toHaveBeenCalled();
    });

    test('バックグラウンド中は処理しない', async () => {
      const checkSpy = jest.spyOn(handler, 'checkTimeoutsOnResume');

      if (appStateListener) {
        appStateListener('background');
      }

      expect(checkSpy).not.toHaveBeenCalled();
    });

    test('inactive状態では処理しない', async () => {
      const checkSpy = jest.spyOn(handler, 'checkTimeoutsOnResume');

      if (appStateListener) {
        appStateListener('inactive');
      }

      expect(checkSpy).not.toHaveBeenCalled();
    });

    test('AppStateリスナーが初期化時に登録される', async () => {
      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    test('background -> active遷移で1回だけcheckTimeoutsが呼ばれる', async () => {
      const checkSpy = jest.spyOn(handler, 'checkTimeoutsOnResume');

      if (appStateListener) {
        appStateListener('background');
        appStateListener('active');
      }

      expect(checkSpy).toHaveBeenCalledTimes(1);
    });

    test('複数のactive状態遷移で複数回checkTimeoutsが呼ばれる', async () => {
      const checkSpy = jest.spyOn(handler, 'checkTimeoutsOnResume');

      if (appStateListener) {
        appStateListener('background');
        appStateListener('active');
        appStateListener('background');
        appStateListener('active');
      }

      expect(checkSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('DB接続エラー時の挙動', async () => {
      mockDb.runAsync.mockRejectedValue(new Error('Database connection failed'));

      await expect(handler.handleResponse('notif-db-error', 'YES')).rejects.toThrow(
        'Database connection failed'
      );
    });

    test('無効な応答タイプの処理', async () => {
      // TypeScript would catch this, but test runtime behavior
      await expect(
        handler.handleResponse('notif-invalid', 'INVALID' as any)
      ).rejects.toThrow();
    });

    test('DB読み込みエラー時のタイムアウトチェック', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('Failed to read from DB'));

      await expect(handler.checkTimeoutsOnResume()).rejects.toThrow(
        'Failed to read from DB'
      );
    });

    test('タイムアウト処理中のDB更新エラー', async () => {
      const now = Date.now();
      const oldTime = now - NOTIFICATION_SCHEDULE.TIMEOUT_MS - 10000;

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 99,
          scheduled_time: new Date(oldTime).toISOString(),
          responded_at: null,
        },
      ]);

      mockDb.runAsync.mockRejectedValue(new Error('Failed to update notification'));

      await expect(handler.checkTimeoutsOnResume()).rejects.toThrow(
        'Failed to update notification'
      );
    });

    test('空の通知ID処理', async () => {
      await expect(handler.handleResponse('', 'YES')).rejects.toThrow();
    });

    test('nullの通知ID処理', async () => {
      await expect(handler.handleResponse(null as any, 'YES')).rejects.toThrow();
    });
  });

  describe('境界値テスト', () => {
    test('タイムアウト閾値ちょうどの通知は処理されない', async () => {
      const fixedNow = 1000000000000; // Fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const exactThreshold = fixedNow - NOTIFICATION_SCHEDULE.TIMEOUT_MS;

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 100,
          scheduled_time: new Date(exactThreshold).toISOString(),
          responded_at: null,
        },
      ]);

      await handler.checkTimeoutsOnResume();

      expect(mockEngine.applyNotificationResponse).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    test('タイムアウト閾値+1msの通知は処理される', async () => {
      const fixedNow = 1000000000000; // Fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const justPastThreshold = fixedNow - NOTIFICATION_SCHEDULE.TIMEOUT_MS - 1;

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 101,
          scheduled_time: new Date(justPastThreshold).toISOString(),
          responded_at: null,
        },
      ]);

      await handler.checkTimeoutsOnResume();

      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('IGNORED');

      jest.restoreAllMocks();
    });

    test('未来の通知は処理されない', async () => {
      const fixedNow = 1000000000000; // Fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      const futureTime = new Date(fixedNow + 60000); // 1 minute in future

      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 102,
          scheduled_time: futureTime.toISOString(),
          responded_at: null,
        },
      ]);

      await handler.checkTimeoutsOnResume();

      expect(mockEngine.applyNotificationResponse).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('並行処理テスト', () => {
    test('複数の応答が並行処理されても整合性が保たれる', async () => {
      const promises = [
        handler.handleResponse('notif-p1', 'YES'),
        handler.handleResponse('notif-p2', 'NO'),
        handler.handleResponse('notif-p3', 'YES'),
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
      expect(mockEngine.applyNotificationResponse).toHaveBeenCalledTimes(3);
    });

    test('タイムアウトチェックと応答処理が並行実行されても問題ない', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const promises = [
        handler.checkTimeoutsOnResume(),
        handler.handleResponse('notif-concurrent', 'YES'),
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('初期化テスト', () => {
    test('initialize()がIdentityEngineを取得する', async () => {
      const newHandler = new NotificationHandler();
      await newHandler.initialize();

      expect(IdentityEngine.getInstance).toHaveBeenCalled();
    });

    test('initialize()がDBを開く', async () => {
      const newHandler = new NotificationHandler();
      await newHandler.initialize();

      expect(SQLite.openDatabaseAsync).toHaveBeenCalled();
    });

    test('initialize()がAppStateリスナーを登録する', async () => {
      jest.clearAllMocks();

      const newHandler = new NotificationHandler();
      await newHandler.initialize();

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    test('初期化前の操作がエラーになる', async () => {
      const newHandler = new NotificationHandler();

      await expect(newHandler.handleResponse('test', 'YES')).rejects.toThrow();
    });
  });

  describe('クリーンアップテスト', () => {
    test('dispose()がAppStateリスナーを解除する', async () => {
      const mockRemove = jest.fn();
      (AppState.addEventListener as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      const newHandler = new NotificationHandler();
      await newHandler.initialize();
      await newHandler.dispose();

      expect(mockRemove).toHaveBeenCalled();
    });

    test('dispose後の操作がエラーになる', async () => {
      const newHandler = new NotificationHandler();
      await newHandler.initialize();
      await newHandler.dispose();

      await expect(newHandler.handleResponse('test', 'YES')).rejects.toThrow();
    });
  });
});
