/**
 * One Day OS - ExcavationPhase Component Tests
 *
 * Phase 2 of Onboarding Ceremony: Forced Excavation (強制発掘)
 * Tests for 10-second timeout mechanism, multi-line input validation, and IH penalty integration
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ExcavationPhase } from './ExcavationPhase';
import { IdentityEngine } from '../../../core/identity/IdentityEngine';
import { HapticEngine } from '../../../core/HapticEngine';

// Mock dependencies
jest.mock('../../../core/identity/IdentityEngine');
jest.mock('../../../core/HapticEngine');
jest.mock('expo-haptics');

describe('ExcavationPhase', () => {
  let mockOnComplete: jest.Mock;
  let mockIdentityEngine: jest.Mocked<IdentityEngine>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockOnComplete = jest.fn();

    // Mock IdentityEngine instance
    mockIdentityEngine = {
      applyOnboardingStagnationPenalty: jest.fn().mockResolvedValue({
        previousIH: 100,
        newIH: 95,
        delta: -5,
        timestamp: Date.now(),
      }),
      getCurrentIH: jest.fn().mockResolvedValue(100),
    } as any;

    (IdentityEngine.getInstance as jest.Mock).mockResolvedValue(mockIdentityEngine);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render title and subtitle correctly', () => {
      const { getByText } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      expect(getByText('ceremony.excavation.title')).toBeTruthy();
      expect(getByText('ceremony.excavation.instruction')).toBeTruthy();
    });

    it('should render disabled submit button initially', () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const submitButton = getByTestId('submit-button');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should render text input field', () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');
      expect(textInput).toBeTruthy();
      expect(textInput.props.multiline).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should keep submit button disabled with less than 3 lines', () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');
      const submitButton = getByTestId('submit-button');

      fireEvent.changeText(textInput, 'Line 1\nLine 2');

      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should enable submit button with 3 or more lines', () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');
      const submitButton = getByTestId('submit-button');

      fireEvent.changeText(textInput, 'Line 1\nLine 2\nLine 3');

      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });

    it('should enable submit button with more than 3 lines', () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');
      const submitButton = getByTestId('submit-button');

      fireEvent.changeText(textInput, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('10-Second Timeout Mechanism', () => {
    it('should apply IH penalty after 10 seconds of no input', async () => {
      render(<ExcavationPhase onComplete={mockOnComplete} />);

      // Fast-forward 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockIdentityEngine.applyOnboardingStagnationPenalty).toHaveBeenCalledTimes(1);
      });
    });

    it('should trigger haptic feedback on timeout', async () => {
      render(<ExcavationPhase onComplete={mockOnComplete} />);

      // Fast-forward 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(HapticEngine.punishFailure).toHaveBeenCalled();
      });
    });

    it('should display warning message after timeout', async () => {
      const { getByText } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      // Fast-forward 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('ceremony.excavation.warning')).toBeTruthy();
      });
    });

    it('should reset timeout when user types', async () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');

      // Type something
      fireEvent.changeText(textInput, 'Some text');

      // Advance 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Type again (resets timer)
      fireEvent.changeText(textInput, 'Some text updated');

      // Advance another 8 seconds (total 13, but timer was reset at 5)
      act(() => {
        jest.advanceTimersByTime(8000);
      });

      // Should not trigger penalty yet (only 8 seconds since last input)
      expect(mockIdentityEngine.applyOnboardingStagnationPenalty).not.toHaveBeenCalled();

      // Advance 2 more seconds to complete 10 seconds from last input
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockIdentityEngine.applyOnboardingStagnationPenalty).toHaveBeenCalledTimes(1);
      });
    });

    it('should apply penalty multiple times for repeated timeouts', async () => {
      render(<ExcavationPhase onComplete={mockOnComplete} />);

      // First timeout at 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockIdentityEngine.applyOnboardingStagnationPenalty).toHaveBeenCalledTimes(1);
      });

      // Second timeout at 20 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockIdentityEngine.applyOnboardingStagnationPenalty).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Submit Functionality', () => {
    it('should call onComplete with input text when button is pressed', async () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');
      const submitButton = getByTestId('submit-button');

      const testText = 'Line 1\nLine 2\nLine 3';
      fireEvent.changeText(textInput, testText);

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(testText);
      });
    });

    it('should not call onComplete if button is disabled', () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');
      const submitButton = getByTestId('submit-button');

      fireEvent.changeText(textInput, 'Only one line');
      fireEvent.press(submitButton);

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('should clear timeout timer when submitting', async () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');
      const submitButton = getByTestId('submit-button');

      fireEvent.changeText(textInput, 'Line 1\nLine 2\nLine 3');

      // Advance 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Submit before timeout
      fireEvent.press(submitButton);

      // Advance past timeout threshold
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      // Should not apply penalty after submission
      await waitFor(() => {
        expect(mockIdentityEngine.applyOnboardingStagnationPenalty).not.toHaveBeenCalled();
      });
    });
  });

  describe('Red Flash Effect', () => {
    it('should trigger red flash effect on timeout', async () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      // Fast-forward 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        const flashOverlay = getByTestId('flash-overlay');
        expect(flashOverlay).toBeTruthy();
      });
    });

    it('should clear flash effect after animation', async () => {
      const { getByTestId, queryByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      // Trigger timeout
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByTestId('flash-overlay')).toBeTruthy();
      });

      // Advance past flash duration (500ms)
      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(queryByTestId('flash-overlay')).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input gracefully', () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const submitButton = getByTestId('submit-button');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should trim whitespace when counting lines', () => {
      const { getByTestId } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      const textInput = getByTestId('anti-vision-input');
      const submitButton = getByTestId('submit-button');

      // Only 2 non-empty lines
      fireEvent.changeText(textInput, 'Line 1\n\nLine 2\n\n');

      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should cleanup timers on unmount', () => {
      const { unmount } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(6000);
      });

      // Should not trigger penalty after unmount
      expect(mockIdentityEngine.applyOnboardingStagnationPenalty).not.toHaveBeenCalled();
    });
  });

  describe('IH Display', () => {
    it('should display initial IH value', async () => {
      const { getByText } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(getByText('IH: 100%')).toBeTruthy();
      });
    });

    it('should update IH display after timeout penalty', async () => {
      mockIdentityEngine.getCurrentIH.mockResolvedValueOnce(100).mockResolvedValueOnce(95);

      const { getByText } = render(<ExcavationPhase onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(getByText('IH: 100%')).toBeTruthy();
      });

      // Trigger timeout
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('IH: 95%')).toBeTruthy();
      });
    });
  });
});
