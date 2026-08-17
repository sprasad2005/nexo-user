import { getDatabase } from "@/src/lib/db/connection";
import { MemberDocument } from "@/src/models/Member";
import { Filter, FindOptions, UpdateFilter } from "mongodb";

const COLLECTION = "members";

export const memberRepository = {
  async find(filter: Filter<MemberDocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<MemberDocument>(COLLECTION).find(filter, options).toArray();
  },

  async findById(id: string, projection: any = { password: 0, passwordHash: 0 }) {
    const db = await getDatabase();
    return db.collection<MemberDocument>(COLLECTION).findOne({ id }, { projection });
  },

  async findByUsername(username: string) {
    const db = await getDatabase();
    const clean = username.toLowerCase().trim();
    return db.collection<MemberDocument>(COLLECTION).findOne({
      $or: [
        { username: clean },
        { name: { $regex: new RegExp(`^${clean}$`, "i") } }
      ]
    });
  },

  async findByPhone(phone: string) {
    const db = await getDatabase();
    return db.collection<MemberDocument>(COLLECTION).findOne({ phone });
  },

  async findByPan(pan: string) {
    const db = await getDatabase();
    return db.collection<MemberDocument>(COLLECTION).findOne({
      $or: [{ panMasked: pan }, { panFull: pan }]
    });
  },

  async insertOne(doc: MemberDocument) {
    const db = await getDatabase();
    return db.collection<MemberDocument>(COLLECTION).insertOne(doc as any);
  },

  async updateOne(id: string, update: UpdateFilter<MemberDocument>) {
    const db = await getDatabase();
    return db.collection<MemberDocument>(COLLECTION).updateOne({ id }, update);
  },

  async deleteOne(id: string) {
    const db = await getDatabase();
    return db.collection<MemberDocument>(COLLECTION).deleteOne({ id });
  },

  async count(filter: Filter<MemberDocument> = {}) {
    const db = await getDatabase();
    return db.collection<MemberDocument>(COLLECTION).countDocuments(filter);
  },
};
