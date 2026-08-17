import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireSuperAdmin } from "@/src/lib/auth/authorization";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { logActivity } from "@/src/features/activity/activityService";

const DB_NAME = "nexo";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdmin();
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

    // Activate user across both users and members collections
    await Promise.all([
      db.collection("users").updateOne(
        { memberId: targetMemberId },
        { $set: { status: "ACTIVE", updatedAt: new Date() } }
      ),
      db.collection("members").updateOne(
        { id: targetMemberId },
        { $set: { status: "ACTIVE", updatedAt: new Date() } }
      ),
    ]);

    // Log Activity
    await logActivity({
      eventType: "ACCOUNT_REACTIVATED",
      category: "SECURITY",
      severity: "SUCCESS",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: targetMemberId,
      targetName: member.name,
      previousValue: { status: user.status || "SUSPENDED" },
      newValue: { status: "ACTIVE" },
      metadata: { targetUserId: user.id },
    });

    return NextResponse.json({ success: true, message: "Account reactivated successfully." });
  } catch (err: any) {
    console.error("POST /api/admin/members/[id]/activate error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred reactivating the account." }, { status: 500 });
  }
}
