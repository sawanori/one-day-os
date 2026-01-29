
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
    }
};
