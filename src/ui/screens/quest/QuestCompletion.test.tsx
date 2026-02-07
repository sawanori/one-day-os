/**
 * QuestCompletion Component Tests
 *
 * Tests for Quest Completion v4 Ultra
 * - Instant 0.1s clear animation
 * - Random doubt question display (Japanese)
 * - Silent IH recovery (+1% to +3%)
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text, TextStyle } from 'react-native';
import { QuestCompletion } from './QuestCompletion';

// Mock timers
jest.useFakeTimers();

describe('QuestCompletion', () => {
  const mockOnRecover = jest.fn();
  const mockOnNavigateBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Instant Clear Animation', () => {
    it('should display doubt question immediately', () => {
      const { getByTestId } = render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      // Doubt question should be visible immediately
      const doubtText = getByTestId('doubt-question');
      expect(doubtText).toBeTruthy();
    });

    it('should call onNavigateBack after 0.1s', async () => {
      render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      // Should not navigate immediately
      expect(mockOnNavigateBack).not.toHaveBeenCalled();

      // Advance 100ms (0.1s)
      jest.advanceTimersByTime(100);

      // Should navigate after 0.1s
      await waitFor(() => {
        expect(mockOnNavigateBack).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Random Doubt Question', () => {
    it('should display one of the predefined doubt questions', () => {
      const { getByTestId } = render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      const doubtText = getByTestId('doubt-question');
      const displayedText = doubtText.props.children;

      // All possible doubt questions
      const doubtQuestions = [
        '当然だ。だが、次の5分間で君はまた自分を裏切るのではないか？',
        '完了したか。だが君は本当にそれを達成したのか？',
        'よくやった。だが、それで君の人生は変わったのか？',
        'その報告を信じよう。だが、君は次も同じことをする勇気があるか？',
        '承知した。だが、その成果は一時的なものではないか？',
      ];

      // Should be one of the doubt questions
      expect(doubtQuestions).toContain(displayedText);
    });

    it('should display different questions on multiple renders (statistically)', () => {
      const renderedQuestions = new Set<string>();

      // Render multiple times
      for (let i = 0; i < 20; i++) {
        const { unmount, getByTestId } = render(
          <QuestCompletion
            onIHRecover={mockOnRecover}
            onNavigateBack={mockOnNavigateBack}
          />
        );

        const doubtText = getByTestId('doubt-question');
        renderedQuestions.add(doubtText.props.children);

        unmount();
      }

      // Should have at least 2 different questions (statistically likely)
      expect(renderedQuestions.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Silent IH Recovery', () => {
    it('should call onIHRecover with +1% to +3% on mount', () => {
      render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      // Should call recovery callback immediately
      expect(mockOnRecover).toHaveBeenCalledTimes(1);

      const recoveryAmount = mockOnRecover.mock.calls[0][0];

      // Recovery should be between 1% and 3%
      expect(recoveryAmount).toBeGreaterThanOrEqual(1);
      expect(recoveryAmount).toBeLessThanOrEqual(3);
    });

    it('should call onIHRecover with random amounts (statistically)', () => {
      const recoveryAmounts = new Set<number>();

      // Render multiple times
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(
          <QuestCompletion
            onIHRecover={mockOnRecover}
            onNavigateBack={mockOnNavigateBack}
          />
        );

        const recoveryAmount = mockOnRecover.mock.calls[mockOnRecover.mock.calls.length - 1][0];
        recoveryAmounts.add(recoveryAmount);

        unmount();
        mockOnRecover.mockClear();
      }

      // Should have at least 2 different recovery amounts (statistically likely)
      expect(recoveryAmounts.size).toBeGreaterThanOrEqual(2);

      // All amounts should be in valid range
      recoveryAmounts.forEach(amount => {
        expect(amount).toBeGreaterThanOrEqual(1);
        expect(amount).toBeLessThanOrEqual(3);
      });
    });

    it('should not display recovery amount (silent recovery)', () => {
      const { UNSAFE_getAllByType } = render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      // Should not display any recovery text
      const allText = UNSAFE_getAllByType(Text);
      const hasRecoveryText = allText.some(element => {
        const text = element.props.children;
        return typeof text === 'string' && (
          text.includes('+') ||
          text.includes('回復') ||
          text.includes('recovery') ||
          text.includes('%')
        );
      });

      expect(hasRecoveryText).toBe(false);
    });
  });

  describe('Brutalist Design', () => {
    it('should use black background', () => {
      const { getByTestId } = render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      const rootView = getByTestId('completion-container');
      expect(rootView.props.style).toMatchObject({
        backgroundColor: '#000000',
      });
    });

    it('should use white foreground text', () => {
      const { getByTestId } = render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      const doubtText = getByTestId('doubt-question');
      const styles = Array.isArray(doubtText.props.style)
        ? doubtText.props.style
        : [doubtText.props.style];

      // Find style object with color property
      const colorStyle = styles.find((s: TextStyle | null) => s && s.color === '#FFFFFF');
      expect(colorStyle).toBeTruthy();
      expect(colorStyle?.color).toBe('#FFFFFF');
    });

    it('should use Courier New font family', () => {
      const { getByTestId } = render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      const doubtText = getByTestId('doubt-question');
      const styles = Array.isArray(doubtText.props.style)
        ? doubtText.props.style
        : [doubtText.props.style];

      // Find style object with fontFamily property
      const fontStyle = styles.find((s: TextStyle | null) => s && s.fontFamily);
      expect(fontStyle).toBeTruthy();
      expect(fontStyle?.fontFamily).toContain('Courier New');
    });
  });

  describe('Component Lifecycle', () => {
    it('should trigger recovery and navigation in correct order', async () => {
      render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      // Recovery should happen first (immediately)
      expect(mockOnRecover).toHaveBeenCalledTimes(1);
      expect(mockOnNavigateBack).not.toHaveBeenCalled();

      // Navigation should happen after 0.1s
      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(mockOnNavigateBack).toHaveBeenCalledTimes(1);
      });
    });

    it('should cleanup timer on unmount', () => {
      const { unmount } = render(
        <QuestCompletion
          onIHRecover={mockOnRecover}
          onNavigateBack={mockOnNavigateBack}
        />
      );

      // Unmount before timer fires
      unmount();

      // Advance time
      jest.advanceTimersByTime(200);

      // Should not call navigation callback after unmount
      expect(mockOnNavigateBack).not.toHaveBeenCalled();
    });
  });
});

