/**
 * DecayText - タイポグラフィ崩壊エフェクト
 * IH低下に応じてテキストの文字が崩壊・置換される
 *
 * Usage:
 * <DecayText text="IDENTITY HEALTH" health={health} stressLevel={stressLevel} />
 */
import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, Platform } from 'react-native';

interface DecayTextProps {
  text: string;
  health: number;
  stressLevel: 0 | 1 | 2 | 3 | 4; // タイマーリセットを stressLevel 変化に絞るために必要
  style?: any;
}

const GLITCH_CHARS = '!@#$%^&*[]{}|<>~`░▒▓█▄▀■□▪';

export const DecayText = ({ text, health, stressLevel, style }: DecayTextProps) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    // IH 60%未満で崩壊開始
    if (health >= 60) {
      setDisplayText(text);
      return;
    }

    // 崩壊率: IH=60%で0%、IH=0%で40%の文字が置換される
    const decayRate = (60 - health) / 60 * 0.40;
    // 更新間隔: IH=60%で3000ms、IH=0%で300ms
    const interval = Math.max(300, 3000 - (60 - health) / 60 * 2700);

    const timer = setInterval(() => {
      const chars = text.split('');
      const corrupted = chars.map(char => {
        if (char === ' ') return char;
        if (Math.random() < decayRate) {
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        return char;
      });
      setDisplayText(corrupted.join(''));
    }, interval);

    return () => clearInterval(timer);
  // 依存配列は health ではなく stressLevel を使う
  // health が毎秒変化してもタイマーがリセットされないよう、
  // 段階変化のみをトリガーにする
  }, [stressLevel, text]);

  return (
    <Text style={[styles.text, style]}>
      {displayText}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
