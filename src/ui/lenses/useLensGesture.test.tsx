/**
 * useLensGesture Hook Tests
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Animated } from 'react-native';
import { useLensGesture } from './useLensGesture';
import { HapticEngine } from '../../core/HapticEngine';

// Mock HapticEngine
jest.mock('../../core/HapticEngine', () => ({
  HapticEngine: {
    snapLens: jest.fn(),
  },
}));

// Mock Animated.spring to call callback immediately
const originalSpring = Animated.spring;
Animated.spring = jest.fn((value, config) => ({
  start: (callback?: any) => {
    value.setValue(config.toValue);
    if (callback) callback();
  },
})) as any;

// Test component that uses the hook
const TestComponent = ({ onLensChange }: { onLensChange: (lens: any) => void }) => {
  const { panResponder, scale } = useLensGesture(onLensChange);
  return (
    <View testID="gesture-view" {...panResponder.panHandlers}>
      <View testID="scale-value">{(scale as any)._value}</View>
    </View>
  );
};

describe('useLensGesture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with scale 0.5', () => {
    const { getByTestId } = render(<TestComponent onLensChange={jest.fn()} />);
    const scaleView = getByTestId('scale-value');
    expect(scaleView.children[0]).toBe('0.5');
  });

  it('should provide panResponder handlers', () => {
    const { getByTestId } = render(<TestComponent onLensChange={jest.fn()} />);
    const gestureView = getByTestId('gesture-view');
    expect(gestureView.props.onStartShouldSetResponder).toBeDefined();
  });

  it('should call onLensChange when pinch completes with zoom in', () => {
    const onLensChange = jest.fn();
    const TestWithScale = () => {
      const { panResponder, scale } = useLensGesture(onLensChange);

      // Simulate pinch out (scale > 1.5)
      React.useEffect(() => {
        scale.setValue(2.0);
        const releaseHandler = panResponder.panHandlers.onResponderRelease;
        if (releaseHandler) {
          releaseHandler({} as any);
        }
      }, []);

      return <View testID="test-view" />;
    };

    render(<TestWithScale />);

    expect(onLensChange).toHaveBeenCalledWith(2.0);
    expect(HapticEngine.snapLens).toHaveBeenCalled();
  });

  it('should call onLensChange with 0.5 for zoom out', () => {
    const onLensChange = jest.fn();
    const TestWithScale = () => {
      const { panResponder, scale } = useLensGesture(onLensChange);

      React.useEffect(() => {
        scale.setValue(0.5);
        const releaseHandler = panResponder.panHandlers.onResponderRelease;
        if (releaseHandler) {
          releaseHandler({} as any);
        }
      }, []);

      return <View testID="test-view" />;
    };

    render(<TestWithScale />);

    expect(onLensChange).toHaveBeenCalledWith(0.5);
    expect(HapticEngine.snapLens).toHaveBeenCalled();
  });

  it('should call onLensChange with 1.0 for neutral scale', () => {
    const onLensChange = jest.fn();
    const TestWithScale = () => {
      const { panResponder, scale } = useLensGesture(onLensChange);

      React.useEffect(() => {
        scale.setValue(1.2);
        const releaseHandler = panResponder.panHandlers.onResponderRelease;
        if (releaseHandler) {
          releaseHandler({} as any);
        }
      }, []);

      return <View testID="test-view" />;
    };

    render(<TestWithScale />);

    expect(onLensChange).toHaveBeenCalledWith(1.0);
  });

  it('should trigger haptic feedback on lens snap', () => {
    const TestWithRelease = () => {
      const { panResponder, scale } = useLensGesture(jest.fn());

      React.useEffect(() => {
        scale.setValue(2.0);
        const releaseHandler = panResponder.panHandlers.onResponderRelease;
        if (releaseHandler) {
          releaseHandler({} as any);
        }
      }, []);

      return <View testID="test-view" />;
    };

    render(<TestWithRelease />);

    expect(HapticEngine.snapLens).toHaveBeenCalled();
  });
});
