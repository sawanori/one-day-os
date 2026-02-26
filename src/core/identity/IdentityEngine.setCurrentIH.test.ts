/**
 * One Day OS - IdentityEngine.setCurrentIH wipe trigger tests
 * Tests that setCurrentIH correctly fires wipe callbacks when IH reaches 0
 */

import { getDB } from '../../database/client';

// Mock database client
jest.mock('../../database/client');

// Mock transaction to pass-through
jest.mock('../../database/transaction', () => ({
  runInTransaction: jest.fn((fn: () => Promise<unknown>) => fn()),
}));

import { IdentityEngine } from './IdentityEngine';

describe('IdentityEngine.setCurrentIH wipe trigger', () => {
  let mockRunAsync: jest.Mock;
  let mockGetFirstAsync: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRunAsync = jest.fn(() => Promise.resolve({ changes: 1 }));
    mockGetFirstAsync = jest.fn(() => Promise.resolve(null));

    (getDB as jest.Mock).mockReturnValue({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: jest.fn(() => Promise.resolve([])),
    });

    IdentityEngine.resetInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('IH=0到達時にwipeCallbackが発火する', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(5); // IH=5 にセット (wipeInProgress=false のまま)

    // wipeInProgress フラグをリセットするため resetInstance → 再取得
    // 実際には setCurrentIH(5) では wipeInProgress は true にならない
    const wipeSpy = jest.fn();
    engine.onWipeTrigger(wipeSpy);

    // Act: IH=0 に設定 (previousIH=5 > 0 かつ wipeInProgress=false)
    await engine.setCurrentIH(0);

    // Assert
    expect(wipeSpy).toHaveBeenCalledTimes(1);
    expect(wipeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'IH_ZERO', finalIH: 0 })
    );
  });

  it('IH=0 → IH=0 への再設定では二重発火しない (wipeInProgressフラグ)', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(5);

    const wipeSpy = jest.fn();
    engine.onWipeTrigger(wipeSpy);

    await engine.setCurrentIH(0); // 1回目: 発火
    await engine.setCurrentIH(0); // 2回目: wipeInProgress=true のため発火しない

    expect(wipeSpy).toHaveBeenCalledTimes(1);
  });

  it('IH > 0 への設定ではwipeCallbackが発火しない', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(50);

    const wipeSpy = jest.fn();
    engine.onWipeTrigger(wipeSpy);

    await engine.setCurrentIH(30); // IH=30, 0に達していない

    expect(wipeSpy).not.toHaveBeenCalled();
  });

  it('resetInstance後は新規インスタンスでwipeInProgressがリセットされる', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(5);

    const wipeSpy1 = jest.fn();
    engine.onWipeTrigger(wipeSpy1);
    await engine.setCurrentIH(0); // wipeInProgress = true

    expect(wipeSpy1).toHaveBeenCalledTimes(1);

    // インスタンスをリセットして新しいインスタンスを取得
    IdentityEngine.resetInstance();
    const newEngine = await IdentityEngine.getInstance();
    await newEngine.setCurrentIH(5);

    const wipeSpy2 = jest.fn();
    newEngine.onWipeTrigger(wipeSpy2);
    await newEngine.setCurrentIH(0); // 新しいインスタンス: wipeInProgress = false → 発火

    expect(wipeSpy2).toHaveBeenCalledTimes(1);
  });

  it('applyNotificationResponse経由でIH=0到達時もwipeCallbackが発火する', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(15);

    const wipeSpy = jest.fn();
    engine.onWipeTrigger(wipeSpy);

    // NO: -15 → IH=0
    await engine.applyNotificationResponse('NO');

    expect(wipeSpy).toHaveBeenCalledTimes(1);
    expect(wipeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'IH_ZERO', finalIH: 0 })
    );
  });

  it('applyQuestPenalty経由でIH=0到達時もwipeCallbackが発火する', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(20);

    const wipeSpy = jest.fn();
    engine.onWipeTrigger(wipeSpy);

    // 未完了クエスト: -20 → IH=0
    await engine.applyQuestPenalty({ completedCount: 0, totalCount: 2 });

    expect(wipeSpy).toHaveBeenCalledTimes(1);
    expect(wipeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'IH_ZERO', finalIH: 0 })
    );
  });
});
