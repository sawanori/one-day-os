
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const NotificationManager = {
    async requestPermissions() {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Schedules the 5 fixed daily judgments.
     * These are the "5 Alarms" from the specifications.
     */
    async scheduleDailyJudgments() {
        // Clear existing to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        const judgments = [
            {
                hour: 11, minute: 0,
                title: "Judgment 1: Avoidance",
                body: "What are you trying to avoid right now?"
            },
            {
                hour: 13, minute: 30,
                title: "Judgment 2: Observation",
                body: "What would an observer conclude you want based on your actions?"
            },
            {
                hour: 15, minute: 15,
                title: "Judgment 3: Direction",
                body: "Are you moving towards the life you want, or the one you hate?"
            },
            {
                hour: 17, minute: 0,
                title: "Judgment 4: Priority",
                body: "What is the most important thing you are pretending is not important?"
            },
            {
                hour: 19, minute: 30,
                title: "Judgment 5: Truth",
                body: "Was today's action driven by desire or defense?"
            },
        ];

        for (const judgment of judgments) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: judgment.title,
                    body: judgment.body,
                    sound: 'default', // TODO: Custom "unpleasant" sound
                    data: {
                        type: 'judgment',
                        slot: `${judgment.hour}:${judgment.minute}`,
                        url: '/judgment' // Hint for some consumers
                    },
                },
                trigger: {
                    hour: judgment.hour,
                    minute: judgment.minute,
                    repeats: true,
                    type: Notifications.SchedulableTriggerInputTypes.DAILY
                } as any, // Cast needed for some expo versions
            });
        }

        console.log("5 Daily Judgments Scheduled.");
    }
};
