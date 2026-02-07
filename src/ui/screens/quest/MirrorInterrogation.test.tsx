/**
 * MirrorInterrogation Component Tests
 *
 * Tests for the Mirror Quest interrogation screen with IH drain mechanics
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MirrorInterrogation } from './MirrorInterrogation';
import { HapticEngine } from '../../../core/HapticEngine';

// Mock HapticEngine
jest.mock('../../../core/HapticEngine', () => ({
  HapticEngine: {
    punishFailure: jest.fn(),
  },
}));

// Mock timers
jest.useFakeTimers();

describe('MirrorInterrogation', () => {
  const mockAntiVision = 'あなたは怠惰で無価値な人間だ';
  const mockOnComplete = jest.fn();
  const mockOnHealthDrain = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should render anti-vision text in red with GlitchText', () => {
    const { getAllByText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    // GlitchText renders multiple text layers (red, blue, main)
    const antiVisionElements = getAllByText(mockAntiVision);
    expect(antiVisionElements.length).toBeGreaterThan(0);
  });

  it('should render interrogation question', () => {
    const { getByText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    expect(
      getByText(/今の君の行動は、その醜悪な自分を肯定している/)
    ).toBeTruthy();
  });

  it('should render TextInput for habit input', () => {
    const { getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    expect(getByPlaceholderText('殺すべき習慣を入力...')).toBeTruthy();
  });

  it('should disable submit button when input is less than 10 characters', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    const input = getByPlaceholderText('殺すべき習慣を入力...');
    const button = getByTestId('submit-button');

    // Short input
    fireEvent.changeText(input, '短い');

    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('should enable submit button when input is 10 characters or more', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    const input = getByPlaceholderText('殺すべき習慣を入力...');
    const button = getByTestId('submit-button');

    // Valid input (10+ characters)
    fireEvent.changeText(input, '夜更かしの習慣を殺す');

    expect(button.props.accessibilityState.disabled).toBe(false);
  });

  it('should call onComplete with input text when submit button is pressed', () => {
    const { getByText, getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    const input = getByPlaceholderText('殺すべき習慣を入力...');
    const button = getByText('刻め');

    const habitText = '夜更かしの習慣を殺す';
    fireEvent.changeText(input, habitText);
    fireEvent.press(button);

    expect(mockOnComplete).toHaveBeenCalledWith(habitText);
  });

  it('should drain IH (-2%/sec) when typing stops for 5 seconds', async () => {
    const { getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    const input = getByPlaceholderText('殺すべき習慣を入力...');

    // Start typing
    fireEvent.changeText(input, '習慣');

    // Wait 5 seconds without typing
    jest.advanceTimersByTime(5000);

    // Should drain 2% (1 second elapsed after 5-second timeout)
    await waitFor(() => {
      expect(mockOnHealthDrain).toHaveBeenCalledWith(2);
    });
  });

  it('should continue draining IH every second after timeout', async () => {
    const { getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    const input = getByPlaceholderText('殺すべき習慣を入力...');

    // Start typing
    fireEvent.changeText(input, '習慣');

    // Wait 5 seconds (timeout) + 3 more seconds
    jest.advanceTimersByTime(8000);

    // Should have called drain 3 times (at 5s, 6s, 7s, 8s = 4 times)
    await waitFor(() => {
      expect(mockOnHealthDrain).toHaveBeenCalledTimes(4);
      expect(mockOnHealthDrain).toHaveBeenCalledWith(2);
    });
  });

  it('should stop draining when typing resumes', async () => {
    const { getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    const input = getByPlaceholderText('殺すべき習慣を入力...');

    // Start typing
    fireEvent.changeText(input, '習慣');

    // Wait 6 seconds (timeout + 1 drain)
    jest.advanceTimersByTime(6000);

    // Resume typing
    fireEvent.changeText(input, '習慣を殺す');

    // Clear previous calls
    mockOnHealthDrain.mockClear();

    // Advance another 3 seconds
    jest.advanceTimersByTime(3000);

    // Should not have drained (typing stopped the drain)
    expect(mockOnHealthDrain).not.toHaveBeenCalled();
  });

  it('should trigger haptic punishment when IH drains', async () => {
    const { getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    const input = getByPlaceholderText('殺すべき習慣を入力...');

    // Start typing
    fireEvent.changeText(input, '習慣');

    // Wait 6 seconds (timeout + 1 drain)
    jest.advanceTimersByTime(6000);

    // Should trigger haptic feedback
    await waitFor(() => {
      expect(HapticEngine.punishFailure).toHaveBeenCalled();
    });
  });

  it('should clean up timers on unmount', () => {
    const { unmount, getByPlaceholderText } = render(
      <MirrorInterrogation
        antiVision={mockAntiVision}
        onComplete={mockOnComplete}
        onHealthDrain={mockOnHealthDrain}
      />
    );

    const input = getByPlaceholderText('殺すべき習慣を入力...');

    // Start typing
    fireEvent.changeText(input, '習慣');

    // Unmount before timeout
    unmount();

    // Advance timers
    jest.advanceTimersByTime(10000);

    // Should not drain after unmount
    expect(mockOnHealthDrain).not.toHaveBeenCalled();
  });
});
