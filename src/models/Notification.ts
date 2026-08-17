import { ObjectId } from "mongodb";

export interface NotificationDocument {
  _id?: ObjectId;
  id: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  targetMemberId: string;
  targetMemberName?: string;
  title: string;
  message: string;
  severity?: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  ipoId?: string;
  ipoName?: string;
  ctaLabel?: string;
  ctaLink?: string;
  readBy?: string[];
  dismissedBy?: string[];
  createdAt: Date;
  updatedAt?: Date;
}
