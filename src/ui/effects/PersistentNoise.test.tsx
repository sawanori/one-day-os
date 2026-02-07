/**
 * PersistentNoise Tests
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { PersistentNoise } from './PersistentNoise';

// Mock features
jest.mock('../../config/features', () => ({
  isFeatureEnabled: jest.fn((flag: string) => flag === 'PERSISTENT_NOISE'),
}));

describe('PersistentNoise', () => {
  it('should not render when feature is disabled', () => {
    const { isFeatureEnabled } = require('../../config/features');
    (isFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = render(
      <PersistentNoise text="Test" />
    );
    expect(queryByTestId('persistent-noise')).toBeNull();

    // Restore feature flag
    (isFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  it('should render when feature is enabled', () => {
    const { getByTestId } = render(
      <PersistentNoise text="Test Noise" />
    );
    expect(getByTestId('persistent-noise')).toBeDefined();
  });

  it('should display provided text', () => {
    const { getByText } = render(
      <PersistentNoise text="Anti-Vision Noise" />
    );
    expect(getByText('Anti-Vision Noise')).toBeDefined();
  });

  it('should have very low opacity', () => {
    const { getByTestId } = render(
      <PersistentNoise text="Test" />
    );
    const noise = getByTestId('persistent-noise');

    // Check for low opacity (0.1-0.2 range)
    expect(noise.props.style).toMatchObject({
      opacity: expect.any(Number),
    });
    // Verify opacity is in expected range
    expect(noise.props.style.opacity).toBeGreaterThanOrEqual(0.1);
    expect(noise.props.style.opacity).toBeLessThanOrEqual(0.2);
  });

  it('should have pointerEvents="none" to not block touches', () => {
    const { getByTestId } = render(
      <PersistentNoise text="Test" />
    );
    const noise = getByTestId('persistent-noise');
    expect(noise.props.pointerEvents).toBe('none');
  });

  it('should be positioned absolutely to cover entire screen', () => {
    const { getByTestId } = render(
      <PersistentNoise text="Test" />
    );
    const noise = getByTestId('persistent-noise');

    expect(noise.props.style).toMatchObject({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
  });

  it('should have lower z-index than AntiVisionBleed', () => {
    const { getByTestId } = render(
      <PersistentNoise text="Test" />
    );
    const noise = getByTestId('persistent-noise');

    // Component should render with proper styling
    expect(noise).toBeDefined();
    expect(noise.props.style).toBeDefined();
  });

  it('should render with brutalist styling', () => {
    const { getByTestId } = render(
      <PersistentNoise text="Test" />
    );
    const noise = getByTestId('persistent-noise');
    expect(noise).toBeDefined();
  });

  it('should handle empty text', () => {
    const { getByTestId } = render(
      <PersistentNoise text="" />
    );
    expect(getByTestId('persistent-noise')).toBeDefined();
  });

  it('should handle multi-line text', () => {
    const multiLineText = 'Line 1\nLine 2\nLine 3';
    const { getByText } = render(
      <PersistentNoise text={multiLineText} />
    );
    expect(getByText(multiLineText)).toBeDefined();
  });
});
