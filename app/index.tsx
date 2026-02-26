
import React, { useState } from 'react';
import { View, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../src/ui/components/ThemedText';
import { HapticEngine } from '../src/core/HapticEngine';
import { useLensGesture } from '../src/ui/lenses/useLensGesture';
import { LENS_ANIMATION_CONFIG } from '../src/constants/lenses';
import { styles } from '../src/ui/screens/home/home.styles';
import { useHealthMonitor } from '../src/ui/screens/home/useHealthMonitor';
import { useHomeData } from '../src/ui/screens/home/useHomeData';
import { HomeHeader } from '../src/ui/screens/home/HomeHeader';
import { LensContent } from '../src/ui/screens/home/LensContent';

export default function Home() {
  const [lens, setLens] = useState<0.5 | 1.0 | 2.0>(0.5);
  const { health } = useHealthMonitor(lens);
  const { isLoading, mission, antiVision, identity, quests, toggleQuest } = useHomeData();

  // Lens Zoom Gesture (Phase 4)
  const { panResponder, scale } = useLensGesture((newLens) => {
    updateLens(newLens);
  });

  // Update lens state wrapper to trigger haptics
  const updateLens = (newLens: 0.5 | 1.0 | 2.0) => {
    if (newLens !== lens) {
      setLens(newLens);
      HapticEngine.snapLens();
    }
  };

  // Animate to specific lens value (for button clicks)
  const animateToLens = (targetLens: 0.5 | 1.0 | 2.0) => {
    HapticEngine.snapLens();
    Animated.spring(scale, {
      toValue: targetLens,
      friction: LENS_ANIMATION_CONFIG.friction,
      tension: LENS_ANIMATION_CONFIG.tension,
      useNativeDriver: true,
    }).start();
    setLens(targetLens);
  };

  // Show loading while checking onboarding status
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <HomeHeader health={health} />

      {/* Main Lens Content with Gesture Support */}
      <LensContent
        lens={lens}
        scale={scale}
        panResponder={panResponder}
        health={health}
        mission={mission}
        antiVision={antiVision}
        identity={identity}
        quests={quests}
        onQuestToggle={toggleQuest}
      />

      {/* Lens Selector Buttons */}
      <View style={styles.lensSelector}>
        <TouchableOpacity
          style={[styles.lensButton, lens === 0.5 && styles.lensButtonActive]}
          onPress={() => animateToLens(0.5)}
        >
          <ThemedText style={styles.lensButtonText}>0.5x</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.lensButton, lens === 1.0 && styles.lensButtonActive]}
          onPress={() => animateToLens(1.0)}
        >
          <ThemedText style={styles.lensButtonText}>1.0x</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.lensButton, lens === 2.0 && styles.lensButtonActive]}
          onPress={() => animateToLens(2.0)}
        >
          <ThemedText style={styles.lensButtonText}>2.0x</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
