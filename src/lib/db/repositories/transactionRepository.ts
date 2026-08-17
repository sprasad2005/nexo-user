import { getDatabase } from "@/src/lib/db/connection";
import { TransactionDocument } from "@/src/models/Transaction";
import { Filter, FindOptions } from "mongodb";

const COLLECTION = "transactions";

export const transactionRepository = {
  async find(filter: Filter<TransactionDocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<TransactionDocument>(COLLECTION).find(filter, options).toArray();
  },

  async findByMemberId(memberId: string) {
    const db = await getDatabase();
    return db
      .collection<TransactionDocument>(COLLECTION)
      .find({
        $or: [{ memberId }, { userId: memberId }],
      })
      .sort({ createdAt: -1 })
      .toArray();
  },

  async insertOne(doc: TransactionDocument) {
    const db = await getDatabase();
    return db.collection<TransactionDocument>(COLLECTION).insertOne(doc as any);
  },

  async insertMany(docs: TransactionDocument[]) {
    if (docs.length === 0) return { insertedCount: 0 };
    const db = await getDatabase();
    return db.collection<TransactionDocument>(COLLECTION).insertMany(docs as any);
  },

  async count(filter: Filter<TransactionDocument> = {}) {
    const db = await getDatabase();
    return db.collection<TransactionDocument>(COLLECTION).countDocuments(filter);
  },
};
