/**
 * ErrorBoundary Tests
 *
 * Tests error catching and SystemRejectionScreen display.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';

// Mock SystemRejectionScreen to simplify assertions
jest.mock('../screens/SystemRejectionScreen', () => ({
  SystemRejectionScreen: ({ error, errorInfo }: { error?: Error; errorInfo?: any }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="system-rejection-screen">
        <Text testID="rejection-title">IDENTITY COLLAPSE</Text>
        {error && <Text testID="rejection-error">{error.toString()}</Text>}
      </View>
    );
  },
}));

// Suppress console.error for expected errors in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

/**
 * Component that throws during render, used to trigger ErrorBoundary.
 */
const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <Text>Safe Content</Text>;
};

/**
 * Component that throws a custom error message.
 */
const CustomErrorComponent = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  // ----- Normal rendering -----

  it('renders children when no error occurs', () => {
    const { getByText, queryByTestId } = render(
      <ErrorBoundary>
        <Text>Normal Content</Text>
      </ErrorBoundary>
    );

    expect(getByText('Normal Content')).toBeTruthy();
    expect(queryByTestId('system-rejection-screen')).toBeNull();
  });

  it('renders multiple children without errors', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Child One</Text>
        <Text>Child Two</Text>
      </ErrorBoundary>
    );

    expect(getByText('Child One')).toBeTruthy();
    expect(getByText('Child Two')).toBeTruthy();
  });

  // ----- Error catching -----

  it('catches rendering errors from child components', () => {
    const { getByTestId, queryByText } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(getByTestId('system-rejection-screen')).toBeTruthy();
    expect(queryByText('Normal Content')).toBeNull();
  });

  it('displays SystemRejectionScreen when an error is caught', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(getByTestId('system-rejection-screen')).toBeTruthy();
    expect(getByTestId('rejection-title')).toBeTruthy();
  });

  it('passes error information to SystemRejectionScreen', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    const errorText = getByTestId('rejection-error');
    expect(errorText.props.children).toContain('Test render error');
  });

  it('passes custom error message to SystemRejectionScreen', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <CustomErrorComponent message="Custom failure message" />
      </ErrorBoundary>
    );

    const errorText = getByTestId('rejection-error');
    expect(errorText.props.children).toContain('Custom failure message');
  });

  // ----- State management -----

  it('sets hasError state to true when error occurs', () => {
    const { getByTestId, queryByText } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // SystemRejectionScreen is displayed (hasError = true)
    expect(getByTestId('system-rejection-screen')).toBeTruthy();
    // Children are not rendered
    expect(queryByText('Safe Content')).toBeNull();
  });

  it('logs error to console.error via componentDidCatch', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // console.error is mocked; check it was called with error boundary message
    expect(console.error).toHaveBeenCalled();
  });

  // ----- Edge cases -----

  it('does not display error screen when child conditionally does not throw', () => {
    const { getByText, queryByTestId } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('Safe Content')).toBeTruthy();
    expect(queryByTestId('system-rejection-screen')).toBeNull();
  });

  it('catches errors from deeply nested children', () => {
    const DeepNested = () => (
      <Text>
        <ThrowingComponent />
      </Text>
    );

    const { getByTestId } = render(
      <ErrorBoundary>
        <DeepNested />
      </ErrorBoundary>
    );

    expect(getByTestId('system-rejection-screen')).toBeTruthy();
  });
});
