
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const HapticEngine = {
    /**
     * Simulates a heartbeat (Heavy impact followed quickly by Light impact).
     * Used for low health warnings or suspense.
     */
    async pulseHeartbeat() {
        if (Platform.OS === 'web') return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setTimeout(async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }, 150);
        } catch (e) {
            // Ignore haptic errors
        }
    },

    /**
     * Strong rapid vibration to indicate failure or damage.
     * "Punishment" for wrong choices.
     */
    async punishFailure() {
        if (Platform.OS === 'web') return;
        try {
            // NotificationError is usually a sequence of vibrations on iOS
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) { }
    },

    /**
     * Sharp feedback for lens snapping or important UI interactions.
     */
    async snapLens() {
        if (Platform.OS === 'web') return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) { }
    },

    /**
     * Subtle click for standard buttons
     */
    async lightClick() {
        if (Platform.OS === 'web') return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) { }
    },

    /**
     * Aggressive punishment vibration for "NO" or ignored notifications
     * Creates an uncomfortable double-tap heartbeat pattern
     */
    async punishmentHeartbeat() {
        if (Platform.OS === 'web') return;
        try {
            // First aggressive pulse
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // Short pause
            await new Promise(resolve => setTimeout(resolve, 100));

            // Second aggressive pulse
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // Another pause
            await new Promise(resolve => setTimeout(resolve, 200));

            // Third pulse (lighter but still present)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
            // Ignore haptic errors
        }
    }
};
