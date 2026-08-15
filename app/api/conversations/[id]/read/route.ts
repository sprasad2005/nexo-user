import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ConversationMemberDocument } from "@/src/models/ConversationMember";
import { broadcastRealtimeEvent } from "@/app/api/realtime/route";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

const DB = "nexo";
const COL_MEMBERS = "conversationMembers";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const auth = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));
    const memberId = auth?.memberId || body.memberId || body.currentMemberId || "mem_1";

    const client = await clientPromise;
    const db = client.db(DB);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);

    const now = new Date();

    await memberCol.updateOne(
      { conversationId, memberId },
      { $set: { lastReadAt: now } },
      { upsert: true }
    );

    broadcastRealtimeEvent("message:read", { conversationId, memberId, lastReadAt: now });

    return NextResponse.json({
      success: true,
      conversationId,
      memberId,
      lastReadAt: now,
    });
  } catch (err: any) {
    console.error("PUT /api/conversations/[id]/read error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update read status" },
      { status: 500 }
    );
  }
}
