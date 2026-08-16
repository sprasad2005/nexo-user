import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { MessageDocument } from "@/src/models/Message";
import { MemberDocument } from "@/src/models/Member";
import { broadcastRealtimeEvent } from "@/app/api/realtime/route";
import { triggerPusherEvent } from "@/lib/pusher";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

const DB = "nexo";
const COL_MSG = "messages";
const COL_USERS = "members";

/* ────────────────────────────────────────────────────────────────
   POST /api/conversations/[id]/messages/reactions
   Toggles emoji reaction on a message.
──────────────────────────────────────────────────────────────── */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await getAuthenticatedUser();
    const body = await req.json();
    const { messageId, emoji, memberId: bodyMemberId } = body;
    const memberId = auth?.memberId || bodyMemberId || "mem_1";

    if (!messageId || !emoji) {
      return NextResponse.json(
        { success: false, error: "messageId and emoji are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB);
    const msgCol = db.collection<MessageDocument>(COL_MSG);
    const userCol = db.collection<MemberDocument>(COL_USERS);

    const message = await msgCol.findOne({ id: messageId, conversationId });
    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    const senderDoc = await userCol.findOne({ id: memberId });
    const memberName = senderDoc?.name || "Member";
    const memberAvatar = senderDoc?.avatar || "/oggy.png";

    const currentReactions: any[] = (message as any).reactions || [];
    const existingIndex = currentReactions.findIndex(
      (r) => r.memberId === memberId && r.emoji === emoji
    );

    let updatedReactions: any[];
    if (existingIndex >= 0) {
      // Toggle off
      updatedReactions = currentReactions.filter(
        (_, idx) => idx !== existingIndex
      );
    } else {
      // Toggle on (also remove any previous reaction by same user if we only want 1 reaction per user or allow multiple)
      const filtered = currentReactions.filter((r) => r.memberId !== memberId || r.emoji !== emoji);
      updatedReactions = [
        ...filtered,
        {
          emoji,
          memberId,
          memberName,
          memberAvatar,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    await msgCol.updateOne(
      { id: messageId },
      { $set: { reactions: updatedReactions, updatedAt: new Date() } }
    );

    const updatedMsg = await msgCol.findOne({ id: messageId });

    /* Broadcast real-time SSE & Pusher WebSocket updates */
    broadcastRealtimeEvent("message:update", updatedMsg);
    triggerPusherEvent(`conversation-${conversationId}`, "message:update", updatedMsg).catch(() => {});
    triggerPusherEvent("global-messages", "message:update", updatedMsg).catch(() => {});

    return NextResponse.json({ success: true, message: updatedMsg });
  } catch (err: any) {
    console.error("POST /api/conversations/[id]/messages/reactions error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update reaction" },
      { status: 500 }
    );
  }
}
