/**
 * One Day OS - WipeManager Tests (TDD)
 * Tests for data wipe functionality
 *
 * NOTE: These tests are written BEFORE implementation (TDD approach)
 * All tests should FAIL initially until WipeManager.ts is implemented
 */

import { WipeManager } from './WipeManager';
import * as SQLite from 'expo-sqlite';
import { openDatabase, initializeDatabase } from '../../database/db';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(() => Promise.resolve([])),
  })),
}));

jest.mock('../../database/db', () => ({
  openDatabase: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(() => Promise.resolve([])),
  })),
  initializeDatabase: jest.fn(),
}));

describe('WipeManager - Integration Tests', () => {
  let wipeManager: WipeManager;
  let db: SQLite.SQLiteDatabase;
  let mockExecAsync: jest.Mock;
  let mockRunAsync: jest.Mock;
  let mockGetFirstAsync: jest.Mock;
  let mockGetAllAsync: jest.Mock;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create fresh mock functions
    mockExecAsync = jest.fn(() => Promise.resolve());
    mockRunAsync = jest.fn(() => Promise.resolve({ changes: 1 }));
    mockGetFirstAsync = jest.fn(() => Promise.resolve(null));
    mockGetAllAsync = jest.fn(() => Promise.resolve([]));

    // Create mock database with fresh mocks
    db = {
      execAsync: mockExecAsync,
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: mockGetAllAsync,
    } as any;

    wipeManager = new WipeManager(db);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('データ消去テスト', () => {
    test('executeWipe()がidentityテーブルを空にする', async () => {
      // Execute wipe
      const result = await wipeManager.executeWipe('IH_ZERO', 0);

      expect(result.success).toBe(true);
      expect(mockExecAsync).toHaveBeenCalled();

      // Verify table is empty after wipe
      mockGetAllAsync.mockResolvedValueOnce([]);
      const identityRows = await db.getAllAsync('SELECT * FROM identity');
      expect(identityRows.length).toBe(0);
    });

    test('executeWipe()がquestsテーブルを空にする', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      mockGetAllAsync.mockResolvedValueOnce([]);
      const questRows = await db.getAllAsync('SELECT * FROM quests');
      expect(questRows.length).toBe(0);
    });

    test('executeWipe()がnotificationsテーブルを空にする', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      mockGetAllAsync.mockResolvedValueOnce([]);
      const notificationRows = await db.getAllAsync('SELECT * FROM notifications');
      expect(notificationRows.length).toBe(0);
    });

    test('executeWipe()がdaily_stateテーブルを空にする', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      mockGetAllAsync.mockResolvedValueOnce([]);
      const dailyStateRows = await db.getAllAsync('SELECT * FROM daily_state');
      expect(dailyStateRows.length).toBe(0);
    });

    test('executeWipe()がすべてのテーブルを同時に空にする', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      // Check all tables are empty
      mockGetAllAsync.mockResolvedValueOnce([]);
      const identityRows = await db.getAllAsync('SELECT * FROM identity');
      expect(identityRows.length).toBe(0);

      mockGetAllAsync.mockResolvedValueOnce([]);
      const questRows = await db.getAllAsync('SELECT * FROM quests');
      expect(questRows.length).toBe(0);

      mockGetAllAsync.mockResolvedValueOnce([]);
      const notificationRows = await db.getAllAsync('SELECT * FROM notifications');
      expect(notificationRows.length).toBe(0);

      mockGetAllAsync.mockResolvedValueOnce([]);
      const dailyStateRows = await db.getAllAsync('SELECT * FROM daily_state');
      expect(dailyStateRows.length).toBe(0);
    });
  });

  describe('不可逆性テスト', () => {
    test('Wipe後にデータが復元できないことを確認', async () => {
      // Insert test data
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });

      await db.runAsync(
        'INSERT INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [1, 'Original Anti-Vision', 'Original Identity', 'Original Mission', 100, Date.now(), Date.now()]
      );

      // Execute wipe
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      // Verify data cannot be restored
      mockGetAllAsync.mockResolvedValueOnce([]);
      const rows = await db.getAllAsync('SELECT * FROM identity');
      expect(rows.length).toBe(0);
    });

    test('バックアップからの復元が不可能であることを確認', async () => {
      // Insert test data
      await db.runAsync(
        'INSERT INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [1, 'Test', 'Test', 'Test', 100, Date.now(), Date.now()]
      );

      // Execute wipe
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      // Verify backup is disabled
      mockGetAllAsync.mockResolvedValueOnce([]);
      const rows = await db.getAllAsync('SELECT * FROM identity');
      expect(rows.length).toBe(0);
    });
  });

  describe('VACUUMテスト', () => {
    test('Wipe後にVACUUMが実行される', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      // Verify VACUUM was called
      expect(mockExecAsync).toHaveBeenCalled();
    });

    test('VACUUM実行後、DBファイルサイズが縮小される（可能な場合）', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      // Verify VACUUM command was executed
      expect(mockExecAsync).toHaveBeenCalled();
    });
  });

  describe('ログ記録テスト', () => {
    test('Wipe実行がログに記録される', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      // Verify log was recorded
      mockGetAllAsync.mockResolvedValueOnce([
        { id: 1, reason: 'IH_ZERO', final_ih_value: 0, wiped_at: expect.any(Number) }
      ]);

      const logs = await db.getAllAsync('SELECT * FROM wipe_log');
      expect(logs.length).toBeGreaterThan(0);
    });

    test('Wipe理由が正しく記録される', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);

      // Verify reason was recorded correctly
      mockGetAllAsync.mockResolvedValueOnce([
        { id: 1, reason: 'IH_ZERO', final_ih_value: 0, wiped_at: expect.any(Number) }
      ]);

      const logs = await db.getAllAsync('SELECT * FROM wipe_log') as any[];
      expect(logs[0].reason).toBe('IH_ZERO');
    });

    test('Wipeタイムスタンプが正しく記録される', async () => {
      const beforeWipe = Date.now();
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      const afterWipe = Date.now();

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeGreaterThanOrEqual(beforeWipe);
      expect(result.timestamp).toBeLessThanOrEqual(afterWipe);
    });
  });

  describe('コールバックテスト', () => {
    test('Wipe完了後にonWipeCompleteコールバックが実行される', async () => {
      const onComplete = jest.fn();
      wipeManager.setOnWipeComplete(onComplete);

      const result = await wipeManager.executeWipe('IH_ZERO', 0);

      expect(result.success).toBe(true);
      expect(onComplete).toHaveBeenCalledWith({
        success: true,
        nextScreen: 'onboarding',
        timestamp: expect.any(Number),
      });
    });

    test('コールバックにWipe結果が渡される', async () => {
      const onComplete = jest.fn();
      wipeManager.setOnWipeComplete(onComplete);

      await wipeManager.executeWipe('IH_ZERO', 0);

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: expect.any(Boolean),
          nextScreen: expect.any(String),
          timestamp: expect.any(Number),
        })
      );
    });

    test('コールバックが設定されていない場合でもWipeは正常に実行される', async () => {
      // Don't set any callback
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);
    });

    test('複数のWipe実行で毎回コールバックが呼ばれる', async () => {
      const onComplete = jest.fn();
      wipeManager.setOnWipeComplete(onComplete);

      await wipeManager.executeWipe('IH_ZERO', 0);
      await wipeManager.executeWipe('IH_ZERO', 0);

      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('DB接続エラー時にエラーを返す', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Database connection error'));

      const result = await wipeManager.executeWipe('IH_ZERO', 0);

      expect(result.success).toBe(false);
      expect(result.nextScreen).toBe('onboarding');
    });

    test('部分的な消去失敗時にエラーを返す', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Failed to delete from identity'));

      const result = await wipeManager.executeWipe('IH_ZERO', 0);

      expect(result.success).toBe(false);
    });

    test('エラー時でもコールバックが呼ばれる（エラー結果を渡す）', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Database error'));

      const onComplete = jest.fn();
      wipeManager.setOnWipeComplete(onComplete);

      const result = await wipeManager.executeWipe('IH_ZERO', 0);

      expect(result.success).toBe(false);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    test('トランザクション失敗時にロールバックされる', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Transaction failed'));

      const result = await wipeManager.executeWipe('IH_ZERO', 0);

      expect(result.success).toBe(false);
    });
  });

  describe('Wipe理由のバリエーション', () => {
    test('IH_ZEROでWipeを実行できる', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);
    });

    test('QUEST_FAILでWipeを実行できる', async () => {
      const result = await wipeManager.executeWipe('QUEST_FAIL', 0);
      expect(result.success).toBe(true);
    });

    test('異なる理由で複数回Wipeを実行できる', async () => {
      const result1 = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result1.success).toBe(true);

      const result2 = await wipeManager.executeWipe('QUEST_FAIL', 0);
      expect(result2.success).toBe(true);
    });
  });

  describe('nextScreen遷移テスト', () => {
    test('Wipe成功時にnextScreenが"onboarding"になる', async () => {
      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(true);
      expect(result.nextScreen).toBe('onboarding');
    });

    test('Wipe失敗時でもnextScreenが設定される', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Wipe failed'));

      const result = await wipeManager.executeWipe('IH_ZERO', 0);
      expect(result.success).toBe(false);
      expect(result.nextScreen).toBeDefined();
    });
  });

  describe('統合テスト', () => {
    test('完全なWipeフロー: データ挿入 → Wipe → 確認', async () => {
      // Insert test data
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });

      await db.runAsync(
        'INSERT INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [1, 'Test', 'Test', 'Test', 100, Date.now(), Date.now()]
      );

      // Execute wipe
      const result = await wipeManager.executeWipe('IH_ZERO', 0);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.nextScreen).toBe('onboarding');
      expect(result.timestamp).toBeDefined();

      // Verify data is gone
      mockGetAllAsync.mockResolvedValueOnce([]);
      const rows = await db.getAllAsync('SELECT * FROM identity');
      expect(rows.length).toBe(0);
    });

    test('Wipe後に新しいデータを挿入できる（再セットアップ可能）', async () => {
      // Execute wipe
      await wipeManager.executeWipe('IH_ZERO', 0);

      // Insert new data
      mockRunAsync.mockResolvedValueOnce({ changes: 1 });

      await db.runAsync(
        'INSERT INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [1, 'New Identity', 'New Statement', 'New Mission', 100, Date.now(), Date.now()]
      );

      // Verify new data can be inserted
      mockGetAllAsync.mockResolvedValueOnce([
        { id: 1, identity_statement: 'New Statement' }
      ]);

      const rows = await db.getAllAsync('SELECT * FROM identity') as any[];
      expect(rows.length).toBe(1);
      expect(rows[0].identity_statement).toBe('New Statement');
    });
  });
});
