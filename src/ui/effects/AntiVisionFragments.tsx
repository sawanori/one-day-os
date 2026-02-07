/**
 * Anti-Vision Fragments Effect
 * Randomly floats fragments of the anti-vision text as IH decreases
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme/theme';

interface AntiVisionFragmentsProps {
  antiVision: string;
  health: number;
}

interface Fragment {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: Animated.Value;
  rotation: number;
}

export const AntiVisionFragments = ({ antiVision, health }: AntiVisionFragmentsProps) => {
  const [fragments, setFragments] = useState<Fragment[]>([]);

  useEffect(() => {
    // Only show fragments when IH < 70%
    if (health >= 70 || !antiVision) {
      setFragments([]);
      return;
    }

    // Calculate number of fragments based on health (lower = more fragments)
    const fragmentCount = Math.floor((70 - health) / 10) + 1; // 1-8 fragments

    // Split anti-vision into words
    const words = antiVision.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return;

    // Create random fragments
    const newFragments: Fragment[] = [];
    for (let i = 0; i < fragmentCount; i++) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      newFragments.push({
        id: i,
        text: randomWord,
        x: Math.random() * 80 + 10, // 10-90% of screen width
        y: Math.random() * 80 + 10, // 10-90% of screen height
        opacity: new Animated.Value(0),
        rotation: (Math.random() - 0.5) * 30, // -15 to +15 degrees
      });
    }

    setFragments(newFragments);

    // Animate fragments to fade in/out randomly
    const timeoutIds: NodeJS.Timeout[] = [];
    newFragments.forEach((fragment, index) => {
      const delay = Math.random() * 2000;
      const id = setTimeout(() => {
        // Fade in
        Animated.sequence([
          Animated.timing(fragment.opacity, {
            toValue: 0.3 + (70 - health) / 100, // Stronger as health decreases
            duration: 1000,
            useNativeDriver: true,
          }),
          // Hold
          Animated.delay(2000),
          // Fade out
          Animated.timing(fragment.opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
      timeoutIds.push(id);
    });

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [health, antiVision]);

  if (health >= 70) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {fragments.map((fragment) => (
        <Animated.Text
          key={fragment.id}
          style={[
            styles.fragment,
            {
              opacity: fragment.opacity,
              left: `${fragment.x}%`,
              top: `${fragment.y}%`,
              transform: [{ rotate: `${fragment.rotation}deg` }],
            },
          ]}
        >
          {fragment.text}
        </Animated.Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 600, // Between AntiVisionBleed(500) and NoiseOverlay(999)
  },
  fragment: {
    position: 'absolute',
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.error,
    fontFamily: 'Courier New',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
