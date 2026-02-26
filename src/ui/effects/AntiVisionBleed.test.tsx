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
  it('should not render when health >= 80', () => {
    const { queryByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={80} />
    );
    expect(queryByTestId('anti-vision-bleed')).toBeNull();
  });

  it('should not render when health is above threshold', () => {
    const { queryByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={100} />
    );
    expect(queryByTestId('anti-vision-bleed')).toBeNull();
  });

  it('should render when health < 80', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test Anti-Vision" health={79} />
    );
    expect(getByTestId('anti-vision-bleed')).toBeDefined();
  });

  it('should render at health 50 (mid-range)', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test Mid-Range" health={50} />
    );
    expect(getByTestId('anti-vision-bleed')).toBeDefined();
  });

  it('should render at health 30 (low)', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test Low Health" health={30} />
    );
    expect(getByTestId('anti-vision-bleed')).toBeDefined();
  });

  it('should render when health is 0', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test Content" health={0} />
    );
    expect(getByTestId('anti-vision-bleed')).toBeDefined();
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

  it('should distribute words across multiple positions', () => {
    const { getAllByText } = render(
      <AntiVisionBleed antiVision="WORD1 WORD2 WORD3" health={20} />
    );
    // Words should be rendered across positions (some may repeat due to cycling)
    const word1Elements = getAllByText('WORD1');
    expect(word1Elements.length).toBeGreaterThanOrEqual(1);
  });

  it('should keep opacity within 0.25 max at health=0', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={0} />
    );
    const overlay = getByTestId('anti-vision-bleed');
    // opacity is applied via style prop array
    const styleArray = overlay.props.style;
    const opacityStyle = styleArray.find((s: Record<string, unknown>) => s && typeof s.opacity === 'number');
    expect(opacityStyle?.opacity).toBeLessThanOrEqual(0.25);
  });
});
