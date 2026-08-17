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

async function handleMarkRead(
  req: Request,
  params: Promise<{ id: string }>
) {
  try {
    const { id: conversationId } = await params;
    const auth = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));
    const memberId = auth?.memberId || body.memberId || body.currentMemberId || "mem_1";

    const client = await clientPromise;
    const db = client.db(DB);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);
    const msgCol = db.collection<MessageDocument>(COL_MESSAGES);

    const now = new Date();

    // 1. Efficiently update or upsert membership lastReadAt timestamp
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

    // 2. Compute exact remaining total unread messages count for this authenticated user
    const myMemberships = await memberCol.find({ memberId }).toArray();
    const convIds = myMemberships.map((m) => m.conversationId);

    let totalUnreadCount = 0;
    if (convIds.length > 0) {
      const myLastReadMap = new Map<string, Date>();
      myMemberships.forEach((m) => {
        // Since we just marked conversationId as now, reflect it in the map
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

    // 3. Real-time broadcast to all connected tabs/devices
    broadcastRealtimeEvent("message:read", payload);
    triggerPusherEvent("global-messages", "message:read", payload).catch(() => {});

    return NextResponse.json({
      success: true,
      ...payload,
    });
  } catch (err: any) {
    console.error("Mark read error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update read status" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleMarkRead(req, params);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleMarkRead(req, params);
}
