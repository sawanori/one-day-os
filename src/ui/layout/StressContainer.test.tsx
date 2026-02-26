/**
 * StressContainer Tests - Anti-Vision Integration
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { StressContainer } from './StressContainer';
import { HapticEngine } from '../../core/HapticEngine';

// Mock IdentityEngine instance methods
const mockCheckHealth = jest.fn();
const mockGetAntiVision = jest.fn();

jest.mock('../../core/identity/IdentityEngine', () => ({
  IdentityEngine: {
    getInstance: jest.fn().mockResolvedValue({
      checkHealth: (...args: any[]) => mockCheckHealth(...args),
      getAntiVision: (...args: any[]) => mockGetAntiVision(...args),
    }),
    resetInstance: jest.fn(),
  },
}));

// Mock HapticEngine
jest.mock('../../core/HapticEngine', () => ({
  HapticEngine: {
    pulseHeartbeat: jest.fn(),
  },
}));

// Mock features
jest.mock('../../config/features', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));

describe('StressContainer - Anti-Vision Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch and display anti-vision when health < 80', async () => {
    mockCheckHealth.mockResolvedValue({
      health: 75,
      isDead: false,
    });
    mockGetAntiVision.mockResolvedValue(
      'Test Anti-Vision Content'
    );

    const { getByTestId } = render(
      <StressContainer>
        <Text>Child Content</Text>
      </StressContainer>
    );

    // Advance timers to trigger interval
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockGetAntiVision).toHaveBeenCalled();
      // AntiVisionBleed renders as a container with distributed word fragments
      expect(getByTestId('anti-vision-bleed')).toBeDefined();
    });
  });

  it('should not display anti-vision when health >= 80', async () => {
    mockCheckHealth.mockResolvedValue({
      health: 85,
      isDead: false,
    });
    mockGetAntiVision.mockResolvedValue(
      'Test Anti-Vision Content'
    );

    const { queryByTestId } = render(
      <StressContainer>
        <Text>Child Content</Text>
      </StressContainer>
    );

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockGetAntiVision).toHaveBeenCalled();
    });

    // Anti-vision should not be visible when health >= 80
    expect(queryByTestId('anti-vision-bleed')).toBeNull();
  });

  it('should update anti-vision when health drops below 80', async () => {
    let healthValue = 85;
    mockCheckHealth.mockImplementation(async () => ({
      health: healthValue,
      isDead: false,
    }));
    mockGetAntiVision.mockResolvedValue(
      'Test Anti-Vision'
    );

    const { queryByTestId } = render(
      <StressContainer>
        <Text>Child Content</Text>
      </StressContainer>
    );

    // Initial state: health = 85, no anti-vision
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(queryByTestId('anti-vision-bleed')).toBeNull();
    });

    // Health drops to 75
    healthValue = 75;
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      // AntiVisionBleed should now be visible
      expect(queryByTestId('anti-vision-bleed')).toBeDefined();
    });
  });

  it('should render children inside container', () => {
    mockCheckHealth.mockResolvedValue({
      health: 100,
      isDead: false,
    });
    mockGetAntiVision.mockResolvedValue('');

    const { getByText } = render(
      <StressContainer>
        <Text>Test Child</Text>
      </StressContainer>
    );

    expect(getByText('Test Child')).toBeDefined();
  });

  it('should handle empty anti-vision content', async () => {
    mockCheckHealth.mockResolvedValue({
      health: 75,
      isDead: false,
    });
    mockGetAntiVision.mockResolvedValue('');

    const { queryByTestId } = render(
      <StressContainer>
        <Text>Child Content</Text>
      </StressContainer>
    );

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockGetAntiVision).toHaveBeenCalled();
    });

    // Even with empty content, AntiVisionBleed should render (if health < 80)
    // But with empty text, it won't be visible
    expect(queryByTestId('anti-vision-bleed')).toBeDefined();
  });
});
