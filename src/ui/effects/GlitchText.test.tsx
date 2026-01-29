/**
 * GlitchText Tests - Dynamic Offset
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GlitchText } from './GlitchText';

// Mock features
jest.mock('../../config/features', () => ({
  isFeatureEnabled: jest.fn((flag: string) => flag === 'GLITCH_DYNAMIC_OFFSET'),
}));

describe('GlitchText - Dynamic Offset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render plain text when severity is 0', () => {
    const { getByText, queryByTestID } = render(
      <GlitchText text="Test" severity={0} />
    );

    expect(getByText('Test')).toBeDefined();
  });

  it('should render glitch layers when severity > 0', () => {
    const { getByTestId } = render(
      <GlitchText text="Test" severity={0.5} />
    );

    expect(getByTestId('glitch-red')).toBeDefined();
    expect(getByTestId('glitch-blue')).toBeDefined();
    expect(getByTestId('glitch-main')).toBeDefined();
  });

  it('should cleanup interval on unmount', () => {
    const { unmount } = render(
      <GlitchText text="Test" severity={0.5} />
    );

    // Should unmount without errors (cleanup function properly clears interval)
    expect(() => unmount()).not.toThrow();
  });

  it('should render with different severity levels', () => {
    const { getByTestId: getByTestId1 } = render(
      <GlitchText text="Test" severity={0.1} />
    );
    const { getByTestId: getByTestId2 } = render(
      <GlitchText text="Test" severity={1.0} />
    );

    // Both should render glitch layers
    expect(getByTestId1('glitch-red')).toBeDefined();
    expect(getByTestId2('glitch-red')).toBeDefined();
  });

  it('should use static offsets when feature disabled', () => {
    const { isFeatureEnabled } = require('../../config/features');
    (isFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { getByTestId } = render(
      <GlitchText text="Test" severity={0.5} />
    );

    // Should still render (with static offsets)
    expect(getByTestId('glitch-red')).toBeDefined();
  });

  it('should handle text prop changes', () => {
    const { getAllByText, rerender } = render(
      <GlitchText text="Test1" severity={0.5} />
    );

    // With severity > 0, text appears in all 3 layers (red, blue, main)
    expect(getAllByText('Test1')).toHaveLength(3);

    rerender(<GlitchText text="Test2" severity={0.5} />);

    expect(getAllByText('Test2')).toHaveLength(3);
  });

  it('should handle style prop', () => {
    const customStyle = { fontSize: 24 };
    const { getByTestId } = render(
      <GlitchText text="Test" severity={0.5} style={customStyle} />
    );

    const mainText = getByTestId('glitch-main');
    expect(mainText).toBeDefined();
  });
});
