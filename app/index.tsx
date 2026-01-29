
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Animated } from 'react-native';
import { MissionLens } from '../src/ui/lenses/MissionLens';
import { IdentityLens } from '../src/ui/lenses/IdentityLens';
import { QuestLens } from '../src/ui/lenses/QuestLens';
import { Colors } from '../src/ui/theme/colors';
import { ThemedText } from '../src/ui/components/ThemedText';
import { IdentityEngine } from '../src/core/IdentityEngine';
import { HapticEngine } from '../src/core/HapticEngine';
import { StressContainer } from '../src/ui/layout/StressContainer';
import { useLensGesture } from '../src/ui/lenses/useLensGesture';
import { isFeatureEnabled } from '../src/config/features';

export default function Home() {
  const [lens, setLens] = useState<0.5 | 1.0 | 2.0>(1.0);
  const [health, setHealth] = useState(100);

  // Lens Zoom Gesture (Phase 4)
  const { panResponder, scale } = useLensGesture((newLens) => {
    updateLens(newLens);
  });

  // Check health periodically
  useEffect(() => {
    const checkHealth = async () => {
      const status = await IdentityEngine.checkHealth();
      setHealth(status.health);
    };
    checkHealth();

    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update lens state wrapper to trigger haptics
  const updateLens = (newLens: 0.5 | 1.0 | 2.0) => {
    if (newLens !== lens) {
      setLens(newLens);
      HapticEngine.snapLens();
    }
  };

  const renderLens = () => {
    switch (lens) {
      case 0.5: return <MissionLens />;
      case 1.0: return <IdentityLens />;
      case 2.0: return <QuestLens />;
      default: return <IdentityLens />;
    }
  };

  const ContentView = isFeatureEnabled('LENS_ZOOM_GESTURE') ? (
    <Animated.View
      style={[styles.content, { transform: [{ scale }] }]}
      {...panResponder.panHandlers}
    >
      {renderLens()}
    </Animated.View>
  ) : (
    <View style={styles.content}>
      {renderLens()}
    </View>
  );

  return (
    <StressContainer>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.appName}>ONE DAY OS</ThemedText>
          <View style={styles.healthContainer}>
            <ThemedText style={[styles.healthText, { color: health < 30 ? Colors.dark.error : Colors.dark.success }]}>
              IH: {health}%
            </ThemedText>
          </View>
        </View>

        {/* Main Lens Content with Gesture Support */}
        {ContentView}

        {/* Lens Selector Buttons */}
        <View style={styles.lensSelector}>
          <TouchableOpacity
            style={[styles.lensButton, lens === 0.5 && styles.lensButtonActive]}
            onPress={() => updateLens(0.5)}
          >
            <ThemedText style={styles.lensButtonText}>0.5x</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.lensButton, lens === 1.0 && styles.lensButtonActive]}
            onPress={() => updateLens(1.0)}
          >
            <ThemedText style={styles.lensButtonText}>1.0x</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.lensButton, lens === 2.0 && styles.lensButtonActive]}
            onPress={() => updateLens(2.0)}
          >
            <ThemedText style={styles.lensButtonText}>2.0x</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </StressContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    zIndex: 1000, // Above NoiseOverlay and AntiVisionBleed
    backgroundColor: Colors.dark.background,
  },
  appName: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: Colors.dark.text,
  },
  healthContainer: {
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  healthText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  lensSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    zIndex: 1000, // Above NoiseOverlay (999) and AntiVisionBleed (500)
    backgroundColor: Colors.dark.background,
  },
  lensButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: Colors.dark.background,
  },
  lensButtonActive: {
    borderColor: Colors.dark.text,
    backgroundColor: '#111',
  },
  lensButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
