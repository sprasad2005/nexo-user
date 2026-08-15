import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";
import { broadcastRealtimeEvent } from "@/app/api/realtime/route";

const DB = "nexo";
const COL_CONV = "conversations";
const COL_MEMBERS = "conversationMembers";

/* ────────────────────────────────────────────────────────────────
   POST /api/conversations/[id]/members
   Adds a member or multiple members to a group chat.
   Restricted to ADMIN and SUPER_ADMIN roles only.
──────────────────────────────────────────────────────────────── */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { role } = auth;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only Admins can modify group members" },
        { status: 403 }
      );
    }

    const { id: conversationId } = await params;
    const body = await req.json().catch(() => ({}));
    const memberIds: string[] = Array.isArray(body.memberIds)
      ? body.memberIds
      : body.memberId
      ? [body.memberId]
      : [];

    if (memberIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing memberId or memberIds" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection(COL_CONV);
    const memberCol = db.collection(COL_MEMBERS);

    const conv = await convCol.findOne({ id: conversationId });
    if (!conv) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    let addedCount = 0;

    for (const mId of memberIds) {
      const existing = await memberCol.findOne({ conversationId, memberId: mId });
      if (!existing) {
        await memberCol.insertOne({
          id: `cm_${conversationId}_${mId}`,
          conversationId,
          memberId: mId,
          role: "MEMBER",
          joinedAt: now,
          lastReadAt: now,
        });
        addedCount++;
      }
    }

    await convCol.updateOne(
      { id: conversationId },
      { $set: { updatedAt: now } }
    );

    broadcastRealtimeEvent("conversation:update", { id: conversationId, updatedAt: now });

    return NextResponse.json({
      success: true,
      message: `Added ${addedCount} member(s) to group.`,
    });
  } catch (err: any) {
    console.error("POST /api/conversations/[id]/members error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to add member" },
      { status: 500 }
    );
  }
}

/* ────────────────────────────────────────────────────────────────
   DELETE /api/conversations/[id]/members
   Removes a member from a group chat.
   Restricted to ADMIN and SUPER_ADMIN roles only.
──────────────────────────────────────────────────────────────── */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { role } = auth;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only Admins can remove group members" },
        { status: 403 }
      );
    }

    const { id: conversationId } = await params;
    const { searchParams } = new URL(req.url);
    let targetMemberId = searchParams.get("memberId");

    if (!targetMemberId) {
      const body = await req.json().catch(() => ({}));
      targetMemberId = body.memberId;
    }

    if (!targetMemberId) {
      return NextResponse.json(
        { success: false, error: "Missing memberId parameter" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection(COL_CONV);
    const memberCol = db.collection(COL_MEMBERS);

    await memberCol.deleteOne({ conversationId, memberId: targetMemberId });

    const now = new Date();
    await convCol.updateOne(
      { id: conversationId },
      { $set: { updatedAt: now } }
    );

    broadcastRealtimeEvent("conversation:update", { id: conversationId, updatedAt: now });

    return NextResponse.json({
      success: true,
      message: "Member removed from group.",
    });
  } catch (err: any) {
    console.error("DELETE /api/conversations/[id]/members error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to remove member" },
      { status: 500 }
    );
  }
}
