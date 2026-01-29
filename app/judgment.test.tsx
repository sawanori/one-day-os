/**
 * Judgment Screen Tests - Preset Support
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import JudgmentScreen from './judgment';
import { IdentityEngine } from '../src/core/IdentityEngine';
import { HapticEngine } from '../src/core/HapticEngine';

// Mock IdentityEngine
jest.mock('../src/core/IdentityEngine', () => ({
  IdentityEngine: {
    applyDamage: jest.fn().mockResolvedValue(undefined),
    restoreHealth: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock HapticEngine
jest.mock('../src/core/HapticEngine', () => ({
  HapticEngine: {
    lightClick: jest.fn(),
    snapLens: jest.fn(),
    punishFailure: jest.fn(),
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
      id: '1',
      question: 'Test Question',
      preset: 'YES',
    });

    render(<JudgmentScreen />);

    // YES処理が自動実行される
    await waitFor(() => {
      expect(IdentityEngine.restoreHealth).toHaveBeenCalledWith(2);
      expect(HapticEngine.snapLens).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('should auto-submit NO when preset=NO', async () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      id: '1',
      question: 'Test Question',
      preset: 'NO',
    });

    render(<JudgmentScreen />);

    await waitFor(() => {
      expect(IdentityEngine.applyDamage).toHaveBeenCalledWith(5);
      expect(HapticEngine.punishFailure).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('should work normally without preset', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      id: '1',
      question: 'Test Question',
    });

    const { getByText } = render(<JudgmentScreen />);

    // タイマーが動作
    expect(getByText(/0:05/)).toBeDefined();
  });

  it('should not start timer when preset is provided', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      id: '1',
      question: 'Test',
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
      id: '1',
      question: 'Test',
      preset: 'yes',
    });

    render(<JudgmentScreen />);

    await waitFor(() => {
      expect(IdentityEngine.restoreHealth).toHaveBeenCalledWith(2);
    });
  });

  it('should display question text', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      id: '1',
      question: 'Custom Test Question',
    });

    const { getByText } = render(<JudgmentScreen />);

    expect(getByText('Custom Test Question')).toBeDefined();
  });

  it('should show default question when not provided', () => {
    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({
      id: '1',
    });

    const { getByText } = render(<JudgmentScreen />);

    expect(getByText('Did you act on your mission?')).toBeDefined();
  });
});
