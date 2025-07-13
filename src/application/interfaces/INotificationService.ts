export interface INotificationService {
  sendNotification(
    userId: string,
    message: string,
    type: "info" | "warning" | "error"
  ): Promise<void>;
  sendBulkNotification(
    userIds: string[],
    message: string,
    type: "info" | "warning" | "error"
  ): Promise<void>;
}
