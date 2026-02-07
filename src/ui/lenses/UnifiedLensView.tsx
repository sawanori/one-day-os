import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MissionContent, IdentityContent, QuestContent } from './LensContents';

interface Quest {
  id: number;
  quest_text: string;
  is_completed: number;
  created_at: string;
  completed_at: string | null;
}

interface UnifiedLensViewProps {
  scale: Animated.Value;
  health: number;
  mission: string;
  antiVision: string;
  identity: string;
  quests: Quest[];
  onQuestToggle: (id: number) => void;
}

export const UnifiedLensView = ({
  scale,
  health,
  mission,
  antiVision,
  identity,
  quests,
  onQuestToggle,
}: UnifiedLensViewProps) => {
  // Calculate opacity for each layer based on scale value
  const missionOpacity = scale.interpolate({
    inputRange: [0.5, 0.75, 1.0],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const identityOpacity = scale.interpolate({
    inputRange: [0.5, 0.75, 1.0, 1.5, 2.0],
    outputRange: [0, 0.5, 1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const questOpacity = scale.interpolate({
    inputRange: [1.0, 1.5, 2.0],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  // Each layer has individual zoom behavior:
  // - When visible (high opacity): display at comfortable size
  // - When exiting (low opacity): zoom IN dramatically (get bigger and disappear)

  // Mission Layer: visible at 0.5, exits by zooming in when going to 1.0
  const missionScale = scale.interpolate({
    inputRange: [0.5, 0.75, 1.0],
    outputRange: [1.0, 1.5, 2.5], // Full size → Zoom in dramatically → Huge (disappeared)
    extrapolate: 'clamp',
  });

  // Identity Layer: visible at 1.0
  // When going to 0.5x: zoom OUT (shrink to disappear)
  // When going to 2.0x: zoom IN (expand to disappear)
  const identityScale = scale.interpolate({
    inputRange: [0.5, 0.75, 1.0, 1.5, 2.0],
    outputRange: [0.3, 0.6, 1.0, 1.8, 2.5], // Shrunk → Normal → Huge
    extrapolate: 'clamp',
  });

  // Quest Layer: visible at 2.0, enters from small when coming from 1.0
  const questScale = scale.interpolate({
    inputRange: [1.0, 1.5, 2.0],
    outputRange: [0.3, 0.8, 1.3], // Small (entering) → Growing → Normal size
    extrapolate: 'clamp',
  });

  const glitchSeverity = (100 - health) / 100;

  // Track current scale value for pointerEvents control
  const [currentScale, setCurrentScale] = useState(1.0);

  useEffect(() => {
    const listener = scale.addListener(({ value }) => {
      setCurrentScale(value);
    });
    return () => scale.removeListener(listener);
  }, [scale]);

  // Determine which layer should receive pointer events
  const missionPointerEvents = currentScale < 0.75 ? 'auto' : 'none';
  const identityPointerEvents = currentScale >= 0.75 && currentScale < 1.5 ? 'auto' : 'none';
  const questPointerEvents = currentScale >= 1.5 ? 'auto' : 'none';

  return (
    <View style={styles.container}>
      {/* Mission Layer (0.5x) - Zooms IN when exiting */}
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: missionOpacity,
            transform: [{ scale: missionScale }],
          },
        ]}
        pointerEvents={missionPointerEvents}
      >
        <MissionContent
          glitchSeverity={glitchSeverity}
          mission={mission}
          antiVision={antiVision}
          health={health}
        />
      </Animated.View>

      {/* Identity Layer (1.0x) - Zooms IN/OUT depending on direction */}
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: identityOpacity,
            transform: [{ scale: identityScale }],
          },
        ]}
        pointerEvents={identityPointerEvents}
      >
        <IdentityContent glitchSeverity={glitchSeverity} identity={identity} health={health} />
      </Animated.View>

      {/* Quest Layer (2.0x) - Enters from small */}
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: questOpacity,
            transform: [{ scale: questScale }],
          },
        ]}
        pointerEvents={questPointerEvents}
      >
        <QuestContent
          glitchSeverity={glitchSeverity}
          quests={quests}
          onToggle={onQuestToggle}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
