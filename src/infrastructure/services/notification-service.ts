import { INotificationService } from '../../application/interfaces/INotificationService';

export class NotificationService implements INotificationService {
  private notifications: Map<
    string,
    Array<{
      id: string;
      message: string;
      type: 'info' | 'warning' | 'error';
      timestamp: Date;
      read: boolean;
    }>
  > = new Map();

  async sendNotification(
    userId: string,
    message: string,
    type: 'info' | 'warning' | 'error'
  ): Promise<void> {
    const notification = {
      id: this.generateId(),
      message,
      type,
      timestamp: new Date(),
      read: false,
    };

    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.unshift(notification);

    // Keep only the last 100 notifications per user
    if (userNotifications.length > 100) {
      userNotifications.splice(100);
    }

    this.notifications.set(userId, userNotifications);

    console.log(`🔔 Notification sent to ${userId}: ${message} (${type})`);

    // In a real implementation, you would:
    // - Send push notifications
    // - Send WebSocket messages
    // - Store in database
    // - Send to external notification services
  }

  async sendBulkNotification(
    userIds: string[],
    message: string,
    type: 'info' | 'warning' | 'error'
  ): Promise<void> {
    const promises = userIds.map(userId => this.sendNotification(userId, message, type));

    await Promise.allSettled(promises);
    console.log(`📢 Bulk notification sent to ${userIds.length} users`);
  }

  // Additional methods for notification management
  async getUserNotifications(userId: string): Promise<
    Array<{
      id: string;
      message: string;
      type: 'info' | 'warning' | 'error';
      timestamp: Date;
      read: boolean;
    }>
  > {
    return this.notifications.get(userId) || [];
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach(notification => {
      notification.read = true;
    });
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex(n => n.id === notificationId);
    if (index >= 0) {
      userNotifications.splice(index, 1);
    }
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
