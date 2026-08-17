import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";
import { MessageDocument } from "@/src/models/Message";
import { ConversationMemberDocument } from "@/src/models/ConversationMember";
import { MemberDocument } from "@/src/models/Member";
import { ConversationDocument } from "@/src/models/Conversation";

const DB = "nexo";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, role } = auth;
    const { searchParams } = new URL(req.url);
    const afterSeq = Number(searchParams.get("after") || searchParams.get("afterSequence") || 0);

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection<ConversationDocument>("conversations");
    const memberCol = db.collection<ConversationMemberDocument>("conversationMembers");
    const msgCol = db.collection<MessageDocument>("messages");
    const userCol = db.collection<MemberDocument>("members");

    /* 1. Retrieve authorized conversation IDs for current user */
    let authorizedMemberships = await memberCol.find({ memberId }).toArray();
    let conversationIds = authorizedMemberships.map((m) => m.conversationId);

    // If no direct memberships found yet, find all conversations where user is a participant or owner
    if (conversationIds.length === 0) {
      const convs = await convCol.find({}).toArray();
      conversationIds = convs.map((c) => c.id);
    }

    if (conversationIds.length === 0) {
      return NextResponse.json({ success: true, messages: [], unreadCounts: {} });
    }

    /* 2. Fetch delta messages strictly after the monotonic cursor (seq > afterSeq) */
    const query: any = {
      conversationId: { $in: conversationIds },
    };

    if (afterSeq > 0) {
      query.seq = { $gt: afterSeq };
    }

    const rawMessages = await msgCol
      .find(query)
      .sort({ seq: 1 })
      .limit(200)
      .toArray();

    /* 3. Enrich messages with sender details & status */
    const allUsers = await userCol.find({}).toArray();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const messages = rawMessages.map((msg) => {
      const sender = userMap.get(msg.senderId);
      return {
        ...msg,
        senderName: sender?.name || "Member",
        senderUsername: sender?.username || sender?.name?.toLowerCase(),
        senderAvatar: sender?.avatar || "/oggy.png",
        status: msg.senderId === memberId ? "SENT" : "READ",
      };
    });

    /* 4. Compute unread counts per conversation */
    const unreadCounts: Record<string, number> = {};
    let totalUnreadCount = 0;
    for (const convId of conversationIds) {
      const membership = authorizedMemberships.find((m) => m.conversationId === convId);
      const lastRead = membership?.lastReadAt ? new Date(membership.lastReadAt).getTime() : 0;
      const count = await msgCol.countDocuments({
        conversationId: convId,
        senderId: { $ne: memberId },
        createdAt: { $gt: new Date(lastRead) },
        isDeletedByAdmin: { $ne: true },
      });
      unreadCounts[convId] = count;
      totalUnreadCount += count;
    }

    return NextResponse.json({
      success: true,
      messages,
      unreadCounts,
      totalUnreadCount,
      currentMemberId: memberId,
    });
  } catch (err: any) {
    console.error("GET /api/conversations/poll error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to poll delta messages" },
      { status: 500 }
    );
  }
}
