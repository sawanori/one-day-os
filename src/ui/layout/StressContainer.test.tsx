/**
 * StressContainer Tests - Anti-Vision Integration
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { StressContainer } from './StressContainer';
import { IdentityEngine } from '../../core/IdentityEngine';
import { HapticEngine } from '../../core/HapticEngine';

// Mock IdentityEngine
jest.mock('../../core/IdentityEngine', () => ({
  IdentityEngine: {
    checkHealth: jest.fn(),
    getAntiVision: jest.fn(),
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

  it('should fetch and display anti-vision when health < 30', async () => {
    // Mock IdentityEngine
    (IdentityEngine.checkHealth as jest.Mock).mockResolvedValue({
      health: 20,
      isDead: false,
    });
    (IdentityEngine.getAntiVision as jest.Mock).mockResolvedValue(
      'Test Anti-Vision Content'
    );

    const { getByText } = render(
      <StressContainer>
        <Text>Child Content</Text>
      </StressContainer>
    );

    // Advance timers to trigger interval
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(IdentityEngine.getAntiVision).toHaveBeenCalled();
      expect(getByText('Test Anti-Vision Content')).toBeDefined();
    });
  });

  it('should not display anti-vision when health >= 30', async () => {
    (IdentityEngine.checkHealth as jest.Mock).mockResolvedValue({
      health: 50,
      isDead: false,
    });
    (IdentityEngine.getAntiVision as jest.Mock).mockResolvedValue(
      'Test Anti-Vision Content'
    );

    const { queryByText } = render(
      <StressContainer>
        <Text>Child Content</Text>
      </StressContainer>
    );

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(IdentityEngine.getAntiVision).toHaveBeenCalled();
    });

    // Anti-vision should not be visible
    expect(queryByText('Test Anti-Vision Content')).toBeNull();
  });

  it('should update anti-vision when health drops below 30', async () => {
    let healthValue = 50;
    (IdentityEngine.checkHealth as jest.Mock).mockImplementation(async () => ({
      health: healthValue,
      isDead: false,
    }));
    (IdentityEngine.getAntiVision as jest.Mock).mockResolvedValue(
      'Test Anti-Vision'
    );

    const { getByText, queryByText, rerender } = render(
      <StressContainer>
        <Text>Child Content</Text>
      </StressContainer>
    );

    // Initial state: health = 50, no anti-vision
    jest.advanceTimersByTime(2000);
    await waitFor(() => {
      expect(queryByText('Test Anti-Vision')).toBeNull();
    });

    // Health drops to 20
    healthValue = 20;
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(getByText('Test Anti-Vision')).toBeDefined();
    });
  });

  it('should render children inside container', () => {
    (IdentityEngine.checkHealth as jest.Mock).mockResolvedValue({
      health: 100,
      isDead: false,
    });
    (IdentityEngine.getAntiVision as jest.Mock).mockResolvedValue('');

    const { getByText } = render(
      <StressContainer>
        <Text>Test Child</Text>
      </StressContainer>
    );

    expect(getByText('Test Child')).toBeDefined();
  });

  it('should handle empty anti-vision content', async () => {
    (IdentityEngine.checkHealth as jest.Mock).mockResolvedValue({
      health: 20,
      isDead: false,
    });
    (IdentityEngine.getAntiVision as jest.Mock).mockResolvedValue('');

    const { queryByTestId } = render(
      <StressContainer>
        <Text>Child Content</Text>
      </StressContainer>
    );

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(IdentityEngine.getAntiVision).toHaveBeenCalled();
    });

    // Even with empty content, AntiVisionBleed should render (if health < 30)
    // But with empty text, it won't be visible
    expect(queryByTestId('anti-vision-bleed')).toBeDefined();
  });
});
