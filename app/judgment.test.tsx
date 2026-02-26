/**
 * Judgment Screen Tests - Preset Support
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import JudgmentScreen from './judgment';
import { HapticEngine } from '../src/core/HapticEngine';

// Mock JudgmentEngine instance methods
const mockRecordResponse = jest.fn().mockResolvedValue({
  success: true,
  response: 'YES',
  ihBefore: 100,
  ihAfter: 100,
  delta: 0,
  wipeTriggered: false,
});

jest.mock('../src/core/judgment', () => ({
  JudgmentEngine: {
    getInstance: jest.fn().mockResolvedValue({
      recordResponse: (...args: any[]) => mockRecordResponse(...args),
    }),
    resetInstance: jest.fn(),
  },
}));

// Mock constants
jest.mock('../src/constants', () => ({
  JUDGMENT_CONSTANTS: {
    ACTIVE_HOURS: { start: 6, end: 22 },
    COUNT_PER_DAY: 5,
    MIN_INTERVAL_MINUTES: 60,
    MAX_INTERVAL_MINUTES: 240,
    IN_APP_TIMEOUT_SECONDS: 5,
    OS_NOTIFICATION_TIMEOUT_MINUTES: 5,
    ANTI_VISION_FRAGMENT_MIN_LENGTH: 50,
    SUMMONS_TIMEOUT_SECONDS: 180,
    SUMMONS_MISSED_PENALTY: 5,
    JUDGMENT_TIMEOUT_PENALTY: 25,
    SUMMONS_EXPIRY_MINUTES: 30,
  },
}));

// Mock HapticEngine
jest.mock('../src/core/HapticEngine', () => ({
  HapticEngine: {
    lightClick: jest.fn(),
    snapLens: jest.fn(),
    punishFailure: jest.fn(),
    judgmentArrival: jest.fn(),
    judgmentYes: jest.fn(),
    judgmentNo: jest.fn(),
    judgmentTimeout: jest.fn(),
  },
}));

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useLocalSearchParams: jest.fn(),
}));

// Mock StressContainer
jest.mock('../src/ui/layout/StressContainer', () => ({
  StressContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Judgment Screen - Preset Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockReplace.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should auto-submit YES when preset=YES', async () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      scheduleId: '1',
      category: 'SURVIVAL',
      questionKey: 'judgment.survival.q1',
      question: 'Test Question',
      scheduledAt: '2026-01-01T09:00:00.000Z',
      preset: 'YES',
    });

    render(<JudgmentScreen />);

    // YES processing auto-executes via JudgmentEngine.recordResponse
    await waitFor(() => {
      expect(mockRecordResponse).toHaveBeenCalled();
      const callArgs = mockRecordResponse.mock.calls[0];
      expect(callArgs[4]).toBe('YES'); // response argument (5th param)
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('should auto-submit NO when preset=NO', async () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      scheduleId: '1',
      category: 'SURVIVAL',
      questionKey: 'judgment.survival.q1',
      question: 'Test Question',
      scheduledAt: '2026-01-01T09:00:00.000Z',
      preset: 'NO',
    });

    render(<JudgmentScreen />);

    await waitFor(() => {
      expect(mockRecordResponse).toHaveBeenCalled();
      const callArgs = mockRecordResponse.mock.calls[0];
      expect(callArgs[4]).toBe('NO'); // response argument
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('should work normally without preset', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      scheduleId: '1',
      category: 'SURVIVAL',
      questionKey: 'judgment.survival.q1',
      question: 'Test Question',
      scheduledAt: '2026-01-01T09:00:00.000Z',
    });

    const { getByText } = render(<JudgmentScreen />);

    // Timer operates
    expect(getByText(/0:05/)).toBeDefined();
  });

  it('should not start timer when preset is provided', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      scheduleId: '1',
      category: 'SURVIVAL',
      questionKey: 'judgment.survival.q1',
      question: 'Test',
      scheduledAt: '2026-01-01T09:00:00.000Z',
      preset: 'YES',
    });

    render(<JudgmentScreen />);

    // Advance timers
    jest.advanceTimersByTime(1000);

    // lightClick should not be called (timer not running)
    expect(HapticEngine.lightClick).not.toHaveBeenCalled();
  });

  it('should handle preset case insensitivity', async () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      scheduleId: '1',
      category: 'SURVIVAL',
      questionKey: 'judgment.survival.q1',
      question: 'Test',
      scheduledAt: '2026-01-01T09:00:00.000Z',
      preset: 'yes',
    });

    render(<JudgmentScreen />);

    await waitFor(() => {
      expect(mockRecordResponse).toHaveBeenCalled();
      const callArgs = mockRecordResponse.mock.calls[0];
      expect(callArgs[4]).toBe('YES'); // 'yes' → normalized to YES
    });
  });

  it('should display question text', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      scheduleId: '1',
      category: 'SURVIVAL',
      questionKey: 'judgment.survival.q1',
      question: 'Custom Test Question',
      scheduledAt: '2026-01-01T09:00:00.000Z',
    });

    const { getByText } = render(<JudgmentScreen />);

    expect(getByText('Custom Test Question')).toBeDefined();
  });

  it('should show default question when not provided', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      scheduleId: '1',
      category: 'SURVIVAL',
      questionKey: 'judgment.survival.q1',
      scheduledAt: '2026-01-01T09:00:00.000Z',
    });

    const { getByText } = render(<JudgmentScreen />);

    expect(getByText('ceremony.judgment.question')).toBeDefined();
  });
});
