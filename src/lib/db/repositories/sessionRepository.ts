import { getDatabase } from "@/src/lib/db/connection";
import { SessionDocument } from "@/src/models/Session";
import { Filter, FindOptions } from "mongodb";

const COLLECTION = "sessions";

export const sessionRepository = {
  async find(filter: Filter<SessionDocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<SessionDocument>(COLLECTION).find(filter, options).toArray();
  },

  async findByTokenHash(sessionTokenHash: string) {
    const db = await getDatabase();
    return db.collection<SessionDocument>(COLLECTION).findOne({ sessionTokenHash });
  },

  async findByUserId(userId: string) {
    const db = await getDatabase();
    return db
      .collection<SessionDocument>(COLLECTION)
      .find({ userId })
      .sort({ lastActiveAt: -1 })
      .toArray();
  },

  async insertOne(doc: SessionDocument) {
    const db = await getDatabase();
    return db.collection<SessionDocument>(COLLECTION).insertOne(doc as any);
  },

  async updateLastActive(id: string, now: Date = new Date()) {
    const db = await getDatabase();
    return db.collection<SessionDocument>(COLLECTION).updateOne(
      { id },
      { $set: { lastActiveAt: now, updatedAt: now } }
    );
  },

  async revokeSession(id: string) {
    const db = await getDatabase();
    const now = new Date();
    return db.collection<SessionDocument>(COLLECTION).updateOne(
      { id, revokedAt: null },
      { $set: { revokedAt: now, updatedAt: now } }
    );
  },

  async revokeAllUserSessions(userId: string) {
    const db = await getDatabase();
    const now = new Date();
    const result = await db.collection<SessionDocument>(COLLECTION).updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: now, updatedAt: now } }
    );
    return result.modifiedCount;
  },

  async revokeAllOtherSessions(userId: string, currentSessionId: string) {
    const db = await getDatabase();
    const now = new Date();
    const result = await db.collection<SessionDocument>(COLLECTION).updateMany(
      { userId, id: { $ne: currentSessionId }, revokedAt: null },
      { $set: { revokedAt: now, updatedAt: now } }
    );
    return result.modifiedCount;
  },

  async deleteByUserId(userId: string) {
    const db = await getDatabase();
    return db.collection<SessionDocument>(COLLECTION).deleteMany({
      $or: [{ userId }, { memberId: userId } as any]
    });
  },

  async countActive() {
    const db = await getDatabase();
    return db.collection<SessionDocument>(COLLECTION).countDocuments({
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  },
};
