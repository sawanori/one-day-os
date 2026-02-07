import React, { useEffect } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { GlitchText } from '../effects/GlitchText';
import { ThemedText } from '../components/ThemedText';
import { HapticEngine } from '../../core/HapticEngine';
import { theme } from '../theme/theme';

export interface InsuranceModalProps {
  visible: boolean;
  countdownSeconds: number;
  onPurchase: () => void;
  onDecline: () => void;
}

export const InsuranceModal = ({ visible, countdownSeconds, onPurchase, onDecline }: InsuranceModalProps) => {
  useEffect(() => {
    if (visible && countdownSeconds <= 1) {
      HapticEngine.punishFailure();
    }
  }, [visible, countdownSeconds]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <GlitchText text="最後の救済" style={styles.title} severity={0.5} health={10} />
          <ThemedText style={styles.subtitle}>Identity Insurance - ¥1,500</ThemedText>
          <ThemedText style={styles.countdown}>{countdownSeconds}</ThemedText>
          <TouchableOpacity style={styles.purchaseButton} onPress={onPurchase}>
            <ThemedText style={styles.purchaseText}>今すぐ購入</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <ThemedText style={styles.declineText}>死を受け入れる</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: theme.colors.background, borderWidth: 2, borderColor: theme.colors.accent, padding: 32, width: '90%', alignItems: 'center' },
  title: { color: theme.colors.accent, fontSize: 28, fontWeight: 'bold', marginBottom: 16, fontFamily: theme.typography.fontFamily },
  subtitle: { color: theme.colors.foreground, fontSize: 18, marginBottom: 24 },
  countdown: { color: theme.colors.accent, fontSize: 72, fontWeight: 'bold', marginBottom: 32, fontFamily: theme.typography.fontFamily },
  purchaseButton: { borderWidth: 2, borderColor: theme.colors.foreground, paddingVertical: 16, paddingHorizontal: 48, marginBottom: 16 },
  purchaseText: { color: theme.colors.foreground, fontSize: 18, fontWeight: 'bold' },
  declineButton: { borderWidth: 2, borderColor: theme.colors.accent, paddingVertical: 12, paddingHorizontal: 32 },
  declineText: { color: theme.colors.accent, fontSize: 14 },
});
