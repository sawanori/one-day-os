
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { MissionLens } from '../src/ui/lenses/MissionLens';
import { IdentityLens } from '../src/ui/lenses/IdentityLens';
import { QuestLens } from '../src/ui/lenses/QuestLens';
import { UnifiedLensView } from '../src/ui/lenses/UnifiedLensView';
import { ThemedText } from '../src/ui/components/ThemedText';
import { IdentityEngine } from '../src/core/identity/IdentityEngine';
import { HapticEngine } from '../src/core/HapticEngine';
import { StressContainer } from '../src/ui/layout/StressContainer';
import { useLensGesture } from '../src/ui/lenses/useLensGesture';
import { isFeatureEnabled } from '../src/config/features';
import { getDB } from '../src/database/client';
import { LENS_ANIMATION_CONFIG } from '../src/constants/lenses';
import { theme } from '../src/ui/theme/theme';
import { useRouter } from 'expo-router';

interface Quest {
  id: number;
  quest_text: string;
  is_completed: number;
  created_at: string;
  completed_at: string | null;
}

export default function Home() {
  const router = useRouter();
  const [lens, setLens] = useState<0.5 | 1.0 | 2.0>(0.5);
  const [health, setHealth] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  // Data from database
  const [mission, setMission] = useState('');
  const [antiVision, setAntiVision] = useState('');
  const [identity, setIdentity] = useState('');
  const [quests, setQuests] = useState<Quest[]>([]);

  // Lens Zoom Gesture (Phase 4)
  const { panResponder, scale } = useLensGesture((newLens) => {
    updateLens(newLens);
  });

  // Check health periodically (centralized)
  useEffect(() => {
    const checkHealth = async () => {
      const engine = await IdentityEngine.getInstance();
      const status = await engine.checkHealth();
      setHealth(status.health);
    };
    checkHealth();

    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
  }, []);

  // Identity Lens Heartbeat Haptics (1.0x only)
  useEffect(() => {
    if (lens !== 1.0) return;

    // Start heartbeat loop
    const heartbeatInterval = setInterval(() => {
      HapticEngine.pulseHeartbeat();
    }, 1000); // Every 1 second

    return () => clearInterval(heartbeatInterval);
  }, [lens]);

  // Load data from database and check onboarding status
  useEffect(() => {
    const loadData = async () => {
      try {
        const db = getDB();

        // Check if identity table exists and has data
        const identityData = await db.getFirstAsync<any>('SELECT * FROM identity WHERE id = 1');

        // If no identity data, redirect to onboarding
        if (!identityData || !identityData.identity_statement) {
          router.replace('/onboarding');
          return;
        }

        const questsData = await db.getAllAsync<Quest>('SELECT * FROM quests WHERE DATE(created_at) = DATE("now")');

        setMission(identityData.one_year_mission || '');
        setAntiVision(identityData.anti_vision || '');
        setIdentity(identityData.identity_statement || '');
        setQuests(questsData || []);
        setIsLoading(false);
      } catch (error) {
        // Database not initialized yet or no data exists - go to onboarding
        router.replace('/onboarding');
      }
    };
    loadData();
  }, [router]);

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

  // Toggle quest completion
  const toggleQuest = async (id: number) => {
    try {
      const db = getDB();
      const quest = quests.find(q => q.id === id);
      if (!quest) return;

      const newCompleted = quest.is_completed === 0 ? 1 : 0;
      await db.runAsync(
        'UPDATE quests SET is_completed = ?, completed_at = ? WHERE id = ?',
        [newCompleted, newCompleted === 1 ? new Date().toISOString() : null, id]
      );

      // Update local state
      setQuests(prev => prev.map(q => q.id === id ? { ...q, is_completed: newCompleted } : q));

      // Restore health on completion
      if (newCompleted === 1) {
        const engine = await IdentityEngine.getInstance();
        await engine.restoreHealth(5);
      }
    } catch (error) {
      console.error('Failed to toggle quest:', error);
    }
  };

  // Debug: Reset Identity Health to 100%
  const resetIH = async () => {
    try {
      const engine = await IdentityEngine.getInstance();
      await engine.setCurrentIH(100);
      const status = await engine.checkHealth();
      setHealth(status.health);
      alert('Identity Health reset to 100%');
    } catch (error) {
      console.error('Failed to reset IH:', error);
      alert('Failed to reset IH');
    }
  };

  // Debug: Send test notification
  const sendTestNotification = async () => {
    try {
      // Request permission first
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('❌ 通知の許可がありません');
        return;
      }

      // Send immediate test notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'あなたは誰ですか？',
          body: '5分以内に回答。無応答でIH -20%',
          data: { questionIndex: 0 },
        },
        trigger: null, // Immediate notification
      });
      alert('✅ テスト通知を送信しました');
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('❌ 通知の送信に失敗しました');
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

  // Feature flag: Use UnifiedLensView or legacy lens switching
  const ContentView = isFeatureEnabled('UNIFIED_LENS_VIEW') ? (
    // New unified lens view with individual layer zoom transitions
    <View style={styles.content} {...panResponder.panHandlers}>
      <UnifiedLensView
        scale={scale}
        health={health}
        mission={mission}
        antiVision={antiVision}
        identity={identity}
        quests={quests}
        onQuestToggle={toggleQuest}
      />
    </View>
  ) : isFeatureEnabled('LENS_ZOOM_GESTURE') ? (
    // Legacy lens view with gesture support
    <Animated.View
      style={[styles.content, { transform: [{ scale }] }]}
      {...panResponder.panHandlers}
    >
      {renderLens()}
    </Animated.View>
  ) : (
    // Legacy lens view without gesture
    <View style={styles.content}>
      {renderLens()}
    </View>
  );

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

      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.appName}>ONE DAY OS</ThemedText>
        <View style={styles.headerRight}>
          <View style={styles.healthContainer}>
            <ThemedText style={[styles.healthText, { color: health < 30 ? theme.colors.error : theme.colors.success }]}>
              IH: {health}%
            </ThemedText>
          </View>
          {/* Debug: Reset IH */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={resetIH}
            >
              <ThemedText style={styles.debugButtonText}>🔄</ThemedText>
            </TouchableOpacity>
          )}
          {/* Debug: View Death Screen */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => router.push('/death')}
            >
              <ThemedText style={styles.debugButtonText}>💀</ThemedText>
            </TouchableOpacity>
          )}
          {/* Debug: Send Test Notification */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={sendTestNotification}
            >
              <ThemedText style={styles.debugButtonText}>🔔</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Lens Content with Gesture Support and Stress Effects */}
      <StressContainer>
        {ContentView}
      </StressContainer>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Courier New',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  appName: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: theme.colors.foreground,
    fontFamily: theme.typography.fontFamilySerif,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  debugButton: {
    padding: 4,
  },
  debugButtonText: {
    fontSize: 18,
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
  },
  lensButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: theme.colors.background,
  },
  lensButtonActive: {
    borderColor: theme.colors.foreground,
    backgroundColor: '#111',
  },
  lensButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
