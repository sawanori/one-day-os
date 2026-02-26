/**
 * Anti-Vision Fragments Effect
 * Randomly floats fragments of the anti-vision text as IH decreases
 * Fragments are limited to 4 and avoid the center area (30-70% x-range)
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

// Generate an x position that avoids the center (30-70%) range
const getEdgeX = (): number => {
  if (Math.random() < 0.5) {
    // Left edge: 5-25%
    return 5 + Math.random() * 20;
  } else {
    // Right edge: 75-95%
    return 75 + Math.random() * 20;
  }
};

export const AntiVisionFragments = ({ antiVision, health }: AntiVisionFragmentsProps) => {
  const [fragments, setFragments] = useState<Fragment[]>([]);

  useEffect(() => {
    // Only show fragments when IH < 70%
    if (health >= 70 || !antiVision) {
      setFragments([]);
      return;
    }

    // Calculate number of fragments based on health, capped at 4
    const rawCount = Math.floor((70 - health) / 10) + 1; // 1-8 fragments raw
    const fragmentCount = Math.min(4, rawCount); // cap at 4

    // Split anti-vision into words
    const words = antiVision.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return;

    // Create random fragments with edge-biased x positions
    const newFragments: Fragment[] = [];
    for (let i = 0; i < fragmentCount; i++) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      newFragments.push({
        id: i,
        text: randomWord,
        x: getEdgeX(),                           // Left 5-25% or right 75-95%
        y: Math.random() * 80 + 10,              // 10-90% of screen height
        opacity: new Animated.Value(0),
        rotation: (Math.random() - 0.5) * 20,   // -10 to +10 degrees (reduced from ±15)
      });
    }

    setFragments(newFragments);

    // Animate fragments to fade in/out randomly
    const timeoutIds: NodeJS.Timeout[] = [];
    newFragments.forEach((fragment) => {
      const delay = Math.random() * 2000;
      const id = setTimeout(() => {
        // Target opacity capped at 0.50
        const targetOpacity = Math.min(0.50, 0.3 + (70 - health) / 100);

        Animated.sequence([
          // Fade in
          Animated.timing(fragment.opacity, {
            toValue: targetOpacity,
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
