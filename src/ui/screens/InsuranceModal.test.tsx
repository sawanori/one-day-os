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

describe('InsuranceModal', () => {
  const mockOnPurchase = jest.fn();
  const mockOnDecline = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={3}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('Identity Insurance - ¥1,500')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('今すぐ購入')).toBeTruthy();
    expect(getByText('死を受け入れる')).toBeTruthy();
  });

  it('calls onPurchase when purchase button pressed', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={3}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    fireEvent.press(getByText('今すぐ購入'));
    expect(mockOnPurchase).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when decline button pressed', () => {
    const { getByText } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={3}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    fireEvent.press(getByText('死を受け入れる'));
    expect(mockOnDecline).toHaveBeenCalledTimes(1);
  });

  it('displays countdown seconds', () => {
    const { getByText, rerender } = render(
      <InsuranceModal
        visible={true}
        countdownSeconds={3}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('3')).toBeTruthy();

    rerender(
      <InsuranceModal
        visible={true}
        countdownSeconds={2}
        onPurchase={mockOnPurchase}
        onDecline={mockOnDecline}
      />
    );

    expect(getByText('2')).toBeTruthy();
  });

  it('triggers haptic feedback when countdown reaches 1', () => {
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
});
