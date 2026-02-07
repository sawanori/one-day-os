/**
 * Death Screen Tests - Stage Management
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DeathScreen from './death';
import { WipeManager } from '../src/core/identity/WipeManager';
import { IdentityEngine } from '../src/core/identity/IdentityEngine';

// Mock WipeManager
const mockExecuteWipe = jest.fn().mockResolvedValue({
  success: true,
  timestamp: Date.now(),
  reason: 'IH_ZERO',
  tablesCleared: ['identity', 'quests', 'notifications', 'daily_state'],
  nextScreen: 'onboarding',
});

jest.mock('../src/core/identity/WipeManager', () => ({
  WipeManager: jest.fn().mockImplementation(() => ({
    executeWipe: mockExecuteWipe,
  })),
}));

// Mock IdentityEngine
jest.mock('../src/core/identity/IdentityEngine', () => ({
  IdentityEngine: {
    getInstance: jest.fn().mockResolvedValue({
      useInsurance: jest.fn().mockResolvedValue(undefined),
      checkHealth: jest.fn().mockResolvedValue({ health: 100, isDead: false }),
    }),
    resetInstance: jest.fn(),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// Mock getDB
jest.mock('../src/database/client', () => ({
  getDB: jest.fn().mockReturnValue({
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    runAsync: jest.fn(),
    execAsync: jest.fn(),
  }),
}));

// Mock DespairModeManager
jest.mock('../src/core/despair/DespairModeManager', () => ({
  DespairModeManager: {
    getInstance: jest.fn().mockReturnValue({
      canResetup: jest.fn().mockResolvedValue(false),
      getRemainingLockoutMs: jest.fn().mockResolvedValue(24 * 60 * 60 * 1000),
    }),
  },
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

  it('should execute WipeManager.executeWipe during wiping stage', async () => {
    render(<DeathScreen />);

    // Advance to wiping stage
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockExecuteWipe).toHaveBeenCalledWith('IH_ZERO', 0);
    });
  });

  it('should show void stage after wipe completes', async () => {
    const { getByText } = render(<DeathScreen />);

    // Advance to wiping stage (2s)
    jest.advanceTimersByTime(2000);

    // Let WipeManager.executeWipe resolve
    await Promise.resolve();

    // Advance void timer (3s)
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(getByText('Welcome back to the old you.')).toBeDefined();
    });
  });

  it('should display lockout message in void stage (24-hour lock)', async () => {
    const { getByText } = render(<DeathScreen />);

    // Advance to wiping stage
    jest.advanceTimersByTime(2000);

    // Let WipeManager.executeWipe resolve
    await Promise.resolve();

    // Advance to void stage
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(getByText('LOCKED')).toBeDefined();
      expect(getByText(/You cannot rebuild for .* hours/)).toBeDefined();
      expect(getByText('This is the consequence.')).toBeDefined();
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
