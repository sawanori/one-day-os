/**
 * One Day OS - OnboardingManager Tests (TDD)
 * Tests for 5-step onboarding flow
 *
 * NOTE: These tests are written BEFORE implementation (TDD approach)
 * All tests should FAIL initially until OnboardingManager.ts is implemented
 */

import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite module
jest.mock('expo-sqlite');

import { OnboardingManager } from './OnboardingManager';

type OnboardingStep = 'welcome' | 'anti-vision' | 'identity' | 'mission' | 'quests' | 'complete';

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

    // Mock the openDatabaseAsync function
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue({
      execAsync: mockExecAsync,
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: mockGetAllAsync,
    });

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
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      await manager.completeStep('mission', { mission: 'Test mission' });
      await manager.completeStep('quests', { quests: ['Quest 1', 'Quest 2'] });

      const isComplete = await manager.isOnboardingComplete();
      expect(isComplete).toBe(true);
    });

    test('getCurrentStep()で現在のステップを取得できる', async () => {
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('welcome');
    });

    test('未完了時にgetCurrentStep()が正しいステップを返す', async () => {
      await manager.completeStep('welcome', null);
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('anti-vision');
    });

    test('完了後にgetCurrentStep()がcompleteを返す', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });

      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('complete');
    });
  });

  describe('ステップ進行テスト', () => {
    test('Welcome完了後にAnti-Visionステップに進む', async () => {
      await manager.completeStep('welcome', null);
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('anti-vision');
    });

    test('Anti-Vision完了後にIdentityステップに進む', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test anti-vision' });
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('identity');
    });

    test('Identity完了後にMissionステップに進む', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('mission');
    });

    test('Mission完了後にQuestsステップに進む', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      await manager.completeStep('mission', { mission: 'Test mission' });
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('quests');
    });

    test('Quests完了後にcompleteステップに進む', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test anti-vision' });
      await manager.completeStep('identity', { identity: 'I am a person who tests' });
      await manager.completeStep('mission', { mission: 'Test mission' });
      await manager.completeStep('quests', { quests: ['Quest 1', 'Quest 2'] });
      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('complete');
    });

    test('ステップが順序通りに進む（Welcome → AntiVision → Identity → Mission → Quests）', async () => {
      const steps: OnboardingStep[] = [];

      steps.push(await manager.getCurrentStep()); // welcome

      await manager.completeStep('welcome', null);
      steps.push(await manager.getCurrentStep()); // anti-vision

      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      steps.push(await manager.getCurrentStep()); // identity

      await manager.completeStep('identity', { identity: 'Test' });
      steps.push(await manager.getCurrentStep()); // mission

      await manager.completeStep('mission', { mission: 'Test' });
      steps.push(await manager.getCurrentStep()); // quests

      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });
      steps.push(await manager.getCurrentStep()); // complete

      expect(steps).toEqual([
        'welcome',
        'anti-vision',
        'identity',
        'mission',
        'quests',
        'complete',
      ]);
    });

    test('最後のステップ完了でオンボーディング終了', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });

      expect(await manager.isOnboardingComplete()).toBe(true);
    });
  });

  describe('データ保存テスト', () => {
    test('Anti-Visionテキストが保存される', async () => {
      const antiVision = 'Living a meaningless Tuesday 5 years from now';
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision });

      expect(mockRunAsync).toHaveBeenCalled();
    });

    test('Identityステートメントが保存される', async () => {
      const identity = 'I am a person who takes action';
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity });

      expect(mockRunAsync).toHaveBeenCalled();
    });

    test('Missionテキストが保存される', async () => {
      const mission = 'Break the pattern of procrastination';
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission });

      expect(mockRunAsync).toHaveBeenCalled();
    });

    test('Questsが保存される', async () => {
      const quests: [string, string] = ['Morning workout', 'Evening meditation'];
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
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

      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: data.antiVision });
      await manager.completeStep('identity', { identity: data.identity });
      await manager.completeStep('mission', { mission: data.mission });
      await manager.completeStep('quests', { quests: data.quests });

      // Verify database operations were called
      expect(mockRunAsync).toHaveBeenCalledTimes(4); // 4 data steps
    });
  });

  describe('バリデーションテスト', () => {
    test('空のAnti-Visionで進めない', async () => {
      await manager.completeStep('welcome', null);

      await expect(
        manager.completeStep('anti-vision', { antiVision: '' })
      ).rejects.toThrow();
    });

    test('Anti-Visionがnullの場合エラー', async () => {
      await manager.completeStep('welcome', null);

      await expect(
        manager.completeStep('anti-vision', { antiVision: null as any })
      ).rejects.toThrow();
    });

    test('空のIdentityで進めない', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });

      await expect(
        manager.completeStep('identity', { identity: '' })
      ).rejects.toThrow();
    });

    test('Identityがnullの場合エラー', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });

      await expect(
        manager.completeStep('identity', { identity: null as any })
      ).rejects.toThrow();
    });

    test('空のMissionで進めない', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });

      await expect(
        manager.completeStep('mission', { mission: '' })
      ).rejects.toThrow();
    });

    test('Missionがnullの場合エラー', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });

      await expect(
        manager.completeStep('mission', { mission: null as any })
      ).rejects.toThrow();
    });

    test('Questsが配列でない場合エラー', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });

      await expect(
        manager.completeStep('quests', { quests: 'not an array' as any })
      ).rejects.toThrow();
    });

    test('Questsが2つでない場合エラー', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });

      await expect(
        manager.completeStep('quests', { quests: ['Only one quest'] as any })
      ).rejects.toThrow();
    });

    test('Questsのいずれかが空の場合エラー', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });

      await expect(
        manager.completeStep('quests', { quests: ['Quest 1', ''] as [string, string] })
      ).rejects.toThrow();
    });

    test('Welcomeステップはデータ不要', async () => {
      await expect(manager.completeStep('welcome', null)).resolves.not.toThrow();
    });

    test('順序を飛ばして進めない（Anti-Visionの前にIdentity）', async () => {
      await expect(
        manager.completeStep('identity', { identity: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('データ取得テスト', () => {
    test('getAntiVision()で保存したテキストを取得', async () => {
      const antiVision = 'Living a meaningless Tuesday';
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision });

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
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
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
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
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
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
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

      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: data.antiVision });
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
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });

      await manager.resetOnboarding();

      const currentStep = await manager.getCurrentStep();
      expect(currentStep).toBe('welcome');
    });

    test('リセット後にオンボーディング未完了状態になる', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });

      await manager.resetOnboarding();

      expect(await manager.isOnboardingComplete()).toBe(false);
    });

    test('リセット後に保存データがクリアされる', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });

      await manager.resetOnboarding();

      mockGetFirstAsync.mockResolvedValueOnce(null);

      const antiVision = await manager.getAntiVision();
      expect(antiVision).toBeNull();
    });

    test('Wipe後のオンボーディング再開', async () => {
      // Complete onboarding once
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Old' });
      await manager.completeStep('identity', { identity: 'Old' });
      await manager.completeStep('mission', { mission: 'Old' });
      await manager.completeStep('quests', { quests: ['Old1', 'Old2'] });

      // Trigger wipe
      await manager.resetOnboarding();

      // Start new onboarding
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'New' });

      mockGetFirstAsync.mockResolvedValueOnce({
        anti_vision: 'New',
        identity_statement: null,
        one_year_mission: null,
      });

      const newAntiVision = await manager.getAntiVision();
      expect(newAntiVision).toBe('New');
    });

    test('リセット後にDBの状態が初期化される', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });

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
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });

      // Try to complete welcome again
      await expect(
        manager.completeStep('welcome', null)
      ).rejects.toThrow();
    });

    test('getCurrentStep()が常に有効なステップを返す', async () => {
      const validSteps: OnboardingStep[] = [
        'welcome',
        'anti-vision',
        'identity',
        'mission',
        'quests',
        'complete',
      ];

      const currentStep = await manager.getCurrentStep();
      expect(validSteps).toContain(currentStep);
    });

    test('データベースエラー時に適切なエラーをスロー', async () => {
      mockRunAsync.mockRejectedValueOnce(new Error('Database error'));

      await manager.completeStep('welcome', null);

      await expect(
        manager.completeStep('anti-vision', { antiVision: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('状態永続化テスト', () => {
    test('アプリ再起動後もオンボーディング進捗が保持される', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });

      // Simulate app restart
      const newManager = await OnboardingManager.getInstance();

      mockGetFirstAsync.mockResolvedValueOnce({
        current_step: 'identity'
      });

      const currentStep = await newManager.getCurrentStep();
      expect(currentStep).toBe('identity');
    });

    test('オンボーディング完了状態がアプリ再起動後も保持される', async () => {
      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });

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

      await manager.completeStep('welcome', null);
      await manager.completeStep('anti-vision', { antiVision: 'Test' });
      await manager.completeStep('identity', { identity: 'Test' });
      await manager.completeStep('mission', { mission: 'Test' });
      await manager.completeStep('quests', { quests: ['Q1', 'Q2'] });

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

      await manager.completeStep('welcome', null);

      expect(onStepChange).toHaveBeenCalledWith({
        from: 'welcome',
        to: 'anti-vision',
        timestamp: expect.any(Number),
      });
    });
  });
});
