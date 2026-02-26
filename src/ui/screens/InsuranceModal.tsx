import React, { useEffect, useRef } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlitchText } from '../effects/GlitchText';
import { NoiseOverlay } from '../effects/NoiseOverlay';
import { ThemedText } from '../components/ThemedText';
import { HapticEngine } from '../../core/HapticEngine';
import { theme } from '../theme/theme';
import { INSURANCE_CONSTANTS } from '../../constants';

export interface InsuranceModalProps {
  visible: boolean;
  countdownSeconds: number;
  onPurchase: () => void;
  onDecline: () => void;
  /** Optional element rendered above the card inside the modal overlay (e.g. progress bar) */
  headerElement?: React.ReactNode;
  /** Localized price string from the store (e.g. "¥1,500"). Falls back to INSURANCE_CONSTANTS.PRICE_DISPLAY. */
  localizedPrice?: string;
}

export const InsuranceModal = ({ visible, countdownSeconds, onPurchase, onDecline, headerElement, localizedPrice }: InsuranceModalProps) => {
  const { t } = useTranslation();

  // Countdown flash animation for last 3 seconds
  const flashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && countdownSeconds <= 3 && countdownSeconds > 0) {
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [countdownSeconds, visible, flashOpacity]);

  useEffect(() => {
    if (visible && countdownSeconds <= 1) {
      HapticEngine.punishFailure();
    }
  }, [visible, countdownSeconds]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <NoiseOverlay health={14} />
        {headerElement}
        <View style={styles.card}>
          {/* Title */}
          <GlitchText
            text={t('insurance.title', { defaultValue: 'IDENTITY INSURANCE' })}
            style={styles.title}
            severity={0.5}
            health={10}
          />

          {/* Copy */}
          <ThemedText style={styles.copy}>
            {t('insurance.copy', {
              defaultValue: 'Will you erase everything you\'ve fought for as worthless garbage? Or will you buy back time with money?',
            })}
          </ThemedText>

          {/* Purchase Button with "I AM WEAK" shame label */}
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={onPurchase}
            testID="insurance-purchase-button"
          >
            <ThemedText style={styles.shameName}>
              {t('insurance.buyLabel', { defaultValue: 'I AM WEAK' })}
            </ThemedText>
            <ThemedText style={styles.priceText} testID="insurance-price">
              {localizedPrice || INSURANCE_CONSTANTS.PRICE_DISPLAY}
            </ThemedText>
            <ThemedText style={styles.purchaseText}>
              {t('insurance.buy', { defaultValue: 'PURCHASE NOW' })}
            </ThemedText>
          </TouchableOpacity>

          {/* Decline Button */}
          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            testID="insurance-decline-button"
          >
            <ThemedText style={styles.declineText}>
              {t('insurance.accept', { defaultValue: 'ACCEPT DEATH' })}
            </ThemedText>
          </TouchableOpacity>

          {/* Countdown */}
          <Animated.View style={{ opacity: countdownSeconds <= 3 ? flashOpacity : 1 }}>
            <ThemedText
              style={[
                styles.countdown,
                countdownSeconds <= 3 && styles.countdownUrgent,
              ]}
              testID="insurance-countdown"
            >
              {String(countdownSeconds).padStart(2, '0')}
            </ThemedText>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    padding: 32,
    width: '90%',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.accent,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
  },
  copy: {
    color: theme.colors.secondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: theme.typography.fontFamily,
  },
  purchaseButton: {
    borderWidth: 2,
    borderColor: theme.colors.foreground,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
  },
  shameName: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily,
    letterSpacing: 2,
    opacity: 0.7,
    marginBottom: 4,
  },
  priceText: {
    color: theme.colors.foreground,
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily,
    letterSpacing: 1,
    marginBottom: 4,
  },
  purchaseText: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily,
    letterSpacing: 2,
  },
  declineButton: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  declineText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily,
    letterSpacing: 2,
  },
  countdown: {
    color: theme.colors.accent,
    fontSize: 72,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily,
    letterSpacing: 4,
  },
  countdownUrgent: {
    fontSize: 84,
  },
});
