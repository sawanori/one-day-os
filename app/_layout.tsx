
/**
 * One Day OS - Root Layout
 * Main app layout with Expo Router
 */

import React, { useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { getDB, databaseInit } from '../src/database/client';
import { Colors } from '../src/ui/theme/colors';
import { StressContainer } from '../src/ui/layout/StressContainer';
import { NotificationController } from '../src/core/NotificationController';

// Web Not Supported Component
const WebNotSupported = () => {
  const webBlockStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000000',
      padding: 20,
    },
    title: {
      color: '#FF0000',
      fontSize: 24,
      fontFamily: 'Courier New',
      marginBottom: 20,
      textAlign: 'center',
    },
    message: {
      color: '#FFFFFF',
      fontSize: 16,
      fontFamily: 'Courier New',
      textAlign: 'center',
      marginVertical: 10,
    },
    reason: {
      color: '#808080',
      fontSize: 12,
      fontFamily: 'Courier New',
      textAlign: 'center',
      marginTop: 30,
      maxWidth: 600,
    },
  });

  return (
    <View style={webBlockStyles.container}>
      <Text style={webBlockStyles.title}>⚠️ WEB NOT SUPPORTED</Text>
      <Text style={webBlockStyles.message}>
        One Day OS is a mobile-only application.
      </Text>
      <Text style={webBlockStyles.message}>
        Please use Android or iOS device.
      </Text>
      <Text style={webBlockStyles.reason}>
        Core features (local SQLite, no backup, precise notifications)
        require native mobile capabilities.
      </Text>
    </View>
  );
};

// Root Layout Component
function RootLayout() {
  useEffect(() => {
    // Initialize database on app start
    databaseInit().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  return (
    <StressContainer>
      <NotificationController />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: Colors.dark.background,
          },
          animation: 'none', // Brutalist: no animations
        }}
      />
    </StressContainer>
  );
}

// Export appropriate component based on platform
export default Platform.OS === 'web' ? WebNotSupported : RootLayout;
