import { getDatabase } from "@/src/lib/db/connection";
import { AuditActivity } from "@/src/features/activity/types";
import { Filter, FindOptions } from "mongodb";

const COLLECTION = "activities";

export const activityRepository = {
  async find(filter: Filter<AuditActivity> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<AuditActivity>(COLLECTION).find(filter, options).toArray();
  },

  async insertOne(doc: AuditActivity) {
    const db = await getDatabase();
    return db.collection<AuditActivity>(COLLECTION).insertOne(doc as any);
  },

  async count(filter: Filter<AuditActivity> = {}) {
    const db = await getDatabase();
    return db.collection<AuditActivity>(COLLECTION).countDocuments(filter);
  },

  async getMetrics() {
    const db = await getDatabase();
    const col = db.collection<AuditActivity>(COLLECTION);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [today, admins, members, security, investment, application] = await Promise.all([
      col.countDocuments({ createdAt: { $gte: startOfToday } }),
      col.countDocuments({ actorRole: { $in: ["ADMIN", "SUPER_ADMIN"] } }),
      col.countDocuments({ actorRole: "MEMBER" }),
      col.countDocuments({ category: "SECURITY" }),
      col.countDocuments({ category: "INVESTMENT" }),
      col.countDocuments({ category: "APPLICATION" }),
    ]);

    return { today, admins, members, security, investment, application };
  },
};
