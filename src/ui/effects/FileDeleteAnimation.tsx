/**
 * File Delete Animation Effect
 * Displays file names being deleted one by one with fade animation
 */
import React, { useState, useEffect } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native';
import { Colors } from '../theme/colors';

interface FileDeleteAnimationProps {
  files: string[];
}

export const FileDeleteAnimation = ({ files }: FileDeleteAnimationProps) => {
  const [visibleFiles, setVisibleFiles] = useState<string[]>([]);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    files.forEach((file, index) => {
      const timeout = setTimeout(() => {
        setVisibleFiles(prev => [...prev, file]);
      }, index * 500); // 500msごとに1つずつ表示
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [files]);

  return (
    <View style={styles.container}>
      {visibleFiles.map((file, index) => (
        <FileDeleteLine key={index} filename={file} />
      ))}
    </View>
  );
};

const FileDeleteLine = ({ filename }: { filename: string }) => {
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    let fadeOutTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // 1秒後にFade out
      fadeOutTimeout = setTimeout(() => {
        if (isMounted) {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }
      }, 1000);
    });

    return () => {
      isMounted = false;
      if (fadeOutTimeout) clearTimeout(fadeOutTimeout);
    };
  }, []);

  return (
    <Animated.View style={{ opacity }}>
      <Text style={styles.filename}>
        DELETE: {filename}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  filename: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    marginVertical: 2,
    letterSpacing: 1,
  },
});
