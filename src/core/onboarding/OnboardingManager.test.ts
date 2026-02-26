/**
 * One Day OS - OnboardingManager Tests (TDD)
 * Tests for 5-step onboarding flow
 *
 * NOTE: These tests are written BEFORE implementation (TDD approach)
 * All tests should FAIL initially until OnboardingManager.ts is implemented
 */

import { getDB, databaseInit } from '../../database/client';

// Mock database client module
jest.mock('../../database/client');

import { OnboardingManager } from './OnboardingManager';

type OnboardingStep = 'covenant' | 'excavation' | 'identity' | 'mission' | 'quests' | 'optical_calibration' | 'first_judgment' | 'complete';

interface OnboardingData {
  antiVision: string;
  identity: string;
  mission: string;
  quests: [string, string];
}

describe('OnboardingManager', () => {
  let manager: OnboardingManager;
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

    // Mock databaseInit to resolve immediately
    (databaseInit as jest.Mock).mockResolvedValue(undefined);

    // Reset singleton instance before each test
    OnboardingManager.resetInstance();

    // Get fresh instance
    manager = await OnboardingManager.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初期化テスト', () => {
    test('OnboardingManagerが正しく初期化される', async () => {
      const instance = await OnboardingManager.getInstance();
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(OnboardingManager);
    });

    test('シングルトンパターンが正しく実装されている', async () => {
      const instance1 = await OnboardingManager.getInstance();
      const instance2 = await OnboardingManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('初回起動時に初期化処理が実行される', async () => {
      expect(mockGetFirstAsync).toHaveBeenCalled();
    });
  });

  describe('オンボーディング状態テスト', () => {
    test('初回起動時にisOnboardingComplete()がfalseを返す', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ state: 'onboarding' });
      const isComplete = await manager.isOnboardingComplete();
      expect(isComplete).toBe(false);
    });

    test('全ステップ完了後にisOnboardingComplete()がtrueを返す', async () => {
      // Complete all steps
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      await manager.completeStep('mission', { mission: 'Test mission' });
      await manager.completeStep('quests', { quests: ['Quest 1', 'Quest 2'] });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);

      const isComplete = await manager.isOnboardingComplete();
      expect(isComplete).toBe(true);
    });

    test('getCurrentStep()で現在のステップを取得できる', async () => {
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('covenant');
    });

    test('未完了時にgetCurrentStep()が正しいステップを返す', async () => {
      await manager.completeStep('covenant', null);
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('excavation');
    });

    test('完了後にgetCurrentStep()がcompleteを返す', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);

      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('complete');
    });
  });

  describe('ステップ進行テスト', () => {
    test('Covenant完了後にExcavationステップに進む', async () => {
      await manager.completeStep('covenant', null);
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('excavation');
    });

    test('Excavation完了後にIdentityステップに進む', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test anti-vision' });
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('identity');
    });

    test('Identity完了後にMissionステップに進む', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('mission');
    });

    test('Mission完了後にQuestsステップに進む', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      await manager.completeStep('mission', { mission: 'Test mission' });
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('quests');
    });

    test('Quests完了後にOpticalCalibrationステップに進む', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      await manager.completeStep('mission', { mission: 'Test mission' });
      await manager.completeStep('quests', { quests: ['Quest 1', 'Quest 2'] });
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('optical_calibration');
    });

    test('OpticalCalibration完了後にFirstJudgmentステップに進む', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      await manager.completeStep('mission', { mission: 'Test mission' });
      await manager.completeStep('quests', { quests: ['Quest 1', 'Quest 2'] });
      await manager.completeStep('optical_calibration', null);
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('first_judgment');
    });

    test('FirstJudgment完了後にcompleteステップに進む', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      await manager.completeStep('mission', { mission: 'Test mission' });
      await manager.completeStep('quests', { quests: ['Quest 1', 'Quest 2'] });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('complete');
    });

    test('ステップが順序通りに進む（Covenant → Excavation → Identity → Mission → Quests → OpticalCalibration → FirstJudgment）', async () => {
      const steps: OnboardingStep[] = [];

      steps.push(await manager.getCurrentStep()); // covenant

      await manager.completeStep('covenant', null);
      steps.push(await manager.getCurrentStep()); // excavation

      await manager.completeStep('excavation', { antiVision: 'Test' });
      steps.push(await manager.getCurrentStep()); // identity

      await manager.completeStep('identity', { identity: 'Test' });
      steps.push(await manager.getCurrentStep()); // mission

      await manager.completeStep('mission', { mission: 'Test' });
      steps.push(await manager.getCurrentStep()); // quests

      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });
      steps.push(await manager.getCurrentStep()); // optical_calibration

      await manager.completeStep('optical_calibration', null);
      steps.push(await manager.getCurrentStep()); // first_judgment

      await manager.completeStep('first_judgment', null);
      steps.push(await manager.getCurrentStep()); // complete

      expect(steps).toEqual([
        'covenant',
        'excavation',
        'identity',
        'mission',
        'quests',
        'optical_calibration',
        'first_judgment',
        'complete',
      ]);
    });

    test('最後のステップ完了でオンボーディング終了', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);

      expect(await manager.isOnboardingComplete()).toBe(true);
    });
  });

  describe('データ保存テスト', () => {
    test('Anti-Visionテキストが保存される', async () => {
      const antiVision = 'Living a meaningless Tuesday 5 years from now';
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision });

      expect(mockRunAsync).toHaveBeenCalled();
    });

    test('Identityステートメントが保存される', async () => {
      const identity = 'I am a person who takes action';
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity });

      expect(mockRunAsync).toHaveBeenCalled();
    });

    test('Missionテキストが保存される', async () => {
      const mission = 'Break the pattern of procrastination';
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission });

      expect(mockRunAsync).toHaveBeenCalled();
    });

    test('Questsが保存される', async () => {
      const quests: [string, string] = ['Morning workout', 'Evening meditation'];
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests });

      expect(mockRunAsync).toHaveBeenCalled();
    });

    test('すべてのオンボーディングデータが正しく保存される', async () => {
      const data = {
        antiVision: 'Test anti-vision',
        identity: 'I am a person who tests',
        mission: 'Test mission',
        quests: ['Quest 1', 'Quest 2'] as [string, string],
      };

      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: data.antiVision });
      await manager.completeStep('identity', { identity: data.identity });
      await manager.completeStep('mission', { mission: data.mission });
      await manager.completeStep('quests', { quests: data.quests });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);

      // Verify database operations were called
      // 4 data saves (excavation, identity, mission, quests) + 7 persistCurrentStep calls
      expect(mockRunAsync).toHaveBeenCalledTimes(11);
    });
  });

  describe('バリデーションテスト', () => {
    test('空のExcavation（Anti-Vision）で進めない', async () => {
      await manager.completeStep('covenant', null);

      await expect(
        manager.completeStep('excavation', { antiVision: '' })
      ).rejects.toThrow();
    });

    test('Excavation（Anti-Vision）がnullの場合エラー', async () => {
      await manager.completeStep('covenant', null);

      await expect(
        manager.completeStep('excavation', { antiVision: null as any })
      ).rejects.toThrow();
    });

    test('空のIdentityで進めない', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });

      await expect(
        manager.completeStep('identity', { identity: '' })
      ).rejects.toThrow();
    });

    test('Identityがnullの場合エラー', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });

      await expect(
        manager.completeStep('identity', { identity: null as any })
      ).rejects.toThrow();
    });

    test('空のMissionで進めない', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });

      await expect(
        manager.completeStep('mission', { mission: '' })
      ).rejects.toThrow();
    });

    test('Missionがnullの場合エラー', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });

      await expect(
        manager.completeStep('mission', { mission: null as any })
      ).rejects.toThrow();
    });

    test('Questsが配列でない場合エラー', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });

      await expect(
        manager.completeStep('quests', { quests: 'not an array' as any })
      ).rejects.toThrow();
    });

    test('Questsが2つでない場合エラー', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });

      await expect(
        manager.completeStep('quests', { quests: ['Only one quest'] as any })
      ).rejects.toThrow();
    });

    test('Questsのいずれかが空の場合エラー', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });

      await expect(
        manager.completeStep('quests', { quests: ['Quest 1', ''] as [string, string] })
      ).rejects.toThrow();
    });

    test('Covenantステップはデータ不要', async () => {
      await expect(manager.completeStep('covenant', null)).resolves.not.toThrow();
    });

    test('順序を飛ばして進めない（Excavationの前にIdentity）', async () => {
      await expect(
        manager.completeStep('identity', { identity: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('データ取得テスト', () => {
    test('getAntiVision()で保存したテキストを取得', async () => {
      const antiVision = 'Living a meaningless Tuesday';
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision });

      mockGetFirstAsync.mockResolvedValueOnce({
        anti_vision: antiVision,
        identity_statement: null,
        one_year_mission: null,
      });

      const retrieved = await manager.getAntiVision();
      expect(retrieved).toBe(antiVision);
    });

    test('getIdentity()で保存したステートメントを取得', async () => {
      const identity = 'I am a person who takes action';
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity });

      mockGetFirstAsync.mockResolvedValueOnce({
        anti_vision: 'Test',
        identity_statement: identity,
        one_year_mission: null,
      });

      const retrieved = await manager.getIdentity();
      expect(retrieved).toBe(identity);
    });

    test('getMission()で保存したミッションを取得', async () => {
      const mission = 'Break the pattern of procrastination';
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission });

      mockGetFirstAsync.mockResolvedValueOnce({
        anti_vision: 'Test',
        identity_statement: 'Test',
        one_year_mission: mission,
      });

      const retrieved = await manager.getMission();
      expect(retrieved).toBe(mission);
    });

    test('getQuests()で保存したクエストを取得', async () => {
      const quests: [string, string] = ['Morning workout', 'Evening meditation'];
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests });

      mockGetAllAsync.mockResolvedValueOnce([
        { quest_text: quests[0] },
        { quest_text: quests[1] },
      ]);

      const retrieved = await manager.getQuests();
      expect(retrieved).toEqual(quests);
    });

    test('データ未保存時にnullを返す', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);

      const antiVision = await manager.getAntiVision();
      expect(antiVision).toBeNull();
    });

    test('すべてのオンボーディングデータを取得できる', async () => {
      const data = {
        antiVision: 'Test anti-vision',
        identity: 'I am a person who tests',
        mission: 'Test mission',
        quests: ['Quest 1', 'Quest 2'] as [string, string],
      };

      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: data.antiVision });
      await manager.completeStep('identity', { identity: data.identity });
      await manager.completeStep('mission', { mission: data.mission });
      await manager.completeStep('quests', { quests: data.quests });

      mockGetFirstAsync.mockResolvedValueOnce({
        anti_vision: data.antiVision,
        identity_statement: data.identity,
        one_year_mission: data.mission,
      });

      mockGetAllAsync.mockResolvedValueOnce([
        { quest_text: data.quests[0] },
        { quest_text: data.quests[1] },
      ]);

      const allData = await manager.getAllOnboardingData();
      expect(allData).toEqual(data);
    });
  });

  describe('リセットテスト', () => {
    test('resetOnboarding()で最初からやり直し', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });

      await manager.resetOnboarding();

      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('covenant');
    });

    test('リセット後にオンボーディング未完了状態になる', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);

      await manager.resetOnboarding();

      expect(await manager.isOnboardingComplete()).toBe(false);
    });

    test('リセット後に保存データがクリアされる', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });

      await manager.resetOnboarding();

      mockGetFirstAsync.mockResolvedValueOnce(null);

      const antiVision = await manager.getAntiVision();
      expect(antiVision).toBeNull();
    });

    test('Wipe後のオンボーディング再開', async () => {
      // Complete onboarding once
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Old' });
      await manager.completeStep('identity', { identity: 'Old' });
      await manager.completeStep('mission', { mission: 'Old' });
      await manager.completeStep('quests', { quests: ['Old1', 'Old2'] });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);

      // Trigger wipe
      await manager.resetOnboarding();

      // Start new onboarding
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'New' });

      mockGetFirstAsync.mockResolvedValueOnce({
        anti_vision: 'New',
        identity_statement: null,
        one_year_mission: null,
      });

      const newAntiVision = await manager.getAntiVision();
      expect(newAntiVision).toBe('New');
    });

    test('リセット後にDBの状態が初期化される', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });

      await manager.resetOnboarding();

      // Should call database reset operations
      expect(mockRunAsync).toHaveBeenCalled();
    });
  });

  describe('エッジケーステスト', () => {
    test('無効なステップ名でエラー', async () => {
      await expect(
        manager.completeStep('invalid-step' as any, null)
      ).rejects.toThrow();
    });

    test('完了済みステップを再度完了しようとした場合の挙動', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });

      // Try to complete covenant again
      await expect(
        manager.completeStep('covenant', null)
      ).rejects.toThrow();
    });

    test('getCurrentStep()が常に有効なステップを返す', async () => {
      const validSteps: OnboardingStep[] = [
        'covenant',
        'excavation',
        'identity',
        'mission',
        'quests',
        'optical_calibration',
        'first_judgment',
        'complete',
      ];

      const currentStep = await manager.getCurrentStep();
      expect(validSteps).toContain(currentStep);
    });

    test('データベースエラー時に適切なエラーをスロー', async () => {
      await manager.completeStep('covenant', null);

      mockRunAsync.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        manager.completeStep('excavation', { antiVision: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('状態永続化テスト', () => {
    test('アプリ再起動後もオンボーディング進捗が保持される', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });

      // Simulate app restart
      const newManager = await OnboardingManager.getInstance();

      mockGetFirstAsync.mockResolvedValueOnce({
        current_step: 'identity'
      });

      const currentStep = await newManager.getCurrentStep();
      expect(currentStep).toBe('identity');
    });

    test('オンボーディング完了状態がアプリ再起動後も保持される', async () => {
      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);

      // Simulate app restart
      const newManager = await OnboardingManager.getInstance();

      mockGetFirstAsync.mockResolvedValueOnce({ state: 'active' });

      expect(await newManager.isOnboardingComplete()).toBe(true);
    });
  });

  describe('イベント通知テスト', () => {
    test('オンボーディング完了時にコールバックが呼ばれる', async () => {
      const onComplete = jest.fn();
      manager.onComplete(onComplete);

      await manager.completeStep('covenant', null);
      await manager.completeStep('excavation', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });
      await manager.completeStep('optical_calibration', null);
      await manager.completeStep('first_judgment', null);

      expect(onComplete).toHaveBeenCalledWith({
        timestamp: expect.any(Number),
        data: expect.objectContaining({
          antiVision: 'Test',
          identity: 'Test',
          mission: 'Test',
          quests: ['Q1', 'Q2'],
        }),
      });
    });

    test('ステップ進行時にコールバックが呼ばれる', async () => {
      const onStepChange = jest.fn();
      manager.onStepChange(onStepChange);

      await manager.completeStep('covenant', null);

      expect(onStepChange).toHaveBeenCalledWith({
        from: 'covenant',
        to: 'excavation',
        timestamp: expect.any(Number),
      });
    });
  });
});
