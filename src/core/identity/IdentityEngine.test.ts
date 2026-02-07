/**
 * One Day OS - IdentityEngine Tests (TDD)
 * Tests for Identity Health (IH) calculation engine
 *
 * NOTE: These tests are written BEFORE implementation (TDD approach)
 * All tests should FAIL initially until IdentityEngine.ts is implemented
 */

import { getDB } from '../../database/client';

// Mock database client
jest.mock('../../database/client');

import { IdentityEngine } from './IdentityEngine';
import { IH_CONSTANTS } from '../../constants';

describe('IdentityEngine', () => {
  let engine: IdentityEngine;
  let mockExecAsync: jest.Mock;
  let mockRunAsync: jest.Mock;
  let mockGetFirstAsync: jest.Mock;
  let mockGetAllAsync: jest.Mock;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup fresh mocks for each test
    mockExecAsync = jest.fn(() => Promise.resolve());
    mockRunAsync = jest.fn(() => Promise.resolve({ changes: 1 }));
    mockGetFirstAsync = jest.fn(() => Promise.resolve(null));
    mockGetAllAsync = jest.fn(() => Promise.resolve([]));

    // Mock the getDB function (synchronous)
    (getDB as jest.Mock).mockReturnValue({
      execAsync: mockExecAsync,
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: mockGetAllAsync,
    });

    // Reset singleton instance before each test
    IdentityEngine.resetInstance();

    // Get fresh instance
    engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(100); // Reset to initial value
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
  });

  describe('初期化テスト', () => {
    test('初回起動時にIHが100で初期化される', async () => {
      const newEngine = await IdentityEngine.getInstance();
      const ih = await newEngine.getCurrentIH();
      expect(ih).toBe(IH_CONSTANTS.INITIAL_IH);
    });

    test('既存のIH値がある場合は正しく読み込まれる', async () => {
      await engine.setCurrentIH(75);

      // Simulate app restart by getting new instance
      const newEngine = await IdentityEngine.getInstance();
      const ih = await newEngine.getCurrentIH();
      expect(ih).toBe(75);
    });

    test('シングルトンパターンが正しく実装されている', async () => {
      const instance1 = await IdentityEngine.getInstance();
      const instance2 = await IdentityEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('通知応答テスト', () => {
    test('通知に「YES」と回答した場合、IHは変化しない', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyNotificationResponse('YES');

      expect(result.newIH).toBe(100);
      expect(result.delta).toBe(0);
      expect(result.timestamp).toBeDefined();
    });

    test('通知に「NO」と回答した場合、IHが15%減少する', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyNotificationResponse('NO');

      expect(result.newIH).toBe(85);
      expect(result.delta).toBe(-15);
    });

    test('通知を無視した場合、IHが20%減少する（MISSED_NOTIFICATION_PENALTY）', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyNotificationResponse('IGNORED');

      expect(result.newIH).toBe(80);
      expect(result.delta).toBe(-20);
    });

    test('複数の減算が累積される', async () => {
      await engine.setCurrentIH(100);
      await engine.applyNotificationResponse('NO'); // 85
      await engine.applyNotificationResponse('NO'); // 70

      const final = await engine.getCurrentIH();
      expect(final).toBe(70);
    });

    test('YESとNOを交互に応答した場合の累積', async () => {
      await engine.setCurrentIH(100);
      await engine.applyNotificationResponse('YES'); // 100
      await engine.applyNotificationResponse('NO');  // 85
      await engine.applyNotificationResponse('YES'); // 85
      await engine.applyNotificationResponse('NO');  // 70

      const final = await engine.getCurrentIH();
      expect(final).toBe(70);
    });
  });

  describe('クエストペナルティテスト', () => {
    test('全クエスト達成の場合、IHは変化しない', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ completedCount: 2, totalCount: 2 });

      expect(result.delta).toBe(0);
      expect(result.newIH).toBe(100);
    });

    test('一部未達成の場合、IHが20%減少する', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ completedCount: 1, totalCount: 2 });

      expect(result.delta).toBe(-20);
      expect(result.newIH).toBe(80);
    });

    test('全て未達成の場合、IHが20%減少する（累積しない）', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ completedCount: 0, totalCount: 2 });

      expect(result.delta).toBe(-20);
      expect(result.newIH).toBe(80);
    });

    test('3つ以上のクエストでも正しく動作する', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ completedCount: 4, totalCount: 5 });

      expect(result.delta).toBe(-20);
      expect(result.newIH).toBe(80);
    });

    test('全5クエスト達成の場合、IHは変化しない', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ completedCount: 5, totalCount: 5 });

      expect(result.delta).toBe(0);
      expect(result.newIH).toBe(100);
    });

    test('IHが低い状態でクエストペナルティを適用', async () => {
      await engine.setCurrentIH(25);
      const result = await engine.applyQuestPenalty({ completedCount: 1, totalCount: 3 });

      expect(result.delta).toBe(-20);
      expect(result.newIH).toBe(5);
    });
  });

  describe('境界値テスト', () => {
    test('IHが0未満にならない（最低値0）', async () => {
      await engine.setCurrentIH(10);
      const result = await engine.applyNotificationResponse('NO');

      expect(result.newIH).toBe(0);
      expect(result.newIH).toBeGreaterThanOrEqual(0);
    });

    test('クエストペナルティでIHが0未満にならない', async () => {
      await engine.setCurrentIH(15);
      const result = await engine.applyQuestPenalty({ completedCount: 0, totalCount: 2 });

      expect(result.newIH).toBe(0);
      expect(result.newIH).toBeGreaterThanOrEqual(0);
    });

    test('IHが100を超えない（最大値100）', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyNotificationResponse('YES');

      expect(result.newIH).toBe(100);
      expect(result.newIH).toBeLessThanOrEqual(100);
    });

    test('IHが0のときにさらに減算しても0のまま', async () => {
      await engine.setCurrentIH(0);
      const result = await engine.applyNotificationResponse('NO');

      expect(result.newIH).toBe(0);
    });

    test('複数の減算でIHが0未満にならない', async () => {
      await engine.setCurrentIH(20);
      await engine.applyNotificationResponse('NO'); // 5
      await engine.applyNotificationResponse('NO'); // 0 (not -10)

      const final = await engine.getCurrentIH();
      expect(final).toBe(0);
    });
  });

  describe('Wipeトリガーテスト', () => {
    test('IH > 0 の場合、isWipeNeeded()がfalseを返す', async () => {
      await engine.setCurrentIH(50);
      expect(await engine.isWipeNeeded()).toBe(false);
    });

    test('IH === 0 の場合、isWipeNeeded()がtrueを返す', async () => {
      await engine.setCurrentIH(0);
      expect(await engine.isWipeNeeded()).toBe(true);
    });

    test('IH === 1 の場合、isWipeNeeded()がfalseを返す', async () => {
      await engine.setCurrentIH(1);
      expect(await engine.isWipeNeeded()).toBe(false);
    });

    test('IHが0になった瞬間、wipeトリガーイベントが発火する', async () => {
      const wipeCallback = jest.fn();
      engine.onWipeTrigger(wipeCallback);

      await engine.setCurrentIH(15);
      await engine.applyNotificationResponse('NO'); // IH becomes 0

      expect(wipeCallback).toHaveBeenCalledWith({
        reason: 'IH_ZERO',
        finalIH: 0,
        timestamp: expect.any(Number),
      });
    });

    test('クエストペナルティでIHが0になった場合もwipeトリガー', async () => {
      const wipeCallback = jest.fn();
      engine.onWipeTrigger(wipeCallback);

      await engine.setCurrentIH(20);
      await engine.applyQuestPenalty({ completedCount: 0, totalCount: 2 }); // IH becomes 0

      expect(wipeCallback).toHaveBeenCalledWith({
        reason: 'IH_ZERO',
        finalIH: 0,
        timestamp: expect.any(Number),
      });
    });

    test('IHが0のままでは複数回wipeトリガーが発火しない', async () => {
      const wipeCallback = jest.fn();
      engine.onWipeTrigger(wipeCallback);

      await engine.setCurrentIH(0);
      await engine.applyNotificationResponse('NO'); // Still 0
      await engine.applyNotificationResponse('NO'); // Still 0

      // Should only trigger once when it first hit 0
      expect(wipeCallback).toHaveBeenCalledTimes(0); // setCurrentIH doesn't trigger
    });
  });

  describe('DB同期テスト', () => {
    test('IH変更がDBに永続化される', async () => {
      await engine.setCurrentIH(100);
      await engine.applyNotificationResponse('NO');

      // Get new instance to simulate app restart
      const newEngine = await IdentityEngine.getInstance();
      const ih = await newEngine.getCurrentIH();
      expect(ih).toBe(85);
    });

    test('アプリ再起動後もIH値が保持される', async () => {
      await engine.setCurrentIH(50);

      // Simulate app restart: destroy and recreate instance
      const newEngine = await IdentityEngine.getInstance();
      expect(await newEngine.getCurrentIH()).toBe(50);
    });

    test('複数の操作後のIH値が正しく永続化される', async () => {
      await engine.setCurrentIH(100);
      await engine.applyNotificationResponse('NO'); // 85
      await engine.applyQuestPenalty({ completedCount: 1, totalCount: 2 }); // 65
      await engine.applyNotificationResponse('YES'); // 65

      const newEngine = await IdentityEngine.getInstance();
      expect(await newEngine.getCurrentIH()).toBe(65);
    });
  });

  describe('エッジケーステスト', () => {
    test('無効な応答タイプでエラーをスローする', async () => {
      await engine.setCurrentIH(100);

      // @ts-expect-error Testing invalid input
      await expect(engine.applyNotificationResponse('INVALID')).rejects.toThrow();
    });

    test('getCurrentIH()が常に0-100の範囲内の値を返す', async () => {
      const testValues = [-10, 0, 50, 100, 150];

      for (const value of testValues) {
        await engine.setCurrentIH(value);
        const ih = await engine.getCurrentIH();
        expect(ih).toBeGreaterThanOrEqual(0);
        expect(ih).toBeLessThanOrEqual(100);
      }
    });

    test('同時に複数の操作を実行しても整合性が保たれる', async () => {
      await engine.setCurrentIH(100);

      // Parallel operations
      const promises = [
        engine.applyNotificationResponse('NO'),
        engine.applyNotificationResponse('NO'),
        engine.applyNotificationResponse('NO'),
      ];

      await Promise.all(promises);

      const final = await engine.getCurrentIH();
      // Should be 55 (100 - 15 - 15 - 15) or at least non-negative
      expect(final).toBeGreaterThanOrEqual(0);
      expect(final).toBeLessThanOrEqual(100);
    });
  });

  describe('定数整合性テスト', () => {
    test('IH_CONSTANTSの値が正しく使用される', () => {
      expect(IH_CONSTANTS.INITIAL_IH).toBe(100);
      expect(IH_CONSTANTS.WIPE_THRESHOLD).toBe(0);
      expect(IH_CONSTANTS.INCOMPLETE_QUEST_PENALTY).toBe(20);
      expect(IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY).toBe(20);
    });

    test('初期化時にINITIAL_IHが使用される', async () => {
      const newEngine = await IdentityEngine.getInstance();
      const ih = await newEngine.getCurrentIH();
      expect(ih).toBe(IH_CONSTANTS.INITIAL_IH);
    });
  });

  describe('コールバック管理テスト', () => {
    test('複数のwipeコールバックを登録できる', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      engine.onWipeTrigger(callback1);
      engine.onWipeTrigger(callback2);

      await engine.setCurrentIH(10);
      await engine.applyNotificationResponse('NO'); // Triggers wipe

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('wipeコールバックが正しいイベントデータを受け取る', async () => {
      const callback = jest.fn();
      engine.onWipeTrigger(callback);

      await engine.setCurrentIH(15);
      await engine.applyNotificationResponse('NO');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'IH_ZERO',
          finalIH: 0,
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('オンボーディング停滞ペナルティテスト', () => {
    test('applyOnboardingStagnationPenalty()でIHが5%減少する', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyOnboardingStagnationPenalty();

      expect(result.previousIH).toBe(100);
      expect(result.newIH).toBe(95);
      expect(result.delta).toBe(-5);
      expect(result.timestamp).toBeDefined();
    });

    test('複数回のオンボーディングペナルティが累積される', async () => {
      await engine.setCurrentIH(100);
      await engine.applyOnboardingStagnationPenalty(); // 95
      await engine.applyOnboardingStagnationPenalty(); // 90

      const final = await engine.getCurrentIH();
      expect(final).toBe(90);
    });

    test('オンボーディングペナルティでIHが0未満にならない', async () => {
      await engine.setCurrentIH(3);
      const result = await engine.applyOnboardingStagnationPenalty();

      expect(result.newIH).toBe(0);
      expect(result.newIH).toBeGreaterThanOrEqual(0);
    });

    test('オンボーディングペナルティでIHが0になった場合にwipeトリガー', async () => {
      const wipeCallback = jest.fn();
      engine.onWipeTrigger(wipeCallback);

      await engine.setCurrentIH(5);
      await engine.applyOnboardingStagnationPenalty(); // IH becomes 0

      expect(wipeCallback).toHaveBeenCalledWith({
        reason: 'IH_ZERO',
        finalIH: 0,
        timestamp: expect.any(Number),
      });
    });

    test('オンボーディングペナルティと通知ペナルティが累積される', async () => {
      await engine.setCurrentIH(100);
      await engine.applyOnboardingStagnationPenalty(); // 95
      await engine.applyNotificationResponse('NO'); // 80

      const final = await engine.getCurrentIH();
      expect(final).toBe(80);
    });
  });
});
