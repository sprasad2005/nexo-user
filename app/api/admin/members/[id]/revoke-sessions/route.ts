import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/src/lib/auth/authorization";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { revokeAllUserSessions } from "@/src/lib/auth/session";
import { logActivity } from "@/src/features/activity/activityService";

const DB_NAME = "nexo";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const resolvedParams = await params;
    const targetMemberId = resolvedParams.id;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Verify member exists
    const member = await db.collection<MemberDocument>("members").findOne({ id: targetMemberId });
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found." }, { status: 404 });
    }

    // Verify user exists
    const user = await db.collection<UserDocument>("users").findOne({ memberId: member.id });
    if (!user) {
      return NextResponse.json({ success: false, error: "User credentials not found." }, { status: 404 });
    }

    // Revoke sessions
    const count = await revokeAllUserSessions(user.id);

    // Log Activity
    await logActivity({
      eventType: "ALL_SESSIONS_REVOKED",
      category: "SECURITY",
      severity: "WARNING",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: targetMemberId,
      targetName: member.name,
      metadata: { revokedCount: count, targetUserId: user.id },
    });

    return NextResponse.json({ success: true, message: `Successfully revoked all (${count}) sessions.` });
  } catch (err: any) {
    console.error("POST /api/admin/members/[id]/revoke-sessions error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred revoking sessions." }, { status: 500 });
  }
}
