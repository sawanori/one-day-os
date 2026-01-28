/**
 * One Day OS - DespairModeManager Tests (TDD)
 * Tests for despair mode state management after wipe
 *
 * NOTE: These tests are written BEFORE implementation (TDD approach)
 * All tests should FAIL initially until DespairModeManager.ts is implemented
 *
 * Context:
 * - DespairModeManager handles state after a wipe occurs
 * - Specification: "Data wipe only, immediate re-setup possible"
 * - After wipe: user directed to onboarding (no 24-hour lockout)
 */

import { DespairModeManager } from './DespairModeManager';
import { WipeManager } from '../identity/WipeManager';
import * as SQLite from 'expo-sqlite';
import { openDatabase, initializeDatabase, getAppState, updateAppState } from '../../database/db';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(() => Promise.resolve([])),
  })),
}));

// Mock database module
jest.mock('../../database/db', () => ({
  openDatabase: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(() => Promise.resolve([])),
  })),
  initializeDatabase: jest.fn(),
  getAppState: jest.fn(() => Promise.resolve('active')),
  updateAppState: jest.fn(() => Promise.resolve()),
}));

// Mock WipeManager
jest.mock('../identity/WipeManager');

describe('DespairModeManager - TDD Tests', () => {
  let despairManager: DespairModeManager;
  let db: SQLite.SQLiteDatabase;
  let wipeManager: WipeManager;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database
    db = await openDatabase();
    await initializeDatabase();

    // Create WipeManager instance
    wipeManager = new WipeManager(db);

    // Create DespairModeManager instance
    despairManager = new DespairModeManager(db, wipeManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // 1. 初期化テスト
  // ========================================
  describe('初期化テスト', () => {
    test('DespairModeManagerが正しく初期化される', () => {
      expect(despairManager).toBeDefined();
      expect(despairManager).toBeInstanceOf(DespairModeManager);
    });

    test('コンストラクタがデータベース接続を受け取る', () => {
      const manager = new DespairModeManager(db, wipeManager);
      expect(manager).toBeDefined();
    });

    test('コンストラクタがWipeManagerを受け取る', () => {
      const manager = new DespairModeManager(db, wipeManager);
      expect(manager).toBeDefined();
    });

    test('シングルトンパターンが実装されている', () => {
      const instance1 = DespairModeManager.getInstance(db, wipeManager);
      const instance2 = DespairModeManager.getInstance(db, wipeManager);
      expect(instance1).toBe(instance2);
    });

    test('getInstance()が同じインスタンスを返す', () => {
      const instance1 = DespairModeManager.getInstance(db, wipeManager);
      const instance2 = DespairModeManager.getInstance(db, wipeManager);
      expect(instance1).toStrictEqual(instance2);
    });
  });

  // ========================================
  // 2. Wipe処理テスト
  // ========================================
  describe('Wipe処理テスト', () => {
    test('onWipe()がWipeManagerを呼び出す', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      await despairManager.onWipe('IH_ZERO', 0);

      expect(mockExecuteWipe).toHaveBeenCalledWith('IH_ZERO', 0);
    });

    test('Wipe完了後にapp_stateが"despair"に更新される', async () => {
      const mockUpdateAppState = updateAppState as jest.Mock;
      mockUpdateAppState.mockResolvedValueOnce(undefined);

      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      await despairManager.onWipe('IH_ZERO', 0);

      expect(mockUpdateAppState).toHaveBeenCalledWith('despair');
    });

    test('Wipe後にnextScreen: "onboarding"が返される', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      const result = await despairManager.onWipe('IH_ZERO', 0);

      expect(result.nextScreen).toBe('onboarding');
    });

    test('Wipe結果オブジェクトが正しい構造を持つ', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      const result = await despairManager.onWipe('IH_ZERO', 0);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('nextScreen');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('reason');
    });

    test('異なるWipe理由でも正しく処理される', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'QUEST_FAIL',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      const result = await despairManager.onWipe('QUEST_FAIL', 0);

      expect(result.success).toBe(true);
      expect(result.reason).toBe('QUEST_FAIL');
    });
  });

  // ========================================
  // 3. 状態管理テスト
  // ========================================
  describe('状態管理テスト', () => {
    test('isDespairMode()がapp_stateをチェックする', async () => {
      const mockGetAppState = getAppState as jest.Mock;
      mockGetAppState.mockResolvedValueOnce('despair');

      const result = await despairManager.isDespairMode();

      expect(mockGetAppState).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('app_state === "despair"の場合、trueを返す', async () => {
      const mockGetAppState = getAppState as jest.Mock;
      mockGetAppState.mockResolvedValueOnce('despair');

      const result = await despairManager.isDespairMode();

      expect(result).toBe(true);
    });

    test('app_state === "active"の場合、falseを返す', async () => {
      const mockGetAppState = getAppState as jest.Mock;
      mockGetAppState.mockResolvedValueOnce('active');

      const result = await despairManager.isDespairMode();

      expect(result).toBe(false);
    });

    test('app_state === "onboarding"の場合、falseを返す', async () => {
      const mockGetAppState = getAppState as jest.Mock;
      mockGetAppState.mockResolvedValueOnce('onboarding');

      const result = await despairManager.isDespairMode();

      expect(result).toBe(false);
    });

    test('getCurrentState()が現在の状態を返す', async () => {
      const mockGetAppState = getAppState as jest.Mock;
      mockGetAppState.mockResolvedValueOnce('despair');

      const state = await despairManager.getCurrentState();

      expect(state).toBe('despair');
    });

    test('getCurrentState()が"active"状態を正しく返す', async () => {
      const mockGetAppState = getAppState as jest.Mock;
      mockGetAppState.mockResolvedValueOnce('active');

      const state = await despairManager.getCurrentState();

      expect(state).toBe('active');
    });
  });

  // ========================================
  // 4. リカバリーテスト（即座再セットアップ）
  // ========================================
  describe('リカバリーテスト（即座再セットアップ）', () => {
    test('exitDespairMode()でapp_stateが"onboarding"に変更される', async () => {
      const mockUpdateAppState = updateAppState as jest.Mock;
      mockUpdateAppState.mockResolvedValueOnce(undefined);

      await despairManager.exitDespairMode();

      expect(mockUpdateAppState).toHaveBeenCalledWith('onboarding');
    });

    test('exitDespairMode()後にisDespairMode()がfalseを返す', async () => {
      const mockUpdateAppState = updateAppState as jest.Mock;
      const mockGetAppState = getAppState as jest.Mock;

      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.exitDespairMode();

      mockGetAppState.mockResolvedValueOnce('onboarding');
      const result = await despairManager.isDespairMode();

      expect(result).toBe(false);
    });

    test('オンボーディング完了後に通常モードに移行できる', async () => {
      const mockUpdateAppState = updateAppState as jest.Mock;

      // Exit despair mode → onboarding
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.exitDespairMode();
      expect(mockUpdateAppState).toHaveBeenCalledWith('onboarding');

      // Complete onboarding → active
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await updateAppState('active');
      expect(mockUpdateAppState).toHaveBeenCalledWith('active');
    });

    test('再セットアップに時間制限がない（即座に可能）', async () => {
      const mockUpdateAppState = updateAppState as jest.Mock;
      mockUpdateAppState.mockResolvedValueOnce(undefined);

      // Exit despair mode immediately after wipe
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      await despairManager.onWipe('IH_ZERO', 0);
      await despairManager.exitDespairMode();

      // Should be able to exit immediately without waiting
      expect(mockUpdateAppState).toHaveBeenCalledWith('onboarding');
    });

    test('canResetup()が常にtrueを返す（時間制限なし）', async () => {
      const canReset = await despairManager.canResetup();
      expect(canReset).toBe(true);
    });

    test('Wipe直後でもcanResetup()がtrueを返す', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      await despairManager.onWipe('IH_ZERO', 0);
      const canReset = await despairManager.canResetup();

      expect(canReset).toBe(true);
    });
  });

  // ========================================
  // 5. イベントコールバックテスト
  // ========================================
  describe('イベントコールバックテスト', () => {
    test('onDespairEnter()コールバックが登録できる', () => {
      const callback = jest.fn();
      despairManager.onDespairEnter(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    test('onDespairEnter()コールバックがWipe時に実行される', async () => {
      const callback = jest.fn();
      despairManager.onDespairEnter(callback);

      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      await despairManager.onWipe('IH_ZERO', 0);

      expect(callback).toHaveBeenCalled();
    });

    test('onDespairExit()コールバックが登録できる', () => {
      const callback = jest.fn();
      despairManager.onDespairExit(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    test('onDespairExit()コールバックがexitDespairMode時に実行される', async () => {
      const callback = jest.fn();
      despairManager.onDespairExit(callback);

      const mockUpdateAppState = updateAppState as jest.Mock;
      mockUpdateAppState.mockResolvedValueOnce(undefined);

      await despairManager.exitDespairMode();

      expect(callback).toHaveBeenCalled();
    });

    test('複数のonDespairEnter()コールバックが登録・実行される', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      despairManager.onDespairEnter(callback1);
      despairManager.onDespairEnter(callback2);

      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      await despairManager.onWipe('IH_ZERO', 0);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('コールバックにWipe情報が渡される', async () => {
      const callback = jest.fn();
      despairManager.onDespairEnter(callback);

      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      await despairManager.onWipe('IH_ZERO', 0);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'IH_ZERO',
          timestamp: expect.any(Number),
        })
      );
    });
  });

  // ========================================
  // 6. 統合テスト
  // ========================================
  describe('統合テスト', () => {
    test('完全なフロー: IdentityEngine → DespairModeManager → オンボーディング', async () => {
      const mockUpdateAppState = updateAppState as jest.Mock;
      const mockGetAppState = getAppState as jest.Mock;

      // Step 1: Trigger wipe (from IdentityEngine)
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      mockUpdateAppState.mockResolvedValueOnce(undefined);
      const wipeResult = await despairManager.onWipe('IH_ZERO', 0);

      // Step 2: Verify despair mode is active
      expect(mockUpdateAppState).toHaveBeenCalledWith('despair');
      expect(wipeResult.nextScreen).toBe('onboarding');

      // Step 3: Check despair mode status
      mockGetAppState.mockResolvedValueOnce('despair');
      const isDespair = await despairManager.isDespairMode();
      expect(isDespair).toBe(true);

      // Step 4: Exit despair mode (start re-setup)
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.exitDespairMode();
      expect(mockUpdateAppState).toHaveBeenCalledWith('onboarding');

      // Step 5: Complete onboarding → active
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await updateAppState('active');
      expect(mockUpdateAppState).toHaveBeenCalledWith('active');
    });

    test('Wipe → 即座再セットアップ → 正常動作の完全フロー', async () => {
      const mockUpdateAppState = updateAppState as jest.Mock;
      const mockGetAppState = getAppState as jest.Mock;

      // Execute wipe
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.onWipe('IH_ZERO', 0);

      // Immediately exit despair mode (no waiting period)
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.exitDespairMode();

      // Verify state is onboarding
      mockGetAppState.mockResolvedValueOnce('onboarding');
      const state = await despairManager.getCurrentState();
      expect(state).toBe('onboarding');

      // Complete setup → active
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await updateAppState('active');

      // Verify back to normal
      mockGetAppState.mockResolvedValueOnce('active');
      const isActive = await despairManager.isDespairMode();
      expect(isActive).toBe(false);
    });

    test('複数回のWipe-リカバリーサイクル', async () => {
      const mockUpdateAppState = updateAppState as jest.Mock;
      const mockGetAppState = getAppState as jest.Mock;

      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      // First cycle
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.onWipe('IH_ZERO', 0);
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.exitDespairMode();

      // Second cycle
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.onWipe('QUEST_FAIL', 0);
      mockUpdateAppState.mockResolvedValueOnce(undefined);
      await despairManager.exitDespairMode();

      // Verify both cycles completed
      expect(mockUpdateAppState).toHaveBeenCalledWith('despair');
      expect(mockUpdateAppState).toHaveBeenCalledWith('onboarding');
    });

    test('エラーハンドリング: Wipe失敗時の状態管理', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: false,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: [],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      const result = await despairManager.onWipe('IH_ZERO', 0);

      expect(result.success).toBe(false);
      // Even if wipe fails, should still provide nextScreen
      expect(result.nextScreen).toBeDefined();
    });
  });

  // ========================================
  // 7. エッジケーステスト
  // ========================================
  describe('エッジケーステスト', () => {
    test('despairモードでない時にexitDespairMode()を呼んでもエラーにならない', async () => {
      const mockGetAppState = getAppState as jest.Mock;
      const mockUpdateAppState = updateAppState as jest.Mock;

      mockGetAppState.mockResolvedValueOnce('active');
      mockUpdateAppState.mockResolvedValueOnce(undefined);

      await expect(despairManager.exitDespairMode()).resolves.not.toThrow();
    });

    test('コールバックが設定されていなくてもWipeは正常に実行される', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      const result = await despairManager.onWipe('IH_ZERO', 0);

      expect(result.success).toBe(true);
    });

    test('DB接続エラー時に適切にエラーハンドリングする', async () => {
      const mockGetAppState = getAppState as jest.Mock;
      mockGetAppState.mockRejectedValueOnce(new Error('Database connection error'));

      await expect(despairManager.isDespairMode()).rejects.toThrow('Database connection error');
    });

    test('同時に複数のWipe要求が来た場合の処理', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      const promise1 = despairManager.onWipe('IH_ZERO', 0);
      const promise2 = despairManager.onWipe('IH_ZERO', 0);

      const results = await Promise.all([promise1, promise2]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  // ========================================
  // 8. 仕様確認テスト
  // ========================================
  describe('仕様確認テスト: "Data wipe only, immediate re-setup possible"', () => {
    test('24時間ロックアウトが存在しない', async () => {
      const hasLockout = despairManager.hasLockoutPeriod();
      expect(hasLockout).toBe(false);
    });

    test('Wipe後、即座にオンボーディングに遷移できる', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      const result = await despairManager.onWipe('IH_ZERO', 0);

      expect(result.nextScreen).toBe('onboarding');
      expect(result.success).toBe(true);
    });

    test('データ消去のみが行われ、アプリは使用可能', async () => {
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      const result = await despairManager.onWipe('IH_ZERO', 0);

      expect(result.success).toBe(true);
      expect(result.tablesCleared).toContain('identity');
      expect(result.nextScreen).toBe('onboarding');
    });

    test('再セットアップに制限がない', async () => {
      const canReset = await despairManager.canResetup();
      expect(canReset).toBe(true);

      // Even after multiple wipes
      const mockExecuteWipe = jest.fn().mockResolvedValue({
        success: true,
        timestamp: Date.now(),
        reason: 'IH_ZERO',
        tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
        nextScreen: 'onboarding',
      });
      wipeManager.executeWipe = mockExecuteWipe;

      await despairManager.onWipe('IH_ZERO', 0);
      await despairManager.onWipe('IH_ZERO', 0);
      await despairManager.onWipe('IH_ZERO', 0);

      const canResetAfterWipes = await despairManager.canResetup();
      expect(canResetAfterWipes).toBe(true);
    });
  });
});
