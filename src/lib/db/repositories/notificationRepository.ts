import { getDatabase } from "@/src/lib/db/connection";
import { NotificationDocument } from "@/src/models/Notification";
import { Filter, FindOptions, ObjectId } from "mongodb";

const COLLECTION = "notifications";

export const notificationRepository = {
  async find(filter: Filter<NotificationDocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<NotificationDocument>(COLLECTION).find(filter, options).toArray();
  },

  async findForMember(memberId?: string, limit: number = 30) {
    const db = await getDatabase();
    const filter = memberId
      ? {
          $or: [{ targetMemberId: "ALL" }, { targetMemberId: memberId }],
          dismissedBy: { $ne: memberId },
        }
      : { targetMemberId: "ALL" };

    return db
      .collection<NotificationDocument>(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async insertOne(doc: NotificationDocument) {
    const db = await getDatabase();
    return db.collection<NotificationDocument>(COLLECTION).insertOne(doc as any);
  },

  async markAsRead(notificationId: string, memberId: string) {
    const db = await getDatabase();
    return db.collection<NotificationDocument>(COLLECTION).updateOne(
      { id: notificationId },
      { $addToSet: { readBy: memberId } as any }
    );
  },

  async markAllAsRead(memberId: string) {
    const db = await getDatabase();
    return db.collection<NotificationDocument>(COLLECTION).updateMany(
      { $or: [{ targetMemberId: "ALL" }, { targetMemberId: memberId }] },
      { $addToSet: { readBy: memberId } as any }
    );
  },

  async dismiss(id: string, memberId: string) {
    const db = await getDatabase();
    const conditions: any[] = [{ id }];
    if (ObjectId.isValid(id)) conditions.push({ _id: new ObjectId(id) });

    return db.collection<NotificationDocument>(COLLECTION).updateOne(
      { $or: conditions },
      { $addToSet: { dismissedBy: memberId } as any }
    );
  },

  async deleteOne(id: string) {
    const db = await getDatabase();
    const conditions: any[] = [{ id }];
    if (ObjectId.isValid(id)) conditions.push({ _id: new ObjectId(id) });

    return db.collection<NotificationDocument>(COLLECTION).deleteOne({ $or: conditions });
  },

  async count(filter: Filter<NotificationDocument> = {}) {
    const db = await getDatabase();
    return db.collection<NotificationDocument>(COLLECTION).countDocuments(filter);
  },
};
