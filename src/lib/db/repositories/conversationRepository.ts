import { getDatabase } from "@/src/lib/db/connection";
import { ConversationDocument } from "@/src/models/Conversation";
import { ConversationMemberDocument } from "@/src/models/ConversationMember";
import { MessageDocument } from "@/src/models/Message";
import { Filter, FindOptions, UpdateFilter } from "mongodb";

const COL_CONV = "conversations";
const COL_MEMBERS = "conversationMembers";
const COL_MSG = "messages";

export const conversationRepository = {
  async findConversations(filter: Filter<ConversationDocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<ConversationDocument>(COL_CONV).find(filter, options).toArray();
  },

  async findConversationById(id: string) {
    const db = await getDatabase();
    return db.collection<ConversationDocument>(COL_CONV).findOne({ id });
  },

  async findMemberships(filter: Filter<ConversationMemberDocument> = {}) {
    const db = await getDatabase();
    return db.collection<ConversationMemberDocument>(COL_MEMBERS).find(filter).toArray();
  },

  async findMessages(filter: Filter<MessageDocument> = {}, options: FindOptions = {}) {
    const db = await getDatabase();
    return db.collection<MessageDocument>(COL_MSG).find(filter, options).toArray();
  },

  async insertConversation(doc: ConversationDocument) {
    const db = await getDatabase();
    return db.collection<ConversationDocument>(COL_CONV).insertOne(doc as any);
  },

  async insertMemberships(docs: ConversationMemberDocument[]) {
    if (docs.length === 0) return { insertedCount: 0 };
    const db = await getDatabase();
    return db.collection<ConversationMemberDocument>(COL_MEMBERS).insertMany(docs as any);
  },

  async insertMessage(doc: MessageDocument) {
    const db = await getDatabase();
    return db.collection<MessageDocument>(COL_MSG).insertOne(doc as any);
  },

  async updateConversation(id: string, update: UpdateFilter<ConversationDocument>) {
    const db = await getDatabase();
    return db.collection<ConversationDocument>(COL_CONV).updateOne({ id }, update);
  },

  async updateMembership(conversationId: string, memberId: string, update: UpdateFilter<ConversationMemberDocument>) {
    const db = await getDatabase();
    return db.collection<ConversationMemberDocument>(COL_MEMBERS).updateOne(
      { conversationId, memberId },
      update,
      { upsert: true }
    );
  },

  async updateMessage(id: string, update: UpdateFilter<MessageDocument>) {
    const db = await getDatabase();
    return db.collection<MessageDocument>(COL_MSG).updateOne({ id }, update);
  },
};
