/**
 * Death Screen Tests - Stage Management
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DeathScreen from './death';
import { WipeAnimation } from '../src/core/WipeAnimation';
import { IdentityEngine } from '../src/core/IdentityEngine';

// Mock WipeAnimation
jest.mock('../src/core/WipeAnimation', () => ({
  WipeAnimation: {
    executeWipe: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock IdentityEngine
jest.mock('../src/core/IdentityEngine', () => ({
  IdentityEngine: {
    useInsurance: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

describe('Death Screen - Stage Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start in sentencing stage', () => {
    const { getByText } = render(<DeathScreen />);

    expect(getByText('IDENTITY COLLAPSED.')).toBeDefined();
    expect(getByText('You failed to maintain the structure.')).toBeDefined();
  });

  it('should transition to wiping stage after 2 seconds', async () => {
    const { getByText } = render(<DeathScreen />);

    // Advance timers by 2 seconds
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(getByText('EXECUTING WIPE...')).toBeDefined();
    });
  });

  it('should execute WipeAnimation during wiping stage', async () => {
    render(<DeathScreen />);

    // Advance to wiping stage
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(WipeAnimation.executeWipe).toHaveBeenCalled();
    });
  });

  it('should show void stage after wipe completes', async () => {
    const { getByText } = render(<DeathScreen />);

    // Advance to wiping stage (2s)
    jest.advanceTimersByTime(2000);

    // Let WipeAnimation.executeWipe resolve
    await Promise.resolve();

    // Advance void timer (3s)
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(getByText('Welcome back to the old you.')).toBeDefined();
    });
  });

  it('should display resurrection button in void stage', async () => {
    const { getByText } = render(<DeathScreen />);

    // Advance to wiping stage
    jest.advanceTimersByTime(2000);

    // Let WipeAnimation.executeWipe resolve
    await Promise.resolve();

    // Advance to void stage
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(getByText('Wait... I have Insurance.')).toBeDefined();
      expect(getByText('[¥1,000]')).toBeDefined();
    });
  });

  it('should show progress bar in wiping stage', async () => {
    const { getByTestId } = render(<DeathScreen />);

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(getByTestId('death-progress-bar')).toBeDefined();
    });
  });

  it('should show file deletion animation in wiping stage', async () => {
    const { getByText } = render(<DeathScreen />);

    // Advance to wiping stage
    jest.advanceTimersByTime(2000);

    // Files should start appearing
    await waitFor(() => {
      expect(getByText(/DELETE:.*quests\.db/i)).toBeDefined();
    });
  });
});
