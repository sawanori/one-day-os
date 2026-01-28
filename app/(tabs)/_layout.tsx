/**
 * One Day OS - Tabs Layout
 * 3-layer tab navigation: Morning, Core, Evening
 */

import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { theme } from '../../src/ui/theme/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 2,
          borderTopColor: theme.colors.foreground,
          height: 60,
          paddingBottom: 8,
          borderRadius: 0, // No rounded corners
        },
        tabBarActiveTintColor: theme.colors.foreground,
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.fontSize.caption,
          fontWeight: theme.typography.fontWeight.bold,
        },
        tabBarIconStyle: {
          display: 'none', // Remove icons, use text only
        },
      }}
    >
      <Tabs.Screen
        name="morning"
        options={{
          title: 'モーニング',
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontFamily: theme.typography.fontFamily,
                fontSize: theme.typography.fontSize.caption,
                fontWeight: theme.typography.fontWeight.bold,
                color: focused ? theme.colors.foreground : '#666666',
              }}
            >
              モーニング
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'コア',
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontFamily: theme.typography.fontFamily,
                fontSize: theme.typography.fontSize.caption,
                fontWeight: theme.typography.fontWeight.bold,
                color: focused ? theme.colors.foreground : '#666666',
              }}
            >
              コア
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="evening"
        options={{
          title: 'イブニング',
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontFamily: theme.typography.fontFamily,
                fontSize: theme.typography.fontSize.caption,
                fontWeight: theme.typography.fontWeight.bold,
                color: focused ? theme.colors.foreground : '#666666',
              }}
            >
              イブニング
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
