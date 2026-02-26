
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
    },

    /**
     * Accelerating heartbeat: interval decreases 1000→800→600→400→200ms with Heavy impact
     * Returns cleanup function for component unmount
     */
    async acceleratingHeartbeat(): Promise<() => void> {
        if (Platform.OS === 'web') return () => {};

        const intervals = [1000, 800, 600, 400, 200];
        let currentIndex = 0;
        let timeoutId: NodeJS.Timeout | null = null;
        let stopped = false;

        const pulse = async () => {
            if (stopped) return;
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } catch (e) {
                // Ignore haptic errors
            }
            if (stopped) return;

            const interval = intervals[Math.min(currentIndex, intervals.length - 1)];
            currentIndex++;
            timeoutId = setTimeout(pulse, interval);
        };

        // Start first pulse
        pulse();

        // Return cleanup function
        return () => {
            stopped = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        };
    },

    /**
     * Lens aperture click: Light impact for each 0.1x scale change during pinch
     */
    async lensApertureClick(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) { }
    },

    /**
     * Boundary snap: Heavy impact when reaching 0.5x/1.0x/2.0x boundaries
     */
    async boundarySnap(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) { }
    },

    /**
     * Judgment arrival: forewarning pulses + invasion vibration
     * Used when a judgment notification arrives in-app
     */
    async judgmentArrival(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(resolve => setTimeout(resolve, 200));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(resolve => setTimeout(resolve, 500));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (e) {
            // Ignore haptic errors
        }
    },

    /**
     * Judgment YES response: silence is the reward
     * Intentionally does nothing - the absence of punishment IS the reward
     */
    async judgmentYes(): Promise<void> {
        // Silence. No dopamine.
    },

    /**
     * Judgment NO response: punishment haptics
     * Error notification + double heavy impact
     */
    async judgmentNo(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            await new Promise(resolve => setTimeout(resolve, 100));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(resolve => setTimeout(resolve, 100));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) {
            // Ignore haptic errors
        }
    },

    /**
     * Judgment timeout: heaviest punishment
     * Triple pulse → silence → final error notification
     */
    async judgmentTimeout(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            for (let i = 0; i < 3; i++) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                await new Promise(resolve => setTimeout(resolve, 80));
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) {
            // Ignore haptic errors
        }
    },

    /**
     * Insurance offer: ominous slow pulse
     * Used when insurance modal appears during death sequence
     */
    async insuranceOffer(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            for (let i = 0; i < 5; i++) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await new Promise(r => setTimeout(r, 30));
            }
        } catch (e) {
            // Ignore haptic errors
        }
    },

    /**
     * Insurance purchase: unpleasant error vibration
     * Shame feedback when user buys their way out of death
     */
    async insurancePurchase(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            await new Promise(r => setTimeout(r, 100));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(r => setTimeout(r, 50));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(r => setTimeout(r, 50));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(r => setTimeout(r, 200));
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) {
            // Ignore haptic errors
        }
    },
};
