/**
 * One Day OS - JudgmentPhase Component Tests
 *
 * Tests for the Judgment Test (審判の試験) onboarding ceremony Phase 4:
 * - 5-second countdown timer
 * - YES/NO button interaction
 * - Timeout detection and penalty
 * - Failure animation and haptic feedback
 * - Completion/failure callbacks
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { JudgmentPhase } from './JudgmentPhase';
import { HapticEngine } from '../../../core/HapticEngine';

// Mock HapticEngine
jest.mock('../../../core/HapticEngine', () => ({
  HapticEngine: {
    punishFailure: jest.fn(),
  },
}));

describe('JudgmentPhase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should render notification-style UI with title and subtitle', () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByText } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      expect(getByText('ceremony.judgment.question')).toBeTruthy();
      expect(getByText('ceremony.judgment.instruction')).toBeTruthy();
    });

    it('should render YES and NO buttons', () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      expect(getByTestId('yes-button')).toBeTruthy();
      expect(getByTestId('no-button')).toBeTruthy();
    });

    it('should display countdown starting at 5', () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      const countdown = getByTestId('countdown-timer');
      expect(countdown.props.children).toBe('5');
    });
  });

  describe('Countdown Timer', () => {
    it('should decrement countdown every second', () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      const countdown = getByTestId('countdown-timer');
      expect(countdown.props.children).toBe('5');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(countdown.props.children).toBe('4');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(countdown.props.children).toBe('3');
    });

    it('should update countdown display in real-time', () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      const countdown = getByTestId('countdown-timer');

      for (let i = 5; i > 0; i--) {
        expect(countdown.props.children).toBe(String(i));
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
    });
  });

  describe('YES Button Interaction', () => {
    it('should call onComplete when YES is pressed within 5 seconds', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      act(() => {
        jest.advanceTimersByTime(2000); // 2 seconds elapsed
      });
      fireEvent.press(getByTestId('yes-button'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onFail).not.toHaveBeenCalled();
      });
    });

    it('should stop countdown after YES is pressed', () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      fireEvent.press(getByTestId('yes-button'));

      // Countdown should stop - component completes, countdown not visible
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('NO Button Interaction', () => {
    it('should trigger failure flow when NO is pressed', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId, getByText } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      fireEvent.press(getByTestId('no-button'));

      // Should show failure message
      await waitFor(() => {
        expect(getByText('ceremony.judgment.warning')).toBeTruthy();
      });
    });

    it('should trigger haptic feedback on NO', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      fireEvent.press(getByTestId('no-button'));

      await waitFor(() => {
        expect(HapticEngine.punishFailure).toHaveBeenCalled();
      });
    });

    it('should call onFail after 2 seconds when NO is pressed', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('no-button'));
        // Wait for async haptic
        await Promise.resolve();
      });

      // Should not call immediately
      expect(onFail).not.toHaveBeenCalled();

      // Advance 2 seconds and run pending timers
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(onFail).toHaveBeenCalledTimes(1);
        expect(onComplete).not.toHaveBeenCalled();
      });
    });

    it('should display glitch effect on NO press', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      fireEvent.press(getByTestId('no-button'));

      // Check for glitch overlay
      await waitFor(() => {
        expect(getByTestId('glitch-overlay')).toBeTruthy();
      });
    });
  });

  describe('Timeout Behavior', () => {
    it('should trigger failure when countdown reaches 0', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      // Advance full 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should show failure message
      await waitFor(() => {
        expect(getByTestId('glitch-overlay')).toBeTruthy();
      });
    });

    it('should trigger haptic feedback on timeout', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      render(<JudgmentPhase onComplete={onComplete} onFail={onFail} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(HapticEngine.punishFailure).toHaveBeenCalled();
      });
    });

    it('should call onFail after 2 seconds on timeout', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      render(<JudgmentPhase onComplete={onComplete} onFail={onFail} />);

      // 5 seconds timeout + setTimeout(0) for triggerFailure
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve(); // Wait for setTimeout(0)
      });

      // Should not call immediately
      expect(onFail).not.toHaveBeenCalled();

      // Additional 2 seconds for failure animation
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(onFail).toHaveBeenCalledTimes(1);
        expect(onComplete).not.toHaveBeenCalled();
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should display countdown in red color', () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      const countdown = getByTestId('countdown-timer');
      // Style is an object, not array
      expect(countdown.props.style).toMatchObject({
        color: '#FF0000', // Red accent color
      });
    });

    it('should show red glitch overlay on failure', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      fireEvent.press(getByTestId('no-button'));

      await waitFor(() => {
        const overlay = getByTestId('glitch-overlay');
        expect(overlay).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle haptic errors gracefully', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      (HapticEngine.punishFailure as jest.Mock).mockRejectedValueOnce(
        new Error('Haptic error')
      );

      const { getByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('no-button'));
        // Wait for haptic to resolve
        await Promise.resolve();
      });

      // Should not crash
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(onFail).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should not allow YES press after timeout started', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { queryByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      // Trigger timeout
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve(); // Let effects run
      });

      await waitFor(() => {
        // YES button should not be visible after failure
        expect(queryByTestId('yes-button')).toBeNull();
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        // Should call onFail, not onComplete
        expect(onFail).toHaveBeenCalled();
        expect(onComplete).not.toHaveBeenCalled();
      });
    });

    it('should not trigger multiple failures', async () => {
      const onComplete = jest.fn();
      const onFail = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <JudgmentPhase onComplete={onComplete} onFail={onFail} />
      );

      // Press NO once
      await act(async () => {
        fireEvent.press(getByTestId('no-button'));
        await Promise.resolve(); // Wait for async haptic
      });

      await waitFor(() => {
        // NO button should disappear after first press
        expect(queryByTestId('no-button')).toBeNull();
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(onFail).toHaveBeenCalledTimes(1);
      });
    });
  });
});
