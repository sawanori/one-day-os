
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

export function NotificationController() {
    const router = useRouter();

    useEffect(() => {
        // Handle Notification Response (Deep Linking)
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;

            if (data?.type === 'judgment') {
                // Deep link to Judgment Screen
                setTimeout(() => {
                    // We are now safely inside the context, push should work
                    router.push({
                        pathname: '/judgment',
                        params: {
                            id: String(data.slot || 0),
                            question: String(response.notification.request.content.body || '')
                        }
                    });
                }, 500);
            }
        });

        return () => subscription.remove();
    }, []);

    return null;
}
