/**
 * One Day OS - Root Layout
 * Main app layout with Expo Router
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initializeDatabase } from '../src/database/db';
import { theme } from '../src/ui/theme/theme';

export default function RootLayout() {
  useEffect(() => {
    // Initialize database on app start
    initializeDatabase().catch((error) => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: 'none', // Brutalist: no animations
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
