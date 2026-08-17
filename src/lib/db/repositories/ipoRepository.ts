import { getDatabase } from "@/src/lib/db/connection";
import { IPODocument } from "@/src/models/IPO";
import { Filter, FindOptions, ObjectId, UpdateFilter } from "mongodb";

const COLLECTION = "ipos";

export const ipoRepository = {
  async find(filter: Filter<IPODocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<IPODocument>(COLLECTION).find(filter, options).toArray();
  },

  async findById(id: string) {
    const db = await getDatabase();
    const trimmedId = id.trim();
    const cleanId = trimmedId.replace(/^pub_/, "");

    const orConditions: any[] = [
      { id: trimmedId },
      { id: cleanId },
      { id: `pub_${cleanId}` },
    ];
    if (ObjectId.isValid(trimmedId)) {
      orConditions.push({ _id: new ObjectId(trimmedId) });
    }
    if (ObjectId.isValid(cleanId)) {
      orConditions.push({ _id: new ObjectId(cleanId) });
    }

    return db.collection<IPODocument>(COLLECTION).findOne({
      $or: orConditions,
    });
  },

  async findByName(name: string) {
    const db = await getDatabase();
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return db.collection<IPODocument>(COLLECTION).findOne({
      name: { $regex: new RegExp(`^${escaped}$`, "i") },
    });
  },

  async insertOne(doc: IPODocument) {
    const db = await getDatabase();
    return db.collection<IPODocument>(COLLECTION).insertOne(doc as any);
  },

  async updateOne(id: string, update: UpdateFilter<IPODocument>) {
    const db = await getDatabase();
    const existing = await this.findById(id);
    if (!existing) return null;

    return db.collection<IPODocument>(COLLECTION).updateOne({ _id: existing._id }, update);
  },

  async deleteOne(id: string) {
    const db = await getDatabase();
    const existing = await this.findById(id);
    if (!existing) return null;

    return db.collection<IPODocument>(COLLECTION).deleteOne({ _id: existing._id });
  },

  async count(filter: Filter<IPODocument> = {}) {
    const db = await getDatabase();
    return db.collection<IPODocument>(COLLECTION).countDocuments(filter);
  },
};
