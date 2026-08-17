import { getDatabase } from "@/src/lib/db/connection";
import { UserDocument } from "@/src/models/User";
import { Filter, FindOptions, UpdateFilter } from "mongodb";

const COLLECTION = "users";

export const userRepository = {
  async find(filter: Filter<UserDocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<UserDocument>(COLLECTION).find(filter, options).toArray();
  },

  async findById(id: string) {
    const db = await getDatabase();
    return db.collection<UserDocument>(COLLECTION).findOne({
      $or: [{ id }, { memberId: id }]
    });
  },

  async findByMemberId(memberId: string) {
    const db = await getDatabase();
    return db.collection<UserDocument>(COLLECTION).findOne({
      $or: [{ memberId }, { id: memberId }]
    });
  },

  async findByEmailNormalized(emailNormalized: string) {
    const db = await getDatabase();
    return db.collection<UserDocument>(COLLECTION).findOne({ emailNormalized });
  },

  async insertOne(doc: UserDocument) {
    const db = await getDatabase();
    return db.collection<UserDocument>(COLLECTION).insertOne(doc as any);
  },

  async updateOne(idOrMemberId: string, update: UpdateFilter<UserDocument>) {
    const db = await getDatabase();
    return db.collection<UserDocument>(COLLECTION).updateOne(
      { $or: [{ id: idOrMemberId }, { memberId: idOrMemberId }] },
      update
    );
  },

  async deleteOne(idOrMemberId: string) {
    const db = await getDatabase();
    return db.collection<UserDocument>(COLLECTION).deleteOne({
      $or: [{ id: idOrMemberId }, { memberId: idOrMemberId }]
    });
  },

  async count(filter: Filter<UserDocument> = {}) {
    const db = await getDatabase();
    return db.collection<UserDocument>(COLLECTION).countDocuments(filter);
  },
};
