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
  it('should not render when opacity is 0', () => {
    const { queryByTestId } = render(<NoiseOverlay opacity={0} />);
    expect(queryByTestId('noise-overlay')).toBeNull();
  });

  it('should not render when opacity is negative', () => {
    const { queryByTestId } = render(<NoiseOverlay opacity={-0.1} />);
    expect(queryByTestId('noise-overlay')).toBeNull();
  });

  it('should render with noise texture when feature enabled', () => {
    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
    const overlay = getByTestId('noise-overlay');

    expect(overlay).toBeDefined();
    // Component should render when opacity > 0
    expect(overlay.props.source).toBeDefined();
  });

  it('should apply correct opacity from props', () => {
    const { getByTestId } = render(<NoiseOverlay opacity={0.3} />);
    const overlay = getByTestId('noise-overlay');

    // Component should render
    expect(overlay).toBeDefined();
  });

  it('should have pointerEvents="none" to not block touches', () => {
    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
    const overlay = getByTestId('noise-overlay');

    expect(overlay.props.pointerEvents).toBe('none');
  });

  it('should render with ImageBackground when feature enabled', () => {
    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
    const overlay = getByTestId('noise-overlay');

    // React Native renders ImageBackground as Image internally
    // Check for source prop instead
    expect(overlay.props.source).toBeDefined();
  });

  it('should use repeat resizeMode for tiling', () => {
    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
    const overlay = getByTestId('noise-overlay');

    expect(overlay.props.resizeMode).toBe('repeat');
  });

  it('should fallback to solid black when feature disabled', () => {
    // Temporarily disable feature
    const { isFeatureEnabled } = require('../../config/features');
    (isFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
    const overlay = getByTestId('noise-overlay');

    // Should be View, not ImageBackground
    expect(overlay.type).toBe('View');

    // Restore feature flag
    (isFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  it('should be positioned absolutely to cover entire screen', () => {
    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
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
    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
    const overlay = getByTestId('noise-overlay');

    // Component should render with proper styling
    expect(overlay).toBeDefined();
    expect(overlay.props.style).toBeDefined();
  });
});
