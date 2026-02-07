import * as Notifications from 'expo-notifications';
import { IdentityEngine } from '../../../core/identity/IdentityEngine';

/**
 * Debug: Reset Identity Health to 100%
 * Only used in __DEV__ mode.
 */
export const resetIH = async (onHealthUpdate: (health: number) => void): Promise<void> => {
  try {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(100);
    const status = await engine.checkHealth();
    onHealthUpdate(status.health);
    alert('Identity Health reset to 100%');
  } catch (error) {
    console.error('Failed to reset IH:', error);
    alert('Failed to reset IH');
  }
};

/**
 * Debug: Send a test notification immediately.
 * Only used in __DEV__ mode.
 */
export const sendTestNotification = async (): Promise<void> => {
  try {
    // Request permission first
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('通知の許可がありません');
      return;
    }

    // Send immediate test notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'あなたは誰ですか？',
        body: '5分以内に回答。無応答でIH -20%',
        data: { questionIndex: 0 },
      },
      trigger: null, // Immediate notification
    });
    alert('テスト通知を送信しました');
  } catch (error) {
    console.error('Failed to send notification:', error);
    alert('通知の送信に失敗しました');
  }
};
