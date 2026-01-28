/**
 * One Day OS - Notification Types
 */

export interface NotificationData {
  id: string;
  scheduledTime: Date;
  timeoutAt: Date;
  respondedAt?: Date;
  isMissed: boolean;
}

export interface NotificationResponse {
  notificationId: string;
  answers: string[];
  respondedAt: Date;
}

export type NotificationSchedule = {
  hour: number;
  minute: number;
}[];
