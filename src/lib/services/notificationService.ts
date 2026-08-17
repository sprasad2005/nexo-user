import { notificationRepository } from "@/src/lib/db/repositories/notificationRepository";
import { NotificationDocument } from "@/src/models/Notification";
import { AuthContext } from "@/src/lib/auth/authorization";

export const notificationService = {
  async getNotifications(memberId?: string) {
    return notificationRepository.findForMember(memberId);
  },

  async createNotification(data: any, auth: AuthContext) {
    if (!data.title || !data.message) {
      throw new Error("Validation Error: Title and message are required.");
    }

    const notifId = `notif_${Date.now()}`;
    const doc: NotificationDocument = {
      id: notifId,
      senderId: auth.memberId,
      senderName: auth.displayName,
      targetMemberId: data.targetMemberId || "ALL",
      targetMemberName: data.targetMemberName || "All Group Members",
      title: data.title,
      message: data.message,
      severity: data.severity || "INFO",
      ipoId: data.ipoId,
      ipoName: data.ipoName,
      ctaLabel: data.ctaLabel,
      ctaLink: data.ctaLink,
      readBy: [],
      dismissedBy: [],
      createdAt: new Date(),
    };

    await notificationRepository.insertOne(doc);
    return doc;
  },

  async markAsRead(notificationId: string | undefined, memberId: string) {
    if (notificationId) {
      return notificationRepository.markAsRead(notificationId, memberId);
    }
    return notificationRepository.markAllAsRead(memberId);
  },

  async dismissNotification(id: string, memberId: string) {
    return notificationRepository.dismiss(id, memberId);
  },

  async deleteNotification(id: string) {
    return notificationRepository.deleteOne(id);
  },
};
