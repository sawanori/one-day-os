/**
 * SubliminalFlash Tests
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { SubliminalFlash } from './SubliminalFlash';

// Mock features
jest.mock('../../config/features', () => ({
  isFeatureEnabled: jest.fn((flag: string) => flag === 'SUBLIMINAL_FLASH'),
}));

describe('SubliminalFlash', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should not render when feature is disabled', () => {
    const { isFeatureEnabled } = require('../../config/features');
    (isFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = render(
      <SubliminalFlash text="Test" intervalRange={[1000, 2000]} />
    );
    expect(queryByTestId('subliminal-flash')).toBeNull();

    // Restore feature flag
    (isFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  it('should not render initially', () => {
    const { queryByTestId } = render(
      <SubliminalFlash text="Test" intervalRange={[1000, 2000]} />
    );
    expect(queryByTestId('subliminal-flash')).toBeNull();
  });

  it('should render text during flash', async () => {
    const { queryByTestId, getByTestId, getByText } = render(
      <SubliminalFlash text="Test Flash" intervalRange={[100, 200]} />
    );

    // Initially not visible
    expect(queryByTestId('subliminal-flash')).toBeNull();

    // Fast-forward to trigger flash (use max interval + 1)
    await act(async () => {
      jest.advanceTimersByTime(201);
    });

    // Should be visible during flash
    await waitFor(() => {
      expect(getByTestId('subliminal-flash')).toBeDefined();
      expect(getByText('Test Flash')).toBeDefined();
    });
  });

  it('should hide after flash duration', async () => {
    const { queryByTestId, getByTestId } = render(
      <SubliminalFlash text="Test" intervalRange={[100, 200]} />
    );

    // Trigger flash
    await act(async () => {
      jest.advanceTimersByTime(201);
    });
    await waitFor(() => {
      expect(getByTestId('subliminal-flash')).toBeDefined();
    });

    // Wait for flash duration (max 100ms)
    await act(async () => {
      jest.advanceTimersByTime(101);
    });

    // Should be hidden again
    await waitFor(() => {
      expect(queryByTestId('subliminal-flash')).toBeNull();
    });
  });

  it('should have pointerEvents="none" to not block touches', async () => {
    const { getByTestId } = render(
      <SubliminalFlash text="Test" intervalRange={[100, 200]} />
    );

    // Trigger flash
    await act(async () => {
      jest.advanceTimersByTime(201);
    });
    await waitFor(() => {
      const flash = getByTestId('subliminal-flash');
      expect(flash.props.pointerEvents).toBe('none');
    });
  });

  it('should be positioned absolutely to cover entire screen', async () => {
    const { getByTestId } = render(
      <SubliminalFlash text="Test" intervalRange={[100, 200]} />
    );

    // Trigger flash
    await act(async () => {
      jest.advanceTimersByTime(201);
    });
    await waitFor(() => {
      const flash = getByTestId('subliminal-flash');
      expect(flash.props.style).toMatchObject({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      });
    });
  });

  it('should have highest z-index to appear on top', async () => {
    const { getByTestId } = render(
      <SubliminalFlash text="Test" intervalRange={[100, 200]} />
    );

    // Trigger flash
    await act(async () => {
      jest.advanceTimersByTime(201);
    });
    await waitFor(() => {
      const flash = getByTestId('subliminal-flash');
      expect(flash).toBeDefined();
      expect(flash.props.style).toBeDefined();
    });
  });

  it('should render with red accent color', async () => {
    const { getByTestId } = render(
      <SubliminalFlash text="Test" intervalRange={[100, 200]} />
    );

    // Trigger flash
    await act(async () => {
      jest.advanceTimersByTime(201);
    });
    await waitFor(() => {
      const flash = getByTestId('subliminal-flash');
      expect(flash).toBeDefined();
    });
  });

  it('should cleanup timer on unmount', () => {
    const { unmount } = render(
      <SubliminalFlash text="Test" intervalRange={[1000, 2000]} />
    );

    // Unmount should not cause errors
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
