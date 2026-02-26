/**
 * One Day OS - UnifiedOnboardingFlow Test Suite
 *
 * Tests for the unified 7-step onboarding flow:
 * 1. COVENANT → 2. EXCAVATION → 3. IDENTITY → 4. MISSION →
 * 5. QUESTS → 6. OPTICAL_CALIBRATION → 7. FIRST_JUDGMENT → complete
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { UnifiedOnboardingFlow } from './UnifiedOnboardingFlow';
import { OnboardingManager } from '../../../core/onboarding/OnboardingManager';

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock OnboardingManager
jest.mock('../../../core/onboarding/OnboardingManager');

// Mock updateAppState
jest.mock('../../../database/client', () => ({
  updateAppState: jest.fn().mockResolvedValue(undefined),
}));

// Mock React Native Animated API
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

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
      <View testID="optical-calibration-phase">
        <Button testID="optical-complete-btn" title="Complete Optical" onPress={onComplete} />
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

jest.mock('./steps/IdentityStep', () => ({
  IdentityStep: ({ onComplete }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="identity-step">
        <Button
          testID="identity-complete-btn"
          title="Complete Identity"
          onPress={() => onComplete({ identity: 'Test identity' })}
        />
      </View>
    );
  },
}));

jest.mock('./steps/MissionStep', () => ({
  MissionStep: ({ onComplete }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="mission-step">
        <Button
          testID="mission-complete-btn"
          title="Complete Mission"
          onPress={() => onComplete({ mission: 'Test mission' })}
        />
      </View>
    );
  },
}));

jest.mock('./steps/QuestsStep', () => ({
  QuestsStep: ({ onComplete }: any) => {
    const { View, Button } = require('react-native');
    return (
      <View testID="quests-step">
        <Button
          testID="quests-complete-btn"
          title="Complete Quests"
          onPress={() => onComplete({ quests: ['Q1', 'Q2'] })}
        />
      </View>
    );
  },
}));

describe('UnifiedOnboardingFlow', () => {
  let mockManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockManager = {
      getCurrentStep: jest.fn().mockResolvedValue('covenant'),
      completeStep: jest.fn().mockResolvedValue(undefined),
      isOnboardingComplete: jest.fn().mockResolvedValue(false),
      resetOnboarding: jest.fn().mockResolvedValue(undefined),
      onStepChange: jest.fn(),
      onComplete: jest.fn(),
      getAntiVision: jest.fn(),
      getIdentity: jest.fn(),
      getMission: jest.fn(),
      getQuests: jest.fn(),
      getAllOnboardingData: jest.fn(),
    };

    (OnboardingManager.getInstance as jest.Mock).mockResolvedValue(mockManager);
  });

  describe('7-step sequential flow', () => {
    it('should render CovenantPhase initially', async () => {
      const { getByTestId, queryByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('covenant-phase')).toBeTruthy();
      });

      expect(queryByTestId('excavation-phase')).toBeNull();
      expect(queryByTestId('identity-step')).toBeNull();
    });

    it('should transition through all 7 steps in order', async () => {
      // Setup manager to advance through steps
      let stepIndex = 0;
      const steps = [
        'covenant', 'excavation', 'identity', 'mission',
        'quests', 'optical_calibration', 'first_judgment', 'complete'
      ];

      mockManager.getCurrentStep.mockImplementation(() =>
        Promise.resolve(steps[stepIndex])
      );
      mockManager.completeStep.mockImplementation(() => {
        stepIndex++;
        return Promise.resolve();
      });
      mockManager.isOnboardingComplete.mockImplementation(() =>
        Promise.resolve(stepIndex >= 7)
      );

      const { getByTestId, queryByTestId } = render(<UnifiedOnboardingFlow />);

      // Step 1: Covenant
      await waitFor(() => expect(getByTestId('covenant-phase')).toBeTruthy());
      fireEvent.press(getByTestId('covenant-complete-btn'));

      // Step 2: Excavation
      await waitFor(() => expect(getByTestId('excavation-phase')).toBeTruthy());
      fireEvent.press(getByTestId('excavation-complete-btn'));

      // Step 3: Identity
      await waitFor(() => expect(getByTestId('identity-step')).toBeTruthy());
      fireEvent.press(getByTestId('identity-complete-btn'));

      // Step 4: Mission
      await waitFor(() => expect(getByTestId('mission-step')).toBeTruthy());
      fireEvent.press(getByTestId('mission-complete-btn'));

      // Step 5: Quests
      await waitFor(() => expect(getByTestId('quests-step')).toBeTruthy());
      fireEvent.press(getByTestId('quests-complete-btn'));

      // Step 6: Optical Calibration
      await waitFor(() => expect(getByTestId('optical-calibration-phase')).toBeTruthy());
      fireEvent.press(getByTestId('optical-complete-btn'));

      // Step 7: Judgment - completes and navigates
      await waitFor(() => expect(getByTestId('judgment-phase')).toBeTruthy());
      fireEvent.press(getByTestId('judgment-success-btn'));

      // Should navigate to main app
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Step rendering', () => {
    it('should render ExcavationPhase for excavation step', async () => {
      mockManager.getCurrentStep.mockResolvedValue('excavation');

      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('excavation-phase')).toBeTruthy();
      });
    });

    it('should render IdentityStep for identity step', async () => {
      mockManager.getCurrentStep.mockResolvedValue('identity');

      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('identity-step')).toBeTruthy();
      });
    });

    it('should render MissionStep for mission step', async () => {
      mockManager.getCurrentStep.mockResolvedValue('mission');

      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('mission-step')).toBeTruthy();
      });
    });

    it('should render QuestsStep for quests step', async () => {
      mockManager.getCurrentStep.mockResolvedValue('quests');

      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('quests-step')).toBeTruthy();
      });
    });

    it('should render LensSyncPhase for optical_calibration step', async () => {
      mockManager.getCurrentStep.mockResolvedValue('optical_calibration');

      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('optical-calibration-phase')).toBeTruthy();
      });
    });

    it('should render JudgmentPhase for first_judgment step', async () => {
      mockManager.getCurrentStep.mockResolvedValue('first_judgment');

      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('judgment-phase')).toBeTruthy();
      });
    });
  });

  describe('Judgment success', () => {
    it('should navigate to "/" on judgment success', async () => {
      mockManager.getCurrentStep.mockResolvedValue('first_judgment');
      // First call during init: not complete yet; after judgment: complete
      mockManager.isOnboardingComplete
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('judgment-phase')).toBeTruthy();
      });

      fireEvent.press(getByTestId('judgment-success-btn'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Judgment failure', () => {
    it('should call resetOnboarding and return to covenant on failure', async () => {
      jest.useFakeTimers();

      mockManager.getCurrentStep.mockResolvedValue('first_judgment');

      const { getByTestId, queryByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('judgment-phase')).toBeTruthy();
      });

      // Trigger failure
      fireEvent.press(getByTestId('judgment-fail-btn'));

      // Should show reset flash
      await waitFor(() => {
        expect(getByTestId('reset-flash')).toBeTruthy();
      });

      // Fast-forward 1.5 seconds
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(mockManager.resetOnboarding).toHaveBeenCalled();
        expect(queryByTestId('reset-flash')).toBeNull();
        expect(getByTestId('covenant-phase')).toBeTruthy();
      });

      jest.useRealTimers();
    });
  });

  describe('Ceremony steps skip DB save', () => {
    it('should call completeStep with null for covenant', async () => {
      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('covenant-phase')).toBeTruthy();
      });

      fireEvent.press(getByTestId('covenant-complete-btn'));

      await waitFor(() => {
        expect(mockManager.completeStep).toHaveBeenCalledWith('covenant', null);
      });
    });

    it('should call completeStep with null for optical_calibration', async () => {
      mockManager.getCurrentStep.mockResolvedValue('optical_calibration');

      const { getByTestId } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByTestId('optical-calibration-phase')).toBeTruthy();
      });

      fireEvent.press(getByTestId('optical-complete-btn'));

      await waitFor(() => {
        expect(mockManager.completeStep).toHaveBeenCalledWith('optical_calibration', null);
      });
    });
  });

  describe('Error handling', () => {
    it('should display error message when initialization fails', async () => {
      (OnboardingManager.getInstance as jest.Mock).mockRejectedValue(
        new Error('Init failed')
      );

      const { getByText } = render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(getByText(/Init failed/)).toBeTruthy();
      });
    });
  });

  describe('Already complete', () => {
    it('should redirect to "/" if onboarding is already complete', async () => {
      mockManager.getCurrentStep.mockResolvedValue('complete');
      mockManager.isOnboardingComplete.mockResolvedValue(true);

      render(<UnifiedOnboardingFlow />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });
  });
});
