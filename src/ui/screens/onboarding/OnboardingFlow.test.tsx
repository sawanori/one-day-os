/**
 * One Day OS - OnboardingFlow Component Tests
 *
 * TDD Tests for the 5-step onboarding flow
 * These tests define the expected behavior BEFORE implementation
 *
 * Onboarding Flow Steps:
 * 1. Welcome - Introduction to One Day OS
 * 2. Anti-Vision - Define the worst possible future
 * 3. Identity - Who are you? ("I am a person who...")
 * 4. Mission - One year mission statement
 * 5. Quests - Two daily quests
 */

import React from 'react';
import { render, fireEvent, waitFor, waitForElementToBeRemoved, act } from '@testing-library/react-native';
import { OnboardingFlow } from './OnboardingFlow';
import { OnboardingManager } from '../../../core/onboarding/OnboardingManager';
import { theme } from '../../theme/theme';

// Type definition for onboarding steps
type OnboardingStep = 'welcome' | 'anti-vision' | 'identity' | 'mission' | 'quests' | 'complete';

// Mock expo-router
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
  }),
}));

// Mock OnboardingManager
jest.mock('../../../core/onboarding/OnboardingManager');

// Mock React Native Animated API
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

describe('OnboardingFlow Component', () => {
  let mockOnboardingManager: jest.Mocked<OnboardingManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instance
    mockOnboardingManager = {
      getCurrentStep: jest.fn(),
      completeStep: jest.fn(),
      isOnboardingComplete: jest.fn(),
      onStepChange: jest.fn(),
      onComplete: jest.fn(),
      resetOnboarding: jest.fn(),
      getAntiVision: jest.fn(),
      getIdentity: jest.fn(),
      getMission: jest.fn(),
      getQuests: jest.fn(),
      getAllOnboardingData: jest.fn(),
    } as any;

    // Mock getInstance to return our mock immediately
    (OnboardingManager.getInstance as jest.Mock).mockImplementation(() => Promise.resolve(mockOnboardingManager));

    // Default to welcome step - return immediately resolved promises
    mockOnboardingManager.getCurrentStep.mockImplementation(() => Promise.resolve('welcome' as OnboardingStep));
    mockOnboardingManager.isOnboardingComplete.mockImplementation(() => Promise.resolve(false));
  });

  // ============================================================================
  // 1. WELCOME SCREEN TESTS
  // ============================================================================

  describe('Welcome Screen', () => {
    test('Welcomeスクリーンが正しくレンダリングされる', async () => {
      const { getByText, queryByText } = render(<OnboardingFlow />);

      // Wait for async initialization by checking when "Initializing..." disappears
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Now the welcome screen should be visible
      await waitFor(() => {
        const welcome = queryByText(/welcome/i);
        expect(welcome).toBeTruthy();
      }, { timeout: 5000 });
    });

    test('ONE DAY OSタイトルが表示される', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        expect(getByText('ONE DAY OS')).toBeTruthy();
      });
    });

    test('説明文が表示される', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        // Check for description text
        const description = getByText(/rebuild.*life/i);
        expect(description).toBeTruthy();
      });
    });

    test('開始ボタンが表示される', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      await waitFor(() => {
        const button = getByTestId('begin-button');
        expect(button).toBeTruthy();
      });
    });

    test('開始ボタンをタップするとAnti-Visionステップに進む', async () => {
      mockOnboardingManager.completeStep.mockResolvedValue(undefined);

      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for button to be available
      await waitFor(() => {
        expect(getByTestId('begin-button')).toBeTruthy();
      });

      const button = getByTestId('begin-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnboardingManager.completeStep).toHaveBeenCalledWith('welcome', null);
      });
    });
  });

  // ============================================================================
  // 2. ANTI-VISION SCREEN TESTS
  // ============================================================================

  describe('Anti-Vision Screen', () => {
    beforeEach(() => {
      mockOnboardingManager.getCurrentStep.mockResolvedValue('anti-vision');
    });

    test('Anti-Visionスクリーンが正しくレンダリングされる', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        expect(getByText(/anti.*vision/i)).toBeTruthy();
      });
    });

    test('質問プロンプトが表示される: "5年後の最悪の火曜日を想像してください"', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        const prompt = getByText(/5年後.*最悪.*火曜日|worst.*tuesday.*5.*years/i);
        expect(prompt).toBeTruthy();
      });
    });

    test('テキスト入力フィールドが表示される', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      await waitFor(() => {
        const input = getByTestId('anti-vision-input');
        expect(input).toBeTruthy();
      });
    });

    test('空の入力では次に進めない', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('anti-vision-input')).toBeTruthy();
        expect(getByTestId('next-button')).toBeTruthy();
      });

      const input = getByTestId('anti-vision-input');
      const button = getByTestId('next-button');

      // Input is empty
      fireEvent.changeText(input, '');

      // Button should be disabled or pressing should not proceed
      fireEvent.press(button);

      // Should not call completeStep with empty data
      expect(mockOnboardingManager.completeStep).not.toHaveBeenCalled();
    });

    test('入力後に次へボタンが有効になる', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('anti-vision-input')).toBeTruthy();
        expect(getByTestId('next-button')).toBeTruthy();
      });

      const input = getByTestId('anti-vision-input');
      const button = getByTestId('next-button');

      // Enter text
      fireEvent.changeText(input, 'My worst Tuesday vision');

      // Button should be enabled
      await waitFor(() => {
        expect(button.props.accessibilityState?.disabled).toBeFalsy();
      });
    });

    test('次へボタンをタップするとIdentityステップに進む', async () => {
      mockOnboardingManager.completeStep.mockResolvedValue(undefined);

      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('anti-vision-input')).toBeTruthy();
        expect(getByTestId('next-button')).toBeTruthy();
      });

      const input = getByTestId('anti-vision-input');
      fireEvent.changeText(input, 'My worst Tuesday vision');

      const button = getByTestId('next-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnboardingManager.completeStep).toHaveBeenCalledWith('anti-vision', {
          antiVision: 'My worst Tuesday vision',
        });
      });
    });
  });

  // ============================================================================
  // 3. IDENTITY SCREEN TESTS
  // ============================================================================

  describe('Identity Screen', () => {
    beforeEach(() => {
      mockOnboardingManager.getCurrentStep.mockResolvedValue('identity');
    });

    test('Identityスクリーンが正しくレンダリングされる', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        expect(getByText(/identity|アイデンティティ/i)).toBeTruthy();
      });
    });

    test('質問プロンプトが表示される: "あなたはどんな人間ですか？"', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        const prompt = getByText(/どんな人間|who are you/i);
        expect(prompt).toBeTruthy();
      });
    });

    test('"I am a person who..." のプレフィックスが表示される', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        const prefix = getByText(/I am a person who/i);
        expect(prefix).toBeTruthy();
      });
    });

    test('テキスト入力フィールドが表示される', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      await waitFor(() => {
        const input = getByTestId('identity-input');
        expect(input).toBeTruthy();
      });
    });

    test('空の入力では次に進めない', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('identity-input')).toBeTruthy();
        expect(getByTestId('next-button')).toBeTruthy();
      });

      const input = getByTestId('identity-input');
      const button = getByTestId('next-button');

      fireEvent.changeText(input, '');
      fireEvent.press(button);

      expect(mockOnboardingManager.completeStep).not.toHaveBeenCalled();
    });

    test('次へボタンをタップするとMissionステップに進む', async () => {
      mockOnboardingManager.completeStep.mockResolvedValue(undefined);

      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('identity-input')).toBeTruthy();
        expect(getByTestId('next-button')).toBeTruthy();
      });

      const input = getByTestId('identity-input');
      fireEvent.changeText(input, 'values integrity and truth');

      const button = getByTestId('next-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnboardingManager.completeStep).toHaveBeenCalledWith('identity', {
          identity: 'values integrity and truth',
        });
      });
    });
  });

  // ============================================================================
  // 4. MISSION SCREEN TESTS
  // ============================================================================

  describe('Mission Screen', () => {
    beforeEach(() => {
      mockOnboardingManager.getCurrentStep.mockResolvedValue('mission');
    });

    test('Missionスクリーンが正しくレンダリングされる', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        expect(getByText('MISSION')).toBeTruthy();
      });
    });

    test('質問プロンプトが表示される: "今年の最重要ミッションは？"', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        const prompt = getByText(/今年.*最重要.*ミッション|year.*mission/i);
        expect(prompt).toBeTruthy();
      });
    });

    test('テキスト入力フィールドが表示される', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      await waitFor(() => {
        const input = getByTestId('mission-input');
        expect(input).toBeTruthy();
      });
    });

    test('空の入力では次に進めない', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('mission-input')).toBeTruthy();
        expect(getByTestId('next-button')).toBeTruthy();
      });

      const input = getByTestId('mission-input');
      const button = getByTestId('next-button');

      fireEvent.changeText(input, '');
      fireEvent.press(button);

      expect(mockOnboardingManager.completeStep).not.toHaveBeenCalled();
    });

    test('次へボタンをタップするとQuestsステップに進む', async () => {
      mockOnboardingManager.completeStep.mockResolvedValue(undefined);

      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('mission-input')).toBeTruthy();
        expect(getByTestId('next-button')).toBeTruthy();
      });

      const input = getByTestId('mission-input');
      fireEvent.changeText(input, 'Launch my product');

      const button = getByTestId('next-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnboardingManager.completeStep).toHaveBeenCalledWith('mission', {
          mission: 'Launch my product',
        });
      });
    });
  });

  // ============================================================================
  // 5. QUESTS SCREEN TESTS
  // ============================================================================

  describe('Quests Screen', () => {
    beforeEach(() => {
      mockOnboardingManager.getCurrentStep.mockResolvedValue('quests');
    });

    test('Questsスクリーンが正しくレンダリングされる', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        expect(getByText(/quests|クエスト/i)).toBeTruthy();
      });
    });

    test('質問プロンプトが表示される: "毎日達成するクエストを2つ設定"', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        const prompt = getByText(/毎日.*クエスト.*2|daily.*quests.*2/i);
        expect(prompt).toBeTruthy();
      });
    });

    test('Quest 1入力フィールドが表示される', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      await waitFor(() => {
        const input = getByTestId('quest1-input');
        expect(input).toBeTruthy();
      });
    });

    test('Quest 2入力フィールドが表示される', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      await waitFor(() => {
        const input = getByTestId('quest2-input');
        expect(input).toBeTruthy();
      });
    });

    test('両方のクエストが入力されないと完了できない', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('quest1-input')).toBeTruthy();
        expect(getByTestId('complete-button')).toBeTruthy();
      });

      const quest1 = getByTestId('quest1-input');
      const button = getByTestId('complete-button');

      // Only fill quest 1
      fireEvent.changeText(quest1, 'Morning meditation');

      // Should not be able to complete
      fireEvent.press(button);

      expect(mockOnboardingManager.completeStep).not.toHaveBeenCalled();
    });

    test('完了ボタンをタップするとオンボーディングが完了する', async () => {
      mockOnboardingManager.completeStep.mockResolvedValue(undefined);

      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('quest1-input')).toBeTruthy();
        expect(getByTestId('quest2-input')).toBeTruthy();
        expect(getByTestId('complete-button')).toBeTruthy();
      });

      const quest1 = getByTestId('quest1-input');
      const quest2 = getByTestId('quest2-input');

      fireEvent.changeText(quest1, 'Morning meditation');
      fireEvent.changeText(quest2, 'Evening reflection');

      const button = getByTestId('complete-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnboardingManager.completeStep).toHaveBeenCalledWith('quests', {
          quests: ['Morning meditation', 'Evening reflection'],
        });
      });
    });
  });

  // ============================================================================
  // 6. INTEGRATION TESTS
  // ============================================================================

  describe('Integration', () => {
    test('全ステップを順番に完了できる', async () => {
      // Start at welcome
      mockOnboardingManager.getCurrentStep.mockResolvedValue('welcome');
      mockOnboardingManager.completeStep.mockResolvedValue(undefined);

      const { getByTestId, rerender } = render(<OnboardingFlow />);

      // Complete welcome - wait for button first
      await waitFor(() => {
        expect(getByTestId('begin-button')).toBeTruthy();
      });

      const button = getByTestId('begin-button');
      fireEvent.press(button);

      expect(mockOnboardingManager.completeStep).toHaveBeenCalledWith('welcome', null);

      // Move to anti-vision
      mockOnboardingManager.getCurrentStep.mockResolvedValue('anti-vision');
      rerender(<OnboardingFlow />);

      await waitFor(() => {
        const input = getByTestId('anti-vision-input');
        expect(input).toBeTruthy();
      });
    });

    test('戻るボタンで前のステップに戻れる', async () => {
      mockOnboardingManager.getCurrentStep.mockResolvedValue('identity');

      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for back button to be available
      await waitFor(() => {
        expect(getByTestId('back-button')).toBeTruthy();
      });

      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      // Should trigger router.back()
      expect(mockBack).toHaveBeenCalled();
    });

    test('データがOnboardingManagerに保存される', async () => {
      mockOnboardingManager.getCurrentStep.mockResolvedValue('anti-vision');
      mockOnboardingManager.completeStep.mockResolvedValue(undefined);

      const { getByTestId } = render(<OnboardingFlow />);

      const testData = 'Test anti-vision data';

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('anti-vision-input')).toBeTruthy();
        expect(getByTestId('next-button')).toBeTruthy();
      });

      const input = getByTestId('anti-vision-input');
      fireEvent.changeText(input, testData);

      const button = getByTestId('next-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnboardingManager.completeStep).toHaveBeenCalledWith('anti-vision', {
          antiVision: testData,
        });
      });
    });

    test('完了後にメインアプリに遷移する', async () => {
      mockOnboardingManager.getCurrentStep.mockResolvedValue('quests');
      mockOnboardingManager.completeStep.mockResolvedValue(undefined);
      mockOnboardingManager.isOnboardingComplete.mockResolvedValue(true);

      const { getByTestId } = render(<OnboardingFlow />);

      // Wait for elements to be available
      await waitFor(() => {
        expect(getByTestId('quest1-input')).toBeTruthy();
        expect(getByTestId('quest2-input')).toBeTruthy();
        expect(getByTestId('complete-button')).toBeTruthy();
      });

      const quest1 = getByTestId('quest1-input');
      const quest2 = getByTestId('quest2-input');

      fireEvent.changeText(quest1, 'Quest 1');
      fireEvent.changeText(quest2, 'Quest 2');

      const button = getByTestId('complete-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
      });
    });
  });

  // ============================================================================
  // 7. BRUTALIST DESIGN TESTS
  // ============================================================================

  describe('Brutalist Design', () => {
    test('背景色が黒(#000000)である', async () => {
      const { getByTestId } = render(<OnboardingFlow />);

      await waitFor(() => {
        const container = getByTestId('onboarding-container');
        const style = container.props.style;

        let backgroundColor;
        if (Array.isArray(style)) {
          backgroundColor = style.find((s) => s?.backgroundColor)?.backgroundColor;
        } else {
          backgroundColor = style?.backgroundColor;
        }

        expect(backgroundColor).toBe(theme.colors.background);
        expect(backgroundColor).toBe('#000000');
      });
    });

    test('テキスト色が白(#FFFFFF)である', async () => {
      const { getAllByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        const textElements = getAllByText(/./);
        const firstText = textElements[0];

        const style = firstText.props.style;
        let color;
        if (Array.isArray(style)) {
          color = style.find((s) => s?.color)?.color;
        } else {
          color = style?.color;
        }

        // Should be white or foreground color
        expect([theme.colors.foreground, '#FFFFFF']).toContain(color);
      });
    });

    test('ボタンにborder-radiusがない', async () => {
      const { getByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        const button = getByText(/start|begin|next|complete|続ける|次へ|完了/i);
        const style = button.parent?.props.style;

        let borderRadius;
        if (Array.isArray(style)) {
          borderRadius = style.find((s) => s?.borderRadius !== undefined)?.borderRadius;
        } else {
          borderRadius = style?.borderRadius;
        }

        // Should be 0 or undefined (no border radius)
        expect(borderRadius === 0 || borderRadius === undefined).toBe(true);
      });
    });

    test('フォントがmonospaceである', async () => {
      const { getAllByText } = render(<OnboardingFlow />);

      await waitFor(() => {
        const textElements = getAllByText(/./);
        const firstText = textElements[0];

        const style = firstText.props.style;
        let fontFamily;
        if (Array.isArray(style)) {
          fontFamily = style.find((s) => s?.fontFamily)?.fontFamily;
        } else {
          fontFamily = style?.fontFamily;
        }

        // Should be monospace font from theme
        expect(fontFamily).toBe(theme.typography.fontFamily);
      });
    });
  });
});
