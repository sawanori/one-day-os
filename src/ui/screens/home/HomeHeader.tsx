import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { theme } from '../../theme/theme';
import { resetIH, sendTestNotification } from './DebugActions';
import { styles } from './home.styles';

interface HomeHeaderProps {
  health: number;
  onHealthUpdate: (health: number) => void;
}

/**
 * HomeHeader
 * Displays app name, IH percentage, and debug buttons (__DEV__ only).
 */
export const HomeHeader: React.FC<HomeHeaderProps> = ({ health, onHealthUpdate }) => {
  const router = useRouter();

  return (
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
            onPress={() => resetIH(onHealthUpdate)}
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
  );
};
