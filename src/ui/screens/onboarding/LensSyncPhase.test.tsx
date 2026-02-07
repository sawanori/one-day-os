/**
 * LensSyncPhase Test Suite
 * Tests the lens synchronization phase of onboarding ceremony
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LensSyncPhase } from './LensSyncPhase';
import { HapticEngine } from '../../../core/HapticEngine';

// Mock HapticEngine
jest.mock('../../../core/HapticEngine', () => ({
  HapticEngine: {
    snapLens: jest.fn(),
    punishFailure: jest.fn(),
  },
}));

// Mock useLensGesture hook
jest.mock('../../lenses/useLensGesture', () => ({
  useLensGesture: jest.fn((onLensChange) => ({
    panResponder: {
      panHandlers: {},
    },
    scale: {
      _value: 1.0,
      addListener: jest.fn(() => 'mock-listener-id'),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    },
  })),
}));

describe('LensSyncPhase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with instruction text', () => {
    const onComplete = jest.fn();
    const { getByText } = render(<LensSyncPhase onComplete={onComplete} />);

    expect(getByText('ピンチで2.0xまで拡大せよ。中途半端は許されない。')).toBeTruthy();
  });

  it('displays initial scale value as 1.0x', () => {
    const onComplete = jest.fn();
    const { getByText } = render(<LensSyncPhase onComplete={onComplete} />);

    expect(getByText('1.0x')).toBeTruthy();
  });

  it('renders target circle', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<LensSyncPhase onComplete={onComplete} />);

    expect(getByTestId('target-circle')).toBeTruthy();
  });

  it('target circle is dashed initially', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<LensSyncPhase onComplete={onComplete} />);

    const circle = getByTestId('target-circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderStyle: 'dashed',
        })
      ])
    );
  });

  it('does not call onComplete on mount', () => {
    const onComplete = jest.fn();
    render(<LensSyncPhase onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not trigger haptics on mount', () => {
    const onComplete = jest.fn();
    render(<LensSyncPhase onComplete={onComplete} />);

    expect(HapticEngine.snapLens).not.toHaveBeenCalled();
    expect(HapticEngine.punishFailure).not.toHaveBeenCalled();
  });
});
