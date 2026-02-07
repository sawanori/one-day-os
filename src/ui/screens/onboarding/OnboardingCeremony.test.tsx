/**
 * One Day OS - OnboardingCeremony Test Suite
 *
 * Tests for the orchestrator component that manages the 4-phase ceremony flow:
 * 1. CovenantPhase → 2. ExcavationPhase → 3. LensSyncPhase → 4. JudgmentPhase
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OnboardingCeremony } from './OnboardingCeremony';

// Mock child phase components
jest.mock('./CovenantPhase', () => ({
  CovenantPhase: ({ onComplete }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="covenant-phase">
        <Button testID="covenant-complete-btn" title="Complete Covenant" onPress={onComplete} />
      </View>
    );
  },
}));

jest.mock('./ExcavationPhase', () => ({
  ExcavationPhase: ({ onComplete }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="excavation-phase">
        <Button
          testID="excavation-complete-btn"
          title="Complete Excavation"
          onPress={() => onComplete('Test anti-vision text')}
        />
      </View>
    );
  },
}));

jest.mock('./LensSyncPhase', () => ({
  LensSyncPhase: ({ onComplete }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="lens-sync-phase">
        <Button testID="lens-sync-complete-btn" title="Complete Lens Sync" onPress={onComplete} />
      </View>
    );
  },
}));

jest.mock('./JudgmentPhase', () => ({
  JudgmentPhase: ({ onComplete, onFail }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="judgment-phase">
        <Button testID="judgment-success-btn" title="Success" onPress={onComplete} />
        <Button testID="judgment-fail-btn" title="Fail" onPress={onFail} />
      </View>
    );
  },
}));

describe('OnboardingCeremony', () => {
  const mockOnCeremonyComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render CovenantPhase initially', () => {
    const { getByTestId, queryByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    expect(getByTestId('covenant-phase')).toBeTruthy();
    expect(queryByTestId('excavation-phase')).toBeNull();
    expect(queryByTestId('lens-sync-phase')).toBeNull();
    expect(queryByTestId('judgment-phase')).toBeNull();
  });

  it('should transition from CovenantPhase to ExcavationPhase on completion', async () => {
    const { getByTestId, queryByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Complete Covenant phase
    fireEvent.press(getByTestId('covenant-complete-btn'));

    await waitFor(() => {
      expect(queryByTestId('covenant-phase')).toBeNull();
      expect(getByTestId('excavation-phase')).toBeTruthy();
    });
  });

  it('should transition from ExcavationPhase to LensSyncPhase with anti-vision text', async () => {
    const { getByTestId, queryByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Navigate to Excavation phase
    fireEvent.press(getByTestId('covenant-complete-btn'));

    await waitFor(() => {
      expect(getByTestId('excavation-phase')).toBeTruthy();
    });

    // Complete Excavation phase
    fireEvent.press(getByTestId('excavation-complete-btn'));

    await waitFor(() => {
      expect(queryByTestId('excavation-phase')).toBeNull();
      expect(getByTestId('lens-sync-phase')).toBeTruthy();
    });
  });

  it('should transition from LensSyncPhase to JudgmentPhase on completion', async () => {
    const { getByTestId, queryByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Navigate through phases
    fireEvent.press(getByTestId('covenant-complete-btn'));
    await waitFor(() => expect(getByTestId('excavation-phase')).toBeTruthy());

    fireEvent.press(getByTestId('excavation-complete-btn'));
    await waitFor(() => expect(getByTestId('lens-sync-phase')).toBeTruthy());

    // Complete Lens Sync phase
    fireEvent.press(getByTestId('lens-sync-complete-btn'));

    await waitFor(() => {
      expect(queryByTestId('lens-sync-phase')).toBeNull();
      expect(getByTestId('judgment-phase')).toBeTruthy();
    });
  });

  it('should call onCeremonyComplete with anti-vision text when JudgmentPhase succeeds', async () => {
    const { getByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Navigate through all phases
    fireEvent.press(getByTestId('covenant-complete-btn'));
    await waitFor(() => expect(getByTestId('excavation-phase')).toBeTruthy());

    fireEvent.press(getByTestId('excavation-complete-btn'));
    await waitFor(() => expect(getByTestId('lens-sync-phase')).toBeTruthy());

    fireEvent.press(getByTestId('lens-sync-complete-btn'));
    await waitFor(() => expect(getByTestId('judgment-phase')).toBeTruthy());

    // Complete Judgment phase successfully
    fireEvent.press(getByTestId('judgment-success-btn'));

    await waitFor(() => {
      expect(mockOnCeremonyComplete).toHaveBeenCalledWith('Test anti-vision text');
    });
  });

  it('should reset to CovenantPhase when JudgmentPhase fails', async () => {
    const { getByTestId, queryByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Navigate to Judgment phase
    fireEvent.press(getByTestId('covenant-complete-btn'));
    await waitFor(() => expect(getByTestId('excavation-phase')).toBeTruthy());

    fireEvent.press(getByTestId('excavation-complete-btn'));
    await waitFor(() => expect(getByTestId('lens-sync-phase')).toBeTruthy());

    fireEvent.press(getByTestId('lens-sync-complete-btn'));
    await waitFor(() => expect(getByTestId('judgment-phase')).toBeTruthy());

    // Fail Judgment phase
    fireEvent.press(getByTestId('judgment-fail-btn'));

    // Should show reset modal first
    await waitFor(() => {
      expect(getByTestId('reset-modal')).toBeTruthy();
    });
  });

  it('should show reset modal with correct message on failure', async () => {
    const { getByTestId, getByText } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Navigate to Judgment phase and fail
    fireEvent.press(getByTestId('covenant-complete-btn'));
    await waitFor(() => expect(getByTestId('excavation-phase')).toBeTruthy());

    fireEvent.press(getByTestId('excavation-complete-btn'));
    await waitFor(() => expect(getByTestId('lens-sync-phase')).toBeTruthy());

    fireEvent.press(getByTestId('lens-sync-complete-btn'));
    await waitFor(() => expect(getByTestId('judgment-phase')).toBeTruthy());

    fireEvent.press(getByTestId('judgment-fail-btn'));

    await waitFor(() => {
      expect(getByTestId('reset-modal')).toBeTruthy();
      expect(getByText('最初からやり直せ')).toBeTruthy();
    });
  });

  it('should return to CovenantPhase after reset modal dismissal', async () => {
    jest.useFakeTimers();

    const { getByTestId, queryByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Navigate to Judgment phase and fail
    fireEvent.press(getByTestId('covenant-complete-btn'));
    await waitFor(() => expect(getByTestId('excavation-phase')).toBeTruthy());

    fireEvent.press(getByTestId('excavation-complete-btn'));
    await waitFor(() => expect(getByTestId('lens-sync-phase')).toBeTruthy());

    fireEvent.press(getByTestId('lens-sync-complete-btn'));
    await waitFor(() => expect(getByTestId('judgment-phase')).toBeTruthy());

    fireEvent.press(getByTestId('judgment-fail-btn'));

    await waitFor(() => {
      expect(getByTestId('reset-modal')).toBeTruthy();
    });

    // Fast-forward 1.5 seconds (modal auto-dismisses)
    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(queryByTestId('reset-modal')).toBeNull();
      expect(getByTestId('covenant-phase')).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it('should clear anti-vision text on reset', async () => {
    jest.useFakeTimers();

    const { getByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Complete phases to save anti-vision text
    fireEvent.press(getByTestId('covenant-complete-btn'));
    await waitFor(() => expect(getByTestId('excavation-phase')).toBeTruthy());

    fireEvent.press(getByTestId('excavation-complete-btn'));
    await waitFor(() => expect(getByTestId('lens-sync-phase')).toBeTruthy());

    fireEvent.press(getByTestId('lens-sync-complete-btn'));
    await waitFor(() => expect(getByTestId('judgment-phase')).toBeTruthy());

    // Fail and reset
    fireEvent.press(getByTestId('judgment-fail-btn'));
    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(getByTestId('covenant-phase')).toBeTruthy();
    });

    // Complete all phases again with new text
    fireEvent.press(getByTestId('covenant-complete-btn'));
    await waitFor(() => expect(getByTestId('excavation-phase')).toBeTruthy());

    fireEvent.press(getByTestId('excavation-complete-btn'));
    await waitFor(() => expect(getByTestId('lens-sync-phase')).toBeTruthy());

    fireEvent.press(getByTestId('lens-sync-complete-btn'));
    await waitFor(() => expect(getByTestId('judgment-phase')).toBeTruthy());

    fireEvent.press(getByTestId('judgment-success-btn'));

    // Should receive the new text (from mock)
    await waitFor(() => {
      expect(mockOnCeremonyComplete).toHaveBeenCalledWith('Test anti-vision text');
    });

    jest.useRealTimers();
  });

  it('should not call onCeremonyComplete when ceremony is not complete', () => {
    const { getByTestId } = render(
      <OnboardingCeremony onCeremonyComplete={mockOnCeremonyComplete} />
    );

    // Complete only first phase
    fireEvent.press(getByTestId('covenant-complete-btn'));

    expect(mockOnCeremonyComplete).not.toHaveBeenCalled();
  });
});
