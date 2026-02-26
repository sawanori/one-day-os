import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { theme } from '../../theme/theme';
import { styles } from './home.styles';

interface HomeHeaderProps {
  health: number;
}

/**
 * HomeHeader
 * Displays app name and IH percentage.
 */
export const HomeHeader: React.FC<HomeHeaderProps> = ({ health }) => {
  return (
    <View style={styles.header}>
      <ThemedText style={styles.appName}>ONE DAY OS</ThemedText>
      <View style={styles.headerRight}>
        <View style={styles.healthContainer}>
          <ThemedText style={[styles.healthText, { color: health < 30 ? theme.colors.error : theme.colors.success }]}>
            IH: {health}%
          </ThemedText>
        </View>
      </View>
    </View>
  );
};
