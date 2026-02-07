/**
 * useLensGesture Hook
 * Provides PanResponder for pinch-to-zoom lens switching
 */
import { useRef, useEffect, useMemo } from 'react';
import { PanResponder, Animated, GestureResponderEvent } from 'react-native';
import { getDistanceFromEvent, calculateScale } from '../../utils/touchUtils';
import { HapticEngine } from '../../core/HapticEngine';
import { SNAP_THRESHOLDS, LENS_ANIMATION_CONFIG, LENS_VALUES } from '../../constants/lenses';

export type LensZoom = 0.5 | 1.0 | 2.0;

export const useLensGesture = (
  onLensChange: (lens: LensZoom) => void
) => {
  const scale = useRef(new Animated.Value(0.5)).current;
  const initialDistance = useRef<number>(0);

  // H7: Use ref to always have the latest onLensChange (avoids stale closure in PanResponder)
  const onLensChangeRef = useRef(onLensChange);
  onLensChangeRef.current = onLensChange;

  // H8: Track current scale value via listener instead of accessing internal _value
  const scaleValueRef = useRef(0.5);

  useEffect(() => {
    const id = scale.addListener(({ value }) => {
      scaleValueRef.current = value;
    });
    return () => {
      scale.removeListener(id);
    };
  }, [scale]);

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
        const finalScale = scaleValueRef.current;
        let targetLens: LensZoom;

        if (finalScale < SNAP_THRESHOLDS.ZOOM_OUT) {
          targetLens = LENS_VALUES.MISSION;
        } else if (finalScale > SNAP_THRESHOLDS.ZOOM_IN) {
          targetLens = LENS_VALUES.QUEST;
        } else {
          targetLens = LENS_VALUES.IDENTITY;
        }

        // Haptic feedback
        HapticEngine.snapLens();

        // スケールをtargetLensにアニメーション
        Animated.spring(scale, {
          toValue: targetLens,
          friction: LENS_ANIMATION_CONFIG.friction,
          tension: LENS_ANIMATION_CONFIG.tension,
          useNativeDriver: true, // Re-enabled for transform + opacity
        }).start(() => {
          // アニメーション完了後にLens変更を通知 (use ref to avoid stale closure)
          onLensChangeRef.current(targetLens);
        });

        // 初期距離リセット
        initialDistance.current = 0;
      },
    })
  ).current;

  return { panResponder, scale };
};
