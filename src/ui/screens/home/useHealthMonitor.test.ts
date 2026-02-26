/**
 * useHealthMonitor Hook Tests
 *
 * Tests for the health polling hook that periodically checks
 * Identity Health via IdentityEngine and triggers heartbeat
 * haptics when the Identity lens (1.0x) is active.
 */
import { renderHook, act } from '@testing-library/react-native';

// --- Mocks ---

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockCheckHealth = jest.fn();
const mockGetInstance = jest.fn(() => Promise.resolve({
  checkHealth: mockCheckHealth,
}));

jest.mock('../../../core/identity/IdentityEngine', () => ({
  IdentityEngine: {
    get getInstance() {
      return mockGetInstance;
    },
  },
}));

const mockPulseHeartbeat = jest.fn();
jest.mock('../../../core/HapticEngine', () => ({
  HapticEngine: {
    get pulseHeartbeat() {
      return mockPulseHeartbeat;
    },
  },
}));

import { useHealthMonitor } from './useHealthMonitor';

describe('useHealthMonitor', () => {
  beforeEach(() => {
    mockCheckHealth.mockReset();
    mockGetInstance.mockClear();
    mockPulseHeartbeat.mockReset();
    mockReplace.mockReset();
    jest.useFakeTimers();
    mockCheckHealth.mockResolvedValue({ health: 100, isDead: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial health value of 100', () => {
    const { result } = renderHook(() => useHealthMonitor(0.5));
    expect(result.current.health).toBe(100);
  });

  it('should poll health and update state', async () => {
    mockCheckHealth.mockResolvedValue({ health: 75, isDead: false });

    const { result } = renderHook(() => useHealthMonitor(0.5));

    // Wait for the initial checkHealth call to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCheckHealth).toHaveBeenCalledTimes(1);
    expect(result.current.health).toBe(75);
  });

  it('should poll on 2-second interval', async () => {
    mockCheckHealth
      .mockResolvedValueOnce({ health: 100, isDead: false })
      .mockResolvedValueOnce({ health: 80, isDead: false });

    const { result } = renderHook(() => useHealthMonitor(0.5));

    // Initial call
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.health).toBe(100);

    // Advance by 2 seconds for next poll
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockCheckHealth).toHaveBeenCalledTimes(2);
    expect(result.current.health).toBe(80);
  });

  it('should clean up interval on unmount', async () => {
    const { unmount } = renderHook(() => useHealthMonitor(0.5));

    // Let initial call resolve
    await act(async () => {
      await Promise.resolve();
    });

    mockCheckHealth.mockClear();
    unmount();

    // Advance time after unmount - should not call checkHealth
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(mockCheckHealth).not.toHaveBeenCalled();
  });

  it('should expose setHealth to allow external updates', () => {
    const { result } = renderHook(() => useHealthMonitor(0.5));

    act(() => {
      result.current.setHealth(50);
    });

    expect(result.current.health).toBe(50);
  });

  // --- isDead navigation tests ---

  it('should navigate to /death when isDead is true', async () => {
    mockCheckHealth.mockResolvedValue({ health: 0, isDead: true });

    renderHook(() => useHealthMonitor(0.5));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledWith('/death');
  });

  it('should NOT navigate to /death when isDead is false', async () => {
    mockCheckHealth.mockResolvedValue({ health: 5, isDead: false });

    renderHook(() => useHealthMonitor(0.5));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should only navigate once even if isDead stays true', async () => {
    mockCheckHealth.mockResolvedValue({ health: 0, isDead: true });

    renderHook(() => useHealthMonitor(0.5));

    await act(async () => {
      await Promise.resolve();
    });

    // Advance timer for second poll
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  // --- Heartbeat haptic tests ---

  it('should start heartbeat haptics when lens is 1.0', async () => {
    renderHook(() => useHealthMonitor(1.0));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockPulseHeartbeat).toHaveBeenCalled();
  });

  it('should NOT trigger heartbeat haptics when lens is 0.5', async () => {
    renderHook(() => useHealthMonitor(0.5));

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockPulseHeartbeat).not.toHaveBeenCalled();
  });

  it('should NOT trigger heartbeat haptics when lens is 2.0', async () => {
    renderHook(() => useHealthMonitor(2.0));

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockPulseHeartbeat).not.toHaveBeenCalled();
  });

  it('should stop heartbeat haptics when lens changes away from 1.0', async () => {
    const { rerender } = renderHook(
      (props: { lens: 0.5 | 1.0 | 2.0 }) => useHealthMonitor(props.lens),
      { initialProps: { lens: 1.0 as 0.5 | 1.0 | 2.0 } }
    );

    // Heartbeat should fire at 1.0
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockPulseHeartbeat).toHaveBeenCalled();

    mockPulseHeartbeat.mockClear();

    // Switch to 0.5 lens
    rerender({ lens: 0.5 });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockPulseHeartbeat).not.toHaveBeenCalled();
  });
});
