import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ConversationDocument } from "@/src/models/Conversation";
import { ConversationMemberDocument } from "@/src/models/ConversationMember";
import { MemberDocument } from "@/src/models/Member";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";
import { broadcastRealtimeEvent } from "@/app/api/realtime/route";

const DB = "nexo";
const COL_CONV = "conversations";
const COL_MEMBERS = "conversationMembers";
const COL_USERS = "members";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const currentMemberId = searchParams.get("memberId") || "mem_1";

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection<ConversationDocument>(COL_CONV);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);
    const userCol = db.collection<MemberDocument>(COL_USERS);

    /* 1. Security Check: verify member belongs to this conversation */
    const isMember = await memberCol.findOne({
      conversationId: id,
      memberId: currentMemberId,
    });

    if (!isMember) {
      return NextResponse.json(
        { success: false, error: "Access denied. You are not a member of this conversation." },
        { status: 403 }
      );
    }

    const conversation = await convCol.findOne({ id });
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    const cMemberships = await memberCol.find({ conversationId: id }).toArray();
    const allUsers = await userCol.find({}).toArray();
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const participantMembers = cMemberships
      .map((m) => userMap.get(m.memberId))
      .filter(Boolean);

    let title = conversation.title;
    let avatar = conversation.avatar;
    let otherMember = undefined;

    if (conversation.type === "DIRECT") {
      const other = participantMembers.find((m) => m?.id !== currentMemberId);
      if (other) {
        title = other.name;
        avatar = other.avatar;
        otherMember = other;
      }
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        title,
        avatar,
        otherMember,
        participants: participantMembers,
      },
    });
  } catch (err: any) {
    console.error("GET /api/conversations/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversation details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { avatar, title } = body;

    const auth = await getAuthenticatedUser();
    const isAdmin = auth?.role === "SUPER_ADMIN" || auth?.role === "ADMIN";

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection<ConversationDocument>(COL_CONV);

    const conv = await convCol.findOne({ id });
    if (!conv) {
      return NextResponse.json({ success: false, error: "Group not found." }, { status: 404 });
    }

    // Allow Admins or the group creator
    if (!isAdmin && (!auth || conv.createdBy !== auth.memberId)) {
      return NextResponse.json(
        { success: false, error: "Access denied. Only Admins can update this group." },
        { status: 403 }
      );
    }

    const updateFields: any = { updatedAt: new Date() };
    if (avatar && typeof avatar === "string") updateFields.avatar = avatar;
    if (title && typeof title === "string" && title.trim()) updateFields.title = title.trim();

    await convCol.updateOne({ id }, { $set: updateFields });

    const updatedConv = await convCol.findOne({ id });
    if (updatedConv) {
      broadcastRealtimeEvent("conversation:update", updatedConv);
    }

    return NextResponse.json({
      success: true,
      message: "Group updated successfully!",
      conversation: updatedConv,
    });
  } catch (err: any) {
    console.error("PATCH /api/conversations/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update group." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser();
    const isAdmin = auth?.role === "SUPER_ADMIN" || auth?.role === "ADMIN";

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection<ConversationDocument>(COL_CONV);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);
    const msgCol = db.collection<any>("messages");

    const conv = await convCol.findOne({ id });
    if (!conv) {
      return NextResponse.json({ success: false, error: "Group not found." }, { status: 404 });
    }

    if (!isAdmin && (!auth || conv.createdBy !== auth.memberId)) {
      return NextResponse.json(
        { success: false, error: "Access denied. Only Admins can delete groups." },
        { status: 403 }
      );
    }

    await Promise.all([
      convCol.deleteOne({ id }),
      memberCol.deleteMany({ conversationId: id }),
      msgCol.deleteMany({ conversationId: id }),
    ]);

    broadcastRealtimeEvent("conversation:delete", { conversationId: id });

    return NextResponse.json({
      success: true,
      message: "Group deleted successfully",
      conversationId: id,
    });
  } catch (err: any) {
    console.error("DELETE /api/conversations/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete group." },
      { status: 500 }
    );
  }
}

