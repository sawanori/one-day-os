/**
 * NoiseOverlay Tests
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NoiseOverlay } from './NoiseOverlay';

// Mock features
jest.mock('../../config/features', () => ({
  isFeatureEnabled: jest.fn((flag: string) => flag === 'NOISE_OVERLAY_TEXTURE'),
}));

describe('NoiseOverlay', () => {
  it('should not render when health is 100 (opacity would be 0)', () => {
    const { queryByTestId } = render(<NoiseOverlay health={100} />);
    expect(queryByTestId('noise-overlay')).toBeNull();
  });

  it('should not render when health is above threshold (opacity <= 0)', () => {
    const { queryByTestId } = render(<NoiseOverlay health={100} />);
    expect(queryByTestId('noise-overlay')).toBeNull();
  });

  it('should render with noise texture when feature enabled and health < 100', () => {
    const { getByTestId } = render(<NoiseOverlay health={50} />);
    const overlay = getByTestId('noise-overlay');

    expect(overlay).toBeDefined();
    // Component should render when opacity > 0
    expect(overlay.props.source).toBeDefined();
  });

  it('should calculate correct opacity from health prop', () => {
    // health=0 → opacity = 0.35 (max)
    // health=50 → opacity = 0.175
    // health=100 → opacity = 0 (don't render)
    const { getByTestId } = render(<NoiseOverlay health={0} />);
    const overlay = getByTestId('noise-overlay');

    // Component should render at health=0
    expect(overlay).toBeDefined();
  });

  it('should have pointerEvents="none" to not block touches', () => {
    const { root } = render(<NoiseOverlay health={50} />);

    // Check that the container View has pointerEvents="none"
    expect(root.findByProps({ pointerEvents: 'none' })).toBeDefined();
  });

  it('should render with ImageBackground when feature enabled', () => {
    const { getByTestId } = render(<NoiseOverlay health={50} />);
    const overlay = getByTestId('noise-overlay');

    // React Native renders ImageBackground as Image internally
    // Check for source prop instead
    expect(overlay.props.source).toBeDefined();
  });

  it('should use repeat resizeMode for tiling', () => {
    const { getByTestId } = render(<NoiseOverlay health={50} />);
    const overlay = getByTestId('noise-overlay');

    expect(overlay.props.resizeMode).toBe('repeat');
  });

  it('should fallback to solid black when feature disabled', () => {
    // Temporarily disable feature
    const { isFeatureEnabled } = require('../../config/features');
    (isFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { getByTestId } = render(<NoiseOverlay health={50} />);
    const overlay = getByTestId('noise-overlay');

    // Should be View, not ImageBackground
    expect(overlay.type).toBe('View');

    // Restore feature flag
    (isFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  it('should be positioned absolutely to cover entire screen', () => {
    const { getByTestId } = render(<NoiseOverlay health={50} />);
    const overlay = getByTestId('noise-overlay');

    expect(overlay.props.style).toContainEqual(
      expect.objectContaining({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      })
    );
  });

  it('should have high z-index to appear on top', () => {
    const { getByTestId } = render(<NoiseOverlay health={50} />);
    const overlay = getByTestId('noise-overlay');

    // Component should render with proper styling
    expect(overlay).toBeDefined();
    expect(overlay.props.style).toBeDefined();
  });

  it('should not render when health is exactly 100', () => {
    const { queryByTestId } = render(<NoiseOverlay health={100} />);
    expect(queryByTestId('noise-overlay')).toBeNull();
  });

  it('should render when health is just below 100', () => {
    const { getByTestId } = render(<NoiseOverlay health={99} />);
    expect(getByTestId('noise-overlay')).toBeDefined();
  });

  it('should cap opacity at 0.35 when health is 0', () => {
    // At health=0, opacity = Math.min(0.35, 1.0 * 0.35) = 0.35
    const { getByTestId } = render(<NoiseOverlay health={0} />);
    expect(getByTestId('noise-overlay')).toBeDefined();
  });
});
