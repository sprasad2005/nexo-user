import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireSuperAdmin } from "@/src/lib/auth/authorization";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { revokeAllUserSessions } from "@/src/lib/auth/session";
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

    // 1. Lockout self-suspend check
    if (auth.memberId === targetMemberId) {
      return NextResponse.json({
        success: false,
        error: "This action cannot be completed. You cannot suspend your own session account."
      }, { status: 403 });
    }

    // 2. Protect the last active SUPER_ADMIN
    if (user.role === "SUPER_ADMIN") {
      const superAdminCount = await db.collection<UserDocument>("users").countDocuments({
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      });

      if (superAdminCount <= 1) {
        return NextResponse.json({
          success: false,
          error: "This action cannot be completed. NEXO requires at least one active Super Admin."
        }, { status: 400 });
      }
    }

    // Suspend user
    await db.collection("users").updateOne(
      { memberId: targetMemberId },
      { $set: { status: "SUSPENDED", updatedAt: new Date() } }
    );

    // Revoke all sessions for target user
    await revokeAllUserSessions(user.id);

    // Log Activity
    await logActivity({
      eventType: "ACCOUNT_SUSPENDED",
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
      previousValue: { status: user.status || "ACTIVE" },
      newValue: { status: "SUSPENDED" },
      metadata: { targetUserId: user.id },
    });

    return NextResponse.json({ success: true, message: "Account suspended and sessions revoked." });
  } catch (err: any) {
    console.error("POST /api/admin/members/[id]/suspend error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred suspending the account." }, { status: 500 });
  }
}
