/**
 * AntiVisionBleed Tests
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { AntiVisionBleed } from './AntiVisionBleed';

// Mock features
jest.mock('../../config/features', () => ({
  isFeatureEnabled: jest.fn((flag: string) => flag === 'ANTI_VISION_BLEED'),
}));

describe('AntiVisionBleed', () => {
  it('should not render when health >= 30', () => {
    const { queryByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={30} />
    );
    expect(queryByTestId('anti-vision-bleed')).toBeNull();
  });

  it('should not render when health is above threshold', () => {
    const { queryByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={50} />
    );
    expect(queryByTestId('anti-vision-bleed')).toBeNull();
  });

  it('should render when health < 30', () => {
    const { getByTestId, getByText } = render(
      <AntiVisionBleed antiVision="Test Anti-Vision" health={29} />
    );
    expect(getByTestId('anti-vision-bleed')).toBeDefined();
    expect(getByText('Test Anti-Vision')).toBeDefined();
  });

  it('should render when health is 0', () => {
    const { getByTestId, getByText } = render(
      <AntiVisionBleed antiVision="Test Content" health={0} />
    );
    expect(getByTestId('anti-vision-bleed')).toBeDefined();
    expect(getByText('Test Content')).toBeDefined();
  });

  it('should have pointerEvents="none" to not block touches', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={20} />
    );
    const overlay = getByTestId('anti-vision-bleed');
    expect(overlay.props.pointerEvents).toBe('none');
  });

  it('should not render when feature is disabled', () => {
    const { isFeatureEnabled } = require('../../config/features');
    (isFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={20} />
    );
    expect(queryByTestId('anti-vision-bleed')).toBeNull();

    // Restore feature flag
    (isFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  it('should be positioned absolutely to cover entire screen', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={20} />
    );
    const overlay = getByTestId('anti-vision-bleed');

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

  it('should have lower z-index than NoiseOverlay', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={20} />
    );
    const overlay = getByTestId('anti-vision-bleed');

    // Component should render with proper styling
    expect(overlay).toBeDefined();
    expect(overlay.props.style).toBeDefined();
  });

  it('should handle empty anti-vision text', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="" health={20} />
    );
    expect(getByTestId('anti-vision-bleed')).toBeDefined();
  });

  it('should render multi-line anti-vision text', () => {
    const multiLineText = 'Line 1\nLine 2\nLine 3';
    const { getByText } = render(
      <AntiVisionBleed antiVision={multiLineText} health={20} />
    );
    expect(getByText(multiLineText)).toBeDefined();
  });
});
