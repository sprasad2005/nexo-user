import { getDatabase } from "@/src/lib/db/connection";
import { IPOApplicationDocument } from "@/src/models/Application";
import { AnyBulkWriteOperation, Filter, FindOptions, ObjectId, UpdateFilter } from "mongodb";

const COLLECTION = "applications";

export const applicationRepository = {
  async find(filter: Filter<IPOApplicationDocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<IPOApplicationDocument>(COLLECTION).find(filter, options).toArray();
  },

  async findById(id: string) {
    const db = await getDatabase();
    const conditions: any[] = [{ id }];
    if (ObjectId.isValid(id)) {
      conditions.push({ _id: new ObjectId(id) });
    }
    return db.collection<IPOApplicationDocument>(COLLECTION).findOne({ $or: conditions });
  },

  async findByIpoId(ipoId: string, ipoName?: string) {
    const db = await getDatabase();
    const clean = ipoId.replace(/^pub_/, "");
    const conditions: any[] = [
      { ipoId },
      { ipoId: clean },
      { ipoId: `pub_${clean}` },
    ];
    if (ipoName) {
      const escaped = ipoName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      conditions.push({ ipoName: { $regex: new RegExp(`^${escaped}$`, "i") } });
    }
    return db.collection<IPOApplicationDocument>(COLLECTION).find({ $or: conditions }).toArray();
  },

  async findByMemberId(memberId: string) {
    const db = await getDatabase();
    return db.collection<IPOApplicationDocument>(COLLECTION).find({ memberId }).toArray();
  },

  async insertOne(doc: IPOApplicationDocument) {
    const db = await getDatabase();
    return db.collection<IPOApplicationDocument>(COLLECTION).insertOne(doc as any);
  },

  async updateOne(id: string, update: UpdateFilter<IPOApplicationDocument>) {
    const db = await getDatabase();
    const conditions: any[] = [{ id }];
    if (ObjectId.isValid(id)) {
      conditions.push({ _id: new ObjectId(id) });
    }
    return db.collection<IPOApplicationDocument>(COLLECTION).updateOne({ $or: conditions }, update);
  },

  async bulkWrite(operations: AnyBulkWriteOperation<IPOApplicationDocument>[]) {
    if (operations.length === 0) return { modifiedCount: 0 };
    const db = await getDatabase();
    return db.collection<IPOApplicationDocument>(COLLECTION).bulkWrite(operations, { ordered: false });
  },

  async deleteOne(id: string) {
    const db = await getDatabase();
    const conditions: any[] = [{ id }];
    if (ObjectId.isValid(id)) {
      conditions.push({ _id: new ObjectId(id) });
    }
    return db.collection<IPOApplicationDocument>(COLLECTION).deleteOne({ $or: conditions });
  },

  async count(filter: Filter<IPOApplicationDocument> = {}) {
    const db = await getDatabase();
    return db.collection<IPOApplicationDocument>(COLLECTION).countDocuments(filter);
  },
};
