/**
 * useLensGesture Hook
 * Provides PanResponder for pinch-to-zoom lens switching
 */
import { useRef } from 'react';
import { PanResponder, Animated, GestureResponderEvent } from 'react-native';
import { getDistanceFromEvent, calculateScale } from '../../utils/touchUtils';
import { HapticEngine } from '../../core/HapticEngine';

export type LensZoom = 0.5 | 1.0 | 2.0;

export const useLensGesture = (
  onLensChange: (lens: LensZoom) => void
) => {
  const scale = useRef(new Animated.Value(1)).current;
  const initialDistance = useRef<number>(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 2点タッチでピンチジェスチャー開始
        return gestureState.numberActiveTouches === 2;
      },

      onPanResponderGrant: (event: GestureResponderEvent) => {
        // ピンチ開始: 初期距離を記録
        const distance = getDistanceFromEvent(event);
        if (distance !== null) {
          initialDistance.current = distance;
        }
      },

      onPanResponderMove: (event: GestureResponderEvent) => {
        // ピンチ中: スケール更新
        const currentDistance = getDistanceFromEvent(event);

        if (currentDistance !== null && initialDistance.current > 0) {
          const scaleValue = calculateScale(initialDistance.current, currentDistance);
          scale.setValue(scaleValue);
        }
      },

      onPanResponderRelease: () => {
        // ピンチ終了: スナップロジック
        const finalScale = (scale as any)._value;
        let targetLens: LensZoom;

        if (finalScale < 0.75) {
          targetLens = 0.5;
        } else if (finalScale > 1.5) {
          targetLens = 2.0;
        } else {
          targetLens = 1.0;
        }

        // Haptic feedback
        HapticEngine.snapLens();

        // Lens変更
        onLensChange(targetLens);

        // スケールをリセット
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();

        // 初期距離リセット
        initialDistance.current = 0;
      },
    })
  ).current;

  return { panResponder, scale };
};
