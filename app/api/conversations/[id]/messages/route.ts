import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { MessageDocument } from "@/src/models/Message";
import { ConversationDocument } from "@/src/models/Conversation";
import { ConversationMemberDocument } from "@/src/models/ConversationMember";
import { MemberDocument } from "@/src/models/Member";
import { broadcastRealtimeEvent } from "@/app/api/realtime/route";
import { getNextSequence } from "@/src/lib/sequence";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

const DB = "nexo";
const COL_CONV = "conversations";
const COL_MEMBERS = "conversationMembers";
const COL_MSG = "messages";
const COL_USERS = "members";

/* ────────────────────────────────────────────────────────────────
   GET /api/conversations/[id]/messages
   Fetches paginated messages for a conversation (limit default 50).
──────────────────────────────────────────────────────────────── */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    const currentMemberId = auth?.memberId || searchParams.get("memberId") || "mem_1";
    const before = searchParams.get("before");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection<ConversationDocument>(COL_CONV);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);
    const msgCol = db.collection<MessageDocument>(COL_MSG);
    const userCol = db.collection<MemberDocument>(COL_USERS);

    /* Security & Membership Check with Auto-Enrollment */
    let isMember = await memberCol.findOne({
      conversationId,
      memberId: currentMemberId,
    });

    if (!isMember) {
      const conv = await convCol.findOne({ id: conversationId });
      if (conv) {
        await memberCol.insertOne({
          id: `cm_${conversationId}_${currentMemberId}`,
          conversationId,
          memberId: currentMemberId,
          role: "MEMBER",
          joinedAt: new Date(),
          lastReadAt: new Date(),
        });
      }
    }

    /* Update caller's lastReadAt timestamp */
    await memberCol.updateOne(
      { conversationId, memberId: currentMemberId },
      { $set: { lastReadAt: new Date() } },
      { upsert: true }
    );

    const query: any = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const rawMessages = await msgCol
      .find(query)
      .sort({ seq: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    rawMessages.reverse();

    const allUsers = await userCol.find({}).toArray();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const otherMemberships = await memberCol
      .find({ conversationId, memberId: { $ne: currentMemberId } })
      .toArray();

    const messages = rawMessages.map((msg) => {
      const sender = userMap.get(msg.senderId);
      const msgTime = new Date(msg.createdAt).getTime();

      let status: "SENT" | "DELIVERED" | "READ" = "SENT";
      if (msg.senderId === currentMemberId) {
        if (otherMemberships.length > 0) {
          const allRead = otherMemberships.every((m) => {
            const lastRead = m.lastReadAt ? new Date(m.lastReadAt).getTime() : 0;
            return lastRead >= msgTime;
          });

          const anyDelivered = otherMemberships.some((m) => {
            const lastRead = m.lastReadAt ? new Date(m.lastReadAt).getTime() : 0;
            return lastRead > 0;
          });

          if (allRead) {
            status = "READ";
          } else if (anyDelivered || otherMemberships.length > 0) {
            status = "DELIVERED";
          }
        }
      }

      return {
        ...msg,
        senderName: sender?.name || "Member",
        senderUsername: sender?.username || sender?.name?.toLowerCase(),
        senderAvatar: sender?.avatar || "/oggy.png",
        status,
      };
    });

    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    console.error("GET /api/conversations/[id]/messages error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/* ────────────────────────────────────────────────────────────────
   POST /api/conversations/[id]/messages
   Sends a new text message with an atomic sequence number.
──────────────────────────────────────────────────────────────── */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await getAuthenticatedUser();
    const body = await req.json();
    const senderId = auth?.memberId || body.senderId || body.currentMemberId || "mem_1";
    const text = (body.text || "").trim();

    if (!text && !body.attachment) {
      return NextResponse.json(
        { success: false, error: "Message text or attachment is required" },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: "Message exceeds maximum 5000 character limit" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection<ConversationDocument>(COL_CONV);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);
    const msgCol = db.collection<MessageDocument>(COL_MSG);
    const userCol = db.collection<MemberDocument>(COL_USERS);

    let isMember = await memberCol.findOne({
      conversationId,
      memberId: senderId,
    });

    if (!isMember) {
      const conv = await convCol.findOne({ id: conversationId });
      if (conv) {
        await memberCol.insertOne({
          id: `cm_${conversationId}_${senderId}`,
          conversationId,
          memberId: senderId,
          role: "MEMBER",
          joinedAt: new Date(),
          lastReadAt: new Date(),
        });
      } else {
        await convCol.insertOne({
          id: conversationId,
          type: "DIRECT",
          title: "Direct Chat",
          createdBy: senderId,
          lastMessage: text || (body.attachment ? `[${body.attachment.type}]` : "Attachment"),
          lastMessageAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await memberCol.insertOne({
          id: `cm_${conversationId}_${senderId}`,
          conversationId,
          memberId: senderId,
          role: "OWNER",
          joinedAt: new Date(),
          lastReadAt: new Date(),
        });
      }
    }

    const now = new Date();
    const seq = await getNextSequence("messageSequence");
    const msgId = `msg_${Date.now()}_${seq}`;

    const newMsg: any = {
      id: msgId,
      seq,
      conversationId,
      senderId,
      text: text || (body.attachment ? `[${body.attachment.type}] ${body.attachment.name}` : ""),
      type: body.type || (body.attachment ? body.attachment.type : "TEXT"),
      attachment: body.attachment,
      replyToMessageId: body.replyToMessageId,
      createdAt: now,
      isEdited: false,
      isDeleted: false,
    };

    await msgCol.insertOne(newMsg as any);

    /* Update Conversation lastMessage & lastMessageAt */
    await convCol.updateOne(
      { id: conversationId },
      {
        $set: {
          lastMessage: text,
          lastMessageAt: now,
          lastMessageSenderId: senderId,
          updatedAt: now,
        },
      }
    );

    /* Update sender's lastReadAt */
    await memberCol.updateOne(
      { conversationId, memberId: senderId },
      { $set: { lastReadAt: now } }
    );

    const sender = await userCol.findOne({ id: senderId });

    const fullMsg = {
      ...newMsg,
      senderName: sender?.name || "Member",
      senderUsername: sender?.username || sender?.name?.toLowerCase(),
      senderAvatar: sender?.avatar || "/oggy.png",
      status: "SENT",
    };

    /* Broadcast real-time SSE event with atomic seq ID */
    broadcastRealtimeEvent("message:new", fullMsg);

    return NextResponse.json({ success: true, message: fullMsg });
  } catch (err: any) {
    console.error("POST /api/conversations/[id]/messages error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}

/* ────────────────────────────────────────────────────────────────
   PUT /api/conversations/[id]/messages
   Edits or soft-deletes an existing message.
──────────────────────────────────────────────────────────────── */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await getAuthenticatedUser();
    const body = await req.json();
    const messageId = body.messageId;
    const senderId = auth?.memberId || body.senderId || "mem_1";
    const action = body.action; // "edit" | "delete"
    const newText = (body.text || "").trim();

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: "messageId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB);
    const msgCol = db.collection<MessageDocument>(COL_MSG);
    const userCol = db.collection<MemberDocument>(COL_USERS);

    const existingMsg =
      (await msgCol.findOne({ id: messageId })) ||
      (await msgCol.findOne({ id: messageId, conversationId }));

    if (!existingMsg) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    const callerDoc = await userCol.findOne({ id: senderId });
    const isCallerAdmin =
      auth?.role === "SUPER_ADMIN" ||
      auth?.role === "ADMIN" ||
      callerDoc?.role === "SUPER_ADMIN" ||
      callerDoc?.role === "ADMIN";

    /* Allow editing only by author, but allow deletion by any user from their dashboard */
    if (action === "edit" && existingMsg.senderId !== senderId) {
      return NextResponse.json(
        { success: false, error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    const now = new Date();
    if (action === "delete") {
      if (isCallerAdmin) {
        // Deleted by Admin/SuperAdmin -> deleted for EVERYONE including admins
        await msgCol.updateOne(
          { id: messageId },
          { $set: { isDeleted: true, isDeletedByAdmin: true, deletedByUserId: senderId, updatedAt: now } }
        );
      } else {
        // Deleted by user -> deleted for users, but remains in Admin Audit View
        await msgCol.updateOne(
          { id: messageId },
          { $set: { isDeleted: true, isDeletedByAdmin: false, deletedByUserId: senderId, updatedAt: now } }
        );
      }
    } else if (action === "edit") {
      if (!newText) {
        return NextResponse.json(
          { success: false, error: "Edited text cannot be empty" },
          { status: 400 }
        );
      }
      await msgCol.updateOne(
        { id: messageId },
        { $set: { text: newText, isEdited: true, updatedAt: now } }
      );
    }

    const updated = await msgCol.findOne({ id: messageId });

    broadcastRealtimeEvent("message:update", updated);

    return NextResponse.json({ success: true, message: updated });
  } catch (err: any) {
    console.error("PUT /api/conversations/[id]/messages error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update message" },
      { status: 500 }
    );
  }
}
