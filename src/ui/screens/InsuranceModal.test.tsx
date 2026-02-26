/**
 * InsuranceModal Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InsuranceModal } from './InsuranceModal';

// Mock HapticEngine
jest.mock('../../core/HapticEngine', () => ({
  HapticEngine: {
    punishFailure: jest.fn(),
  },
}));

// Mock GlitchText to render plain text for testing
jest.mock('../effects/GlitchText', () => ({
  GlitchText: ({ text, style }: { text: string; style?: any }) => {
    const { Text } = require('react-native');
    return <Text testID="glitch-text">{text}</Text>;
  },
}));

// Mock NoiseOverlay
jest.mock('../effects/NoiseOverlay', () => ({
  NoiseOverlay: ({ opacity }: { opacity: number }) => {
    const { View } = require('react-native');
    return <View testID="noise-overlay" />;
  },
}));

describe('InsuranceModal', () => {
  const mockOnPurchase = jest.fn();
  const mockOnDecline = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title "IDENTITY INSURANCE" via GlitchText', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('IDENTITY INSURANCE')).toBeTruthy();
  });

  it('renders "I AM WEAK" shame label text', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('I AM WEAK')).toBeTruthy();
  });

  it('renders "PURCHASE NOW" purchase button', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('PURCHASE NOW')).toBeTruthy();
  });

  it('renders "ACCEPT DEATH" decline button', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('ACCEPT DEATH')).toBeTruthy();
  });

  it('shows countdown with zero-padded format', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={5}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('05')).toBeTruthy();
  });

  it('shows countdown updating on rerender', () => {
    const { getByText, rerender } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('10')).toBeTruthy();

    rerender(
      <InsuranceModal
        visible={true}
        countdownSeconds={3}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('03')).toBeTruthy();
  });

  it('calls onPurchase when purchase button pressed', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    fireEvent.press(getByText('PURCHASE NOW'));
    expect(mockOnPurchase).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when decline button pressed', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    fireEvent.press(getByText('ACCEPT DEATH'));
    expect(mockOnDecline).toHaveBeenCalledTimes(1);
  });

  it('triggers punishFailure haptic at countdown <= 1', () => {
    const { HapticEngine } = require('../../core/HapticEngine');

    render(
      <InsuranceModal
        visible={true}
        countdownSeconds={1}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(HapticEngine.punishFailure).toHaveBeenCalled();
  });

  it('does not trigger haptic when countdown > 1', () => {
    const { HapticEngine } = require('../../core/HapticEngine');

    render(
      <InsuranceModal
        visible={true}
        countdownSeconds={5}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(HapticEngine.punishFailure).not.toHaveBeenCalled();
  });

  it('renders NoiseOverlay for atmosphere', () => {
    const { getByTestId } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByTestId('noise-overlay')).toBeTruthy();
  });

  it('renders copy text', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={10}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText(/Will you erase everything/)).toBeTruthy();
  });
});
