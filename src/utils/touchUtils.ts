/**
 * Touch Utils
 * Utilities for calculating touch distances and scales for pinch gestures
 */
import { GestureResponderEvent } from 'react-native';

interface Touch {
  pageX: number;
  pageY: number;
}

/**
 * Calculate distance between two touch points using Pythagorean theorem
 */
export const calculateTwoPointDistance = (
  touch1: Touch,
  touch2: Touch
): number => {
  const dx = touch2.pageX - touch1.pageX;
  const dy = touch2.pageY - touch1.pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate scale factor from initial and current distance
 * Returns 1 if initial distance is 0 to prevent division by zero
 */
export const calculateScale = (
  initialDistance: number,
  currentDistance: number
): number => {
  if (initialDistance === 0) return 1;
  return currentDistance / initialDistance;
};

/**
 * Get distance between two touches from GestureResponderEvent
 * Returns null if not exactly 2 touches
 */
export const getDistanceFromEvent = (
  event: GestureResponderEvent
): number | null => {
  const touches = event.nativeEvent.touches;

  if (touches.length !== 2) {
    return null;
  }

  return calculateTwoPointDistance(
    touches[0],
    touches[1]
  );
};
