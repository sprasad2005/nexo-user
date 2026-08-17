import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ConversationMemberDocument } from "@/src/models/ConversationMember";
import { MessageDocument } from "@/src/models/Message";
import { broadcastRealtimeEvent } from "@/app/api/realtime/route";
import { triggerPusherEvent } from "@/lib/pusher";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

const DB = "nexo";
const COL_MEMBERS = "conversationMembers";
const COL_MESSAGES = "messages";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));
    const conversationId = body.conversationId;
    const memberId = auth?.memberId || body.memberId || body.currentMemberId || "mem_1";

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "conversationId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);
    const msgCol = db.collection<MessageDocument>(COL_MESSAGES);

    const now = new Date();

    await memberCol.updateOne(
      { conversationId, memberId },
      {
        $set: { lastReadAt: now },
        $setOnInsert: {
          id: `cm_${conversationId}_${memberId}`,
          conversationId,
          memberId,
          role: "MEMBER",
          joinedAt: now,
        },
      },
      { upsert: true }
    );

    const myMemberships = await memberCol.find({ memberId }).toArray();
    const convIds = myMemberships.map((m) => m.conversationId);

    let totalUnreadCount = 0;
    if (convIds.length > 0) {
      const myLastReadMap = new Map<string, Date>();
      myMemberships.forEach((m) => {
        if (m.conversationId === conversationId) {
          myLastReadMap.set(m.conversationId, now);
        } else {
          myLastReadMap.set(m.conversationId, m.lastReadAt ? new Date(m.lastReadAt) : new Date(0));
        }
      });

      const unreadMsgsAgg = await msgCol.aggregate([
        {
          $match: {
            conversationId: { $in: convIds },
            senderId: { $ne: memberId },
            isDeletedByAdmin: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$conversationId",
            messages: { $push: { createdAt: "$createdAt" } },
          },
        },
      ]).toArray();

      unreadMsgsAgg.forEach((item: any) => {
        const lastRead = myLastReadMap.get(item._id) || new Date(0);
        const count = item.messages.filter((m: any) => new Date(m.createdAt) > lastRead).length;
        totalUnreadCount += count;
      });
    }

    const payload = {
      conversationId,
      memberId,
      unreadCount: 0,
      totalUnreadCount,
      lastReadAt: now,
    };

    broadcastRealtimeEvent("message:read", payload);
    triggerPusherEvent("global-messages", "message:read", payload).catch(() => {});

    return NextResponse.json({
      success: true,
      ...payload,
    });
  } catch (err: any) {
    console.error("POST /api/messages/mark-read error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update read status" },
      { status: 500 }
    );
  }
}
