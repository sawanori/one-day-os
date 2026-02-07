import React from 'react';
import { View, Animated, PanResponderInstance } from 'react-native';
import { MissionLens } from '../../lenses/MissionLens';
import { IdentityLens } from '../../lenses/IdentityLens';
import { QuestLens } from '../../lenses/QuestLens';
import { UnifiedLensView } from '../../lenses/UnifiedLensView';
import { isFeatureEnabled } from '../../../config/features';
import { styles } from './home.styles';
import { Quest } from './useHomeData';

interface LensContentProps {
  lens: 0.5 | 1.0 | 2.0;
  scale: Animated.Value;
  panResponder: PanResponderInstance;
  health: number;
  mission: string;
  antiVision: string;
  identity: string;
  quests: Quest[];
  onQuestToggle: (id: number) => void;
}

/**
 * LensContent
 * Renders the appropriate lens view based on feature flags.
 * Supports UnifiedLensView, legacy gesture view, and legacy static view.
 */
export const LensContent: React.FC<LensContentProps> = ({
  lens,
  scale,
  panResponder,
  health,
  mission,
  antiVision,
  identity,
  quests,
  onQuestToggle,
}) => {
  const renderLens = () => {
    switch (lens) {
      case 0.5: return <MissionLens />;
      case 1.0: return <IdentityLens />;
      case 2.0: return <QuestLens />;
      default: return <IdentityLens />;
    }
  };

  if (isFeatureEnabled('UNIFIED_LENS_VIEW')) {
    return (
      <View style={styles.content} {...panResponder.panHandlers}>
        <UnifiedLensView
          scale={scale}
          health={health}
          mission={mission}
          antiVision={antiVision}
          identity={identity}
          quests={quests}
          onQuestToggle={onQuestToggle}
        />
      </View>
    );
  }

  if (isFeatureEnabled('LENS_ZOOM_GESTURE')) {
    return (
      <Animated.View
        style={[styles.content, { transform: [{ scale }] }]}
        {...panResponder.panHandlers}
      >
        {renderLens()}
      </Animated.View>
    );
  }

  return (
    <View style={styles.content}>
      {renderLens()}
    </View>
  );
};
