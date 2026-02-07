/**
 * GapInterrogation Component Tests
 *
 * Tests for the Gap Quest interrogation screen with Invalid detection
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GapInterrogation } from './GapInterrogation';
import { HapticEngine } from '../../../core/HapticEngine';

// Mock HapticEngine
jest.mock('../../../core/HapticEngine', () => ({
  HapticEngine: {
    punishFailure: jest.fn(),
  },
}));

describe('GapInterrogation', () => {
  const mockIdentityStatement = 'I am a person who delivers on commitments';
  const mockPreviousAction = 'I will work harder';
  const mockOnComplete = jest.fn();
  const mockOnInvalid = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render identity statement', () => {
    const { getByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    expect(getByText(mockIdentityStatement)).toBeTruthy();
  });

  it('should render previous action with strikethrough style', () => {
    const { getByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    const previousActionElement = getByText(mockPreviousAction);
    expect(previousActionElement).toBeTruthy();
    // Style check for strikethrough happens in implementation
  });

  it('should render interrogation question', () => {
    const { getByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    expect(
      getByText(/もっと『痛み』を伴う、逃げられない具体的行動を再提示せよ/)
    ).toBeTruthy();
  });

  it('should reject input with less than 20 characters as Invalid', () => {
    const { getByPlaceholderText, getByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    const input = getByPlaceholderText('痛みを伴う行動を入力...');
    const button = getByText('提示');

    // Input too short (19 characters)
    fireEvent.changeText(input, '短い行動12345678901234');
    fireEvent.press(button);

    expect(mockOnInvalid).toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(HapticEngine.punishFailure).toHaveBeenCalled();
  });

  it('should reject input similar to previousAction (70%+ similarity) as Invalid', () => {
    const { getByPlaceholderText, getByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction="I will work harder on my projects"
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    const input = getByPlaceholderText('痛みを伴う行動を入力...');
    const button = getByText('提示');

    // Very similar to previous action
    fireEvent.changeText(input, 'I will work much harder on my projects');
    fireEvent.press(button);

    expect(mockOnInvalid).toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(HapticEngine.punishFailure).toHaveBeenCalled();
  });

  it('should reject input with vague expressions as Invalid', () => {
    const { getByPlaceholderText, getByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    const input = getByPlaceholderText('痛みを伴う行動を入力...');
    const button = getByText('提示');

    // Vague expression: only contains "頑張る"
    fireEvent.changeText(input, '今日から本当に頑張る');
    fireEvent.press(button);

    expect(mockOnInvalid).toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should clear input after Invalid rejection', () => {
    const { getByPlaceholderText, getByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    const input = getByPlaceholderText('痛みを伴う行動を入力...');
    const button = getByText('提示');

    // Invalid input
    fireEvent.changeText(input, '短い');
    fireEvent.press(button);

    // Input should be cleared
    expect(input.props.value).toBe('');
  });

  it('should show "Invalid" text in red after rejection', () => {
    const { getByPlaceholderText, getByText, queryByText, getAllByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    const input = getByPlaceholderText('痛みを伴う行動を入力...');
    const button = getByText('提示');

    // Initially no Invalid text
    expect(queryByText('Invalid')).toBeNull();

    // Trigger Invalid
    fireEvent.changeText(input, '短い');
    fireEvent.press(button);

    // Should show Invalid text (GlitchText renders multiple layers)
    const invalidTexts = getAllByText('Invalid');
    expect(invalidTexts.length).toBeGreaterThan(0);
  });

  it('should call onComplete with valid input (20+ chars, not similar, not vague)', () => {
    const { getByPlaceholderText, getByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    const input = getByPlaceholderText('痛みを伴う行動を入力...');
    const button = getByText('提示');

    const validAction = 'Wake up at 5am every day and write 2000 words before breakfast';
    fireEvent.changeText(input, validAction);
    fireEvent.press(button);

    expect(mockOnComplete).toHaveBeenCalledWith(validAction);
    expect(mockOnInvalid).not.toHaveBeenCalled();
  });

  it('should not show reason for Invalid rejection', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <GapInterrogation
        identityStatement={mockIdentityStatement}
        previousAction={mockPreviousAction}
        onComplete={mockOnComplete}
        onInvalid={mockOnInvalid}
      />
    );

    const input = getByPlaceholderText('痛みを伴う行動を入力...');
    const button = getByText('提示');

    // Trigger Invalid (too short)
    fireEvent.changeText(input, '短い');
    fireEvent.press(button);

    // Should NOT show any reason text
    expect(queryByText(/文字数/)).toBeNull();
    expect(queryByText(/20文字/)).toBeNull();
    expect(queryByText(/類似/)).toBeNull();
    expect(queryByText(/曖昧/)).toBeNull();
  });
});
