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

    const body = await req.json();
    const { role } = body; // MEMBER, ADMIN, SUPER_ADMIN

    if (!role || !["MEMBER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "A valid role is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Verify member exists
    const member = await db.collection<MemberDocument>("members").findOne({ id: targetMemberId });
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found." }, { status: 404 });
    }

    if (role === "SUPER_ADMIN" && member.username !== "ankitgod") {
      return NextResponse.json({
        success: false,
        error: "Super Admin role is restricted to ankitgod only."
      }, { status: 400 });
    }

    // Verify user credentials exist
    const user = await db.collection<UserDocument>("users").findOne({ memberId: member.id });
    if (!user) {
      return NextResponse.json({ success: false, error: "User credentials not found." }, { status: 404 });
    }

    const currentRole = user.role;

    // 1. Lockout self-modification check
    if (auth.memberId === targetMemberId) {
      return NextResponse.json({
        success: false,
        error: "This action cannot be completed. You cannot modify your own administrative role."
      }, { status: 403 });
    }

    // 2. Protect the last active SUPER_ADMIN
    if (currentRole === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
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

    const isAdminOrSuper = role === "ADMIN" || role === "SUPER_ADMIN";

    // Perform role update across both users and members atomically
    await Promise.all([
      db.collection<UserDocument>("users").updateOne(
        { memberId: targetMemberId },
        { $set: { role: role as any, updatedAt: new Date() } }
      ),
      db.collection<MemberDocument>("members").updateOne(
        { id: targetMemberId },
        {
          $set: {
            role: role as any,
            updatedAt: new Date(),
            permissions: {
              canSubmitApplications: true,
              canDistributeProfit: isAdminOrSuper,
              canEditIpos: isAdminOrSuper,
              canAccessAdminConsole: isAdminOrSuper,
              canManageMembers: isAdminOrSuper,
            },
          },
        }
      ),
    ]);

    // Log Activity
    await logActivity({
      eventType: "ROLE_CHANGED",
      category: "SECURITY",
      severity: "CRITICAL",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: targetMemberId,
      targetName: member.name,
      previousValue: { role: currentRole },
      newValue: { role: role },
    });

    return NextResponse.json({ success: true, message: `Role changed successfully to ${role}.` });
  } catch (err: any) {
    console.error("POST /api/admin/members/[id]/role error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred updating user role." }, { status: 500 });
  }
}
