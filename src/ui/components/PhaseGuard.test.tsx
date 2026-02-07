/**
 * PhaseGuard Tests
 *
 * Tests time-based access control for MORNING and EVENING phases.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PhaseGuard } from './PhaseGuard';

// Mock GlitchText to simplify assertions
jest.mock('../effects/GlitchText', () => ({
  GlitchText: ({ text, style }: { text: string; style?: any }) => {
    const { Text } = require('react-native');
    return <Text testID="glitch-text">{text}</Text>;
  },
}));

// Mock features
jest.mock('../../config/features', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));

/**
 * Helper to set fake system time to a specific hour and minute.
 */
const setTime = (hour: number, minute: number = 0) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 1, 8, hour, minute, 0));
};

afterEach(() => {
  jest.useRealTimers();
});

describe('PhaseGuard', () => {
  // ----- Renders children when within allowed phase -----

  it('renders children when within MORNING phase (6:00-12:00)', () => {
    setTime(8, 30); // 08:30 - within MORNING

    const { getByText, queryByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Morning Content</Text>
      </PhaseGuard>
    );

    expect(getByText('Morning Content')).toBeTruthy();
    expect(queryByText('アクセス不可')).toBeNull();
  });

  it('renders children when within EVENING phase (18:00-24:00)', () => {
    setTime(20, 0); // 20:00 - within EVENING

    const { getByText, queryByText } = render(
      <PhaseGuard phase="EVENING">
        <Text>Evening Content</Text>
      </PhaseGuard>
    );

    expect(getByText('Evening Content')).toBeTruthy();
    expect(queryByText('アクセス不可')).toBeNull();
  });

  // ----- Shows restriction when outside allowed phase -----

  it('shows restriction message when outside MORNING phase', () => {
    setTime(14, 0); // 14:00 - outside MORNING

    const { getByText, queryByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Morning Content</Text>
      </PhaseGuard>
    );

    expect(queryByText('Morning Content')).toBeNull();
    expect(getByText('アクセス不可')).toBeTruthy();
  });

  it('shows restriction message when outside EVENING phase', () => {
    setTime(10, 0); // 10:00 - outside EVENING

    const { getByText, queryByText } = render(
      <PhaseGuard phase="EVENING">
        <Text>Evening Content</Text>
      </PhaseGuard>
    );

    expect(queryByText('Evening Content')).toBeNull();
    expect(getByText('アクセス不可')).toBeTruthy();
  });

  // ----- MORNING phase boundary tests -----

  it('allows access at MORNING start boundary (06:00)', () => {
    setTime(6, 0);

    const { getByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Morning Start</Text>
      </PhaseGuard>
    );

    expect(getByText('Morning Start')).toBeTruthy();
  });

  it('allows access at MORNING 11:59', () => {
    setTime(11, 59);

    const { getByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Morning End</Text>
      </PhaseGuard>
    );

    expect(getByText('Morning End')).toBeTruthy();
  });

  it('blocks access at MORNING end boundary (12:00)', () => {
    setTime(12, 0);

    const { getByText, queryByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Morning Content</Text>
      </PhaseGuard>
    );

    expect(queryByText('Morning Content')).toBeNull();
    expect(getByText('アクセス不可')).toBeTruthy();
  });

  it('blocks MORNING access before start (05:59)', () => {
    setTime(5, 59);

    const { queryByText, getByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Morning Content</Text>
      </PhaseGuard>
    );

    expect(queryByText('Morning Content')).toBeNull();
    expect(getByText('アクセス不可')).toBeTruthy();
  });

  // ----- EVENING phase boundary tests -----

  it('allows access at EVENING start boundary (18:00)', () => {
    setTime(18, 0);

    const { getByText } = render(
      <PhaseGuard phase="EVENING">
        <Text>Evening Start</Text>
      </PhaseGuard>
    );

    expect(getByText('Evening Start')).toBeTruthy();
  });

  it('allows access at EVENING 23:59', () => {
    setTime(23, 59);

    const { getByText } = render(
      <PhaseGuard phase="EVENING">
        <Text>Evening End</Text>
      </PhaseGuard>
    );

    expect(getByText('Evening End')).toBeTruthy();
  });

  it('blocks access before EVENING start (17:59)', () => {
    setTime(17, 59);

    const { queryByText, getByText } = render(
      <PhaseGuard phase="EVENING">
        <Text>Evening Content</Text>
      </PhaseGuard>
    );

    expect(queryByText('Evening Content')).toBeNull();
    expect(getByText('アクセス不可')).toBeTruthy();
  });

  // ----- Restriction screen content tests -----

  it('displays phase name in restriction screen for MORNING', () => {
    setTime(15, 0);

    const { getByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Content</Text>
      </PhaseGuard>
    );

    expect(getByText('モーニングレイヤー')).toBeTruthy();
  });

  it('displays phase name in restriction screen for EVENING', () => {
    setTime(8, 0);

    const { getByText } = render(
      <PhaseGuard phase="EVENING">
        <Text>Content</Text>
      </PhaseGuard>
    );

    expect(getByText('イブニングレイヤー')).toBeTruthy();
  });

  it('displays available time range for MORNING', () => {
    setTime(15, 0);

    const { getByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Content</Text>
      </PhaseGuard>
    );

    expect(getByText('利用可能時間:')).toBeTruthy();
    expect(getByText('06:00 - 12:00')).toBeTruthy();
  });

  it('displays available time range for EVENING', () => {
    setTime(8, 0);

    const { getByText } = render(
      <PhaseGuard phase="EVENING">
        <Text>Content</Text>
      </PhaseGuard>
    );

    expect(getByText('利用可能時間:')).toBeTruthy();
    expect(getByText('18:00 - 24:00')).toBeTruthy();
  });

  it('displays current time in restriction screen', () => {
    setTime(15, 30);

    const { getByText } = render(
      <PhaseGuard phase="MORNING">
        <Text>Content</Text>
      </PhaseGuard>
    );

    expect(getByText('現在時刻:')).toBeTruthy();
    expect(getByText('15:30')).toBeTruthy();
  });

  // ----- GlitchText usage -----

  it('uses GlitchText for phase title in restriction screen', () => {
    setTime(14, 0);

    const { getByTestId } = render(
      <PhaseGuard phase="MORNING">
        <Text>Content</Text>
      </PhaseGuard>
    );

    expect(getByTestId('glitch-text')).toBeTruthy();
  });
});
