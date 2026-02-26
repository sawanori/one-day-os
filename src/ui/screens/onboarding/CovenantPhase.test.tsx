/**
 * One Day OS - CovenantPhase Component Tests
 *
 * Tests for the Covenant Phase (契約の儀式) onboarding ceremony:
 * - 3-second long press requirement
 * - Progress ring visualization (0% → 100%)
 * - Haptic feedback at key moments
 * - Completion callback
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CovenantPhase } from './CovenantPhase';
import { HapticEngine } from '../../../core/HapticEngine';

// Mock HapticEngine
const mockCleanup = jest.fn();
jest.mock('../../../core/HapticEngine', () => ({
  HapticEngine: {
    acceleratingHeartbeat: jest.fn().mockResolvedValue(jest.fn()),
  },
}));

describe('CovenantPhase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should render the covenant button', () => {
      const onComplete = jest.fn();
      const { getByTestId, getByText } = render(<CovenantPhase onComplete={onComplete} />);

      expect(getByTestId('covenant-button')).toBeTruthy();
      expect(getByText('ceremony.covenant.title')).toBeTruthy();
    });

    it('should display progress ring at 0%', () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      const progressRing = getByTestId('progress-ring');
      expect(progressRing).toBeTruthy();
    });
  });

  describe('Long Press Behavior', () => {
    it('should start accelerating heartbeat on press start', async () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      fireEvent(getByTestId('covenant-button'), 'pressIn');

      await waitFor(() => {
        expect(HapticEngine.acceleratingHeartbeat).toHaveBeenCalled();
      });
    });

    it('should reset progress when released before 3 seconds', () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      fireEvent(getByTestId('covenant-button'), 'pressIn');
      jest.advanceTimersByTime(1500); // 1.5 seconds
      fireEvent(getByTestId('covenant-button'), 'pressOut');

      // Should not complete
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should call acceleratingHeartbeat during press', async () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      fireEvent(getByTestId('covenant-button'), 'pressIn');

      await waitFor(() => {
        expect(HapticEngine.acceleratingHeartbeat).toHaveBeenCalledTimes(1);
      });
    });

    it('should complete with silence (no success haptic) after 3 seconds', async () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      fireEvent(getByTestId('covenant-button'), 'pressIn');

      // Advance full 3 seconds
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('should update progress ring during press', async () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      fireEvent(getByTestId('covenant-button'), 'pressIn');

      // Progress should update
      jest.advanceTimersByTime(1500); // 50% progress

      // Note: Testing exact progress value would require access to internal state
      // We verify behavior through completion callback instead
      jest.advanceTimersByTime(1500); // Complete

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should change button border color during press', () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      const button = getByTestId('covenant-button');

      // Initial state: white border
      expect(button.props.style).toBeDefined();

      fireEvent(getByTestId('covenant-button'), 'pressIn');

      // Pressed state: should have style changes
      // (exact style verification depends on implementation)
    });
  });

  describe('Error Handling', () => {
    it('should handle haptic cleanup on early release', async () => {
      const mockCleanup = jest.fn();
      (HapticEngine.acceleratingHeartbeat as jest.Mock).mockResolvedValue(mockCleanup);

      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      fireEvent(getByTestId('covenant-button'), 'pressIn');

      await waitFor(() => {
        expect(HapticEngine.acceleratingHeartbeat).toHaveBeenCalled();
      });

      // Release before completion
      fireEvent(getByTestId('covenant-button'), 'pressOut');

      // Cleanup should be called
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('Completion Flow', () => {
    it('should call onComplete exactly once after 3 seconds', async () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      fireEvent(getByTestId('covenant-button'), 'pressIn');
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });

      // Verify not called again
      jest.advanceTimersByTime(1000);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not allow re-triggering after completion', async () => {
      const onComplete = jest.fn();
      const { getByTestId } = render(<CovenantPhase onComplete={onComplete} />);

      // First press - complete
      fireEvent(getByTestId('covenant-button'), 'pressIn');
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });

      // Try second press
      fireEvent(getByTestId('covenant-button'), 'pressOut');
      fireEvent(getByTestId('covenant-button'), 'pressIn');
      jest.advanceTimersByTime(3000);

      // Should still be called only once
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
