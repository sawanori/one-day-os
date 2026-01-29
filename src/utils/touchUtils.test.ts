/**
 * Touch Utils Tests
 */
import { calculateTwoPointDistance, calculateScale, getDistanceFromEvent } from './touchUtils';

describe('Touch Utils', () => {
  describe('calculateTwoPointDistance', () => {
    it('should calculate distance between two touches', () => {
      const touch1 = { pageX: 0, pageY: 0 };
      const touch2 = { pageX: 3, pageY: 4 };

      const distance = calculateTwoPointDistance(touch1, touch2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should handle same position', () => {
      const touch = { pageX: 100, pageY: 100 };
      expect(calculateTwoPointDistance(touch, touch)).toBe(0);
    });

    it('should calculate horizontal distance', () => {
      const touch1 = { pageX: 0, pageY: 0 };
      const touch2 = { pageX: 10, pageY: 0 };
      expect(calculateTwoPointDistance(touch1, touch2)).toBe(10);
    });

    it('should calculate vertical distance', () => {
      const touch1 = { pageX: 0, pageY: 0 };
      const touch2 = { pageX: 0, pageY: 10 };
      expect(calculateTwoPointDistance(touch1, touch2)).toBe(10);
    });

    it('should handle negative coordinates', () => {
      const touch1 = { pageX: -3, pageY: -4 };
      const touch2 = { pageX: 0, pageY: 0 };
      expect(calculateTwoPointDistance(touch1, touch2)).toBe(5);
    });
  });

  describe('calculateScale', () => {
    it('should calculate scale factor', () => {
      const initialDistance = 100;
      const currentDistance = 200;

      const scale = calculateScale(initialDistance, currentDistance);
      expect(scale).toBe(2.0);
    });

    it('should handle zero initial distance', () => {
      expect(calculateScale(0, 100)).toBe(1);
    });

    it('should calculate zoom out (scale < 1)', () => {
      const scale = calculateScale(200, 100);
      expect(scale).toBe(0.5);
    });

    it('should return 1 for equal distances', () => {
      const scale = calculateScale(100, 100);
      expect(scale).toBe(1);
    });

    it('should handle very small distances', () => {
      const scale = calculateScale(1, 2);
      expect(scale).toBe(2);
    });
  });

  describe('getDistanceFromEvent', () => {
    it('should return null when less than 2 touches', () => {
      const event = {
        nativeEvent: {
          touches: [{ pageX: 0, pageY: 0 }],
        },
      } as any;

      expect(getDistanceFromEvent(event)).toBeNull();
    });

    it('should return null when more than 2 touches', () => {
      const event = {
        nativeEvent: {
          touches: [
            { pageX: 0, pageY: 0 },
            { pageX: 1, pageY: 1 },
            { pageX: 2, pageY: 2 },
          ],
        },
      } as any;

      expect(getDistanceFromEvent(event)).toBeNull();
    });

    it('should calculate distance with exactly 2 touches', () => {
      const event = {
        nativeEvent: {
          touches: [
            { pageX: 0, pageY: 0 },
            { pageX: 3, pageY: 4 },
          ],
        },
      } as any;

      expect(getDistanceFromEvent(event)).toBe(5);
    });

    it('should handle empty touches array', () => {
      const event = {
        nativeEvent: {
          touches: [],
        },
      } as any;

      expect(getDistanceFromEvent(event)).toBeNull();
    });
  });
});
