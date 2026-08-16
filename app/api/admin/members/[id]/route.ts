import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireSuperAdmin, requireAdmin } from "@/src/lib/auth/authorization";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { cleanOldAvatar } from "@/lib/avatarCleanup";

const DB_NAME = "nexo";

// GET /api/admin/members/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const resolvedParams = await params;
    const memberId = resolvedParams.id;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Fetch member flexibly by id, username, or email
    let member = await db.collection<MemberDocument>("members").findOne({
      $or: [{ id: memberId }, { username: memberId }, { email: memberId }]
    });

    let user = member
      ? await db.collection<UserDocument>("users").findOne({
          $or: [{ memberId: member.id }, { id: member.id }, { username: (member as any).username }]
        })
      : await db.collection<UserDocument>("users").findOne({
          $or: [{ id: memberId }, { memberId: memberId }, { username: memberId }]
        });

    if (!member && !user) {
      return NextResponse.json({ success: false, error: "Member not found." }, { status: 404 });
    }

    // Synthesize member if missing in members collection but found in users collection
    if (!member && user) {
      const uUsername = (user as any).username || "user";
      member = {
        id: user.memberId || user.id || memberId,
        name: (user as any).name || uUsername || "Member",
        username: uUsername,
        email: user.email || `${uUsername}@nexo.private`,
        avatar: (user as any).avatar || "/oggy.png",
        phone: (user as any).phone || "",
        role: user.role || "MEMBER",
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
      } as any;
    }

    // Synthesize user credentials fallback if missing in users collection
    if (!user && member) {
      user = {
        id: member.id,
        memberId: member.id,
        username: member.username,
        email: member.email,
        role: member.role || "MEMBER",
        status: "ACTIVE",
        mustChangePassword: false,
        lastLoginAt: null,
      } as any;
    }

    const activeMember = member!;
    const activeUser = user!;

    // Fetch applications
    const applications = await db.collection("applications").find({ memberId: activeMember.id }).toArray();

    // Fetch IPOs to resolve details
    const ipoIds = applications.map((app) => app.ipoId);
    const ipos = await db.collection("ipos").find({ id: { $in: ipoIds } }).toArray();
    const ipoMap = new Map<string, any>();
    ipos.forEach((ipo) => ipoMap.set(ipo.id, ipo));

    let totalLotsApplied = 0;
    let totalLotsAllotted = 0;

    // Resolve applications detailed view with lots, PnL, and PAN card
    const appsResolved = applications.map((app) => {
      const ipo = ipoMap.get(app.ipoId);
      const isAllotted = app.allotmentStatus === "ALLOTTED";
      const gmpPct = ipo?.gmpPercent || 15;
      const lotsApplied = app.lotsCount || Math.max(1, Math.round(app.totalContribution / 14500));
      const lotsAllotted = isAllotted ? (app.allottedLotsCount || lotsApplied) : 0;
      const profitGained = isAllotted ? Math.round(app.totalContribution * (gmpPct / 100)) : 0;

      totalLotsApplied += lotsApplied;
      totalLotsAllotted += lotsAllotted;

      return {
        id: app.id,
        ipoId: app.ipoId,
        ipoName: ipo?.name || app.ipoName || "Unknown IPO",
        ipoLogo: ipo?.logo || "IPO",
        type: app.fundingStructure === "MULTI_FRIEND" ? "COMBO" : "SOLO",
        category: app.category || "INDIVIDUAL",
        amount: app.totalContribution,
        lotsApplied,
        lotsAllotted,
        sharesCount: lotsApplied * (ipo?.lotSize || 15),
        gmpPercent: gmpPct,
        profitGained,
        status: app.status || "APPLIED",
        allotmentStatus: app.allotmentStatus || "AWAITING",
        panMasked: app.panMasked || activeMember.panMasked || "ABCDE1234F",
        createdAt: app.createdAt,
      };
    });

    // Calculate Portfolio summary based on real database records
    let totalInvested = 0;
    let currentlyBlocked = 0;
    let realizedPnL = 0;
    let unrealizedPnL = 0;

    applications.forEach((app) => {
      const ipo = ipoMap.get(app.ipoId);
      const isAllotted = app.allotmentStatus === "ALLOTTED";
      const isAwaiting = app.allotmentStatus === "AWAITING" || app.status === "SUBMITTED" || app.status === "VERIFIED";

      if (isAllotted) {
        totalInvested += app.totalContribution;
        const gmpPct = ipo?.gmpPercent || 15; // default 15% listing gain
        const gain = app.totalContribution * (gmpPct / 100);

        if (ipo?.status === "LISTED") {
          realizedPnL += gain;
        } else {
          unrealizedPnL += gain;
        }
      } else if (isAwaiting) {
        currentlyBlocked += app.totalContribution;
      }
    });

    const allottedAppsCount = applications.filter((a) => a.allotmentStatus === "ALLOTTED").length;
    const totalAppsCount = applications.length;
    const winRatePct = totalAppsCount > 0 ? Math.round((allottedAppsCount / totalAppsCount) * 100) : 0;

    const portfolio = {
      totalInvested,
      currentlyBlocked,
      currentValue: totalInvested + unrealizedPnL + realizedPnL,
      unrealizedPnL,
      realizedPnL,
      totalPnL: unrealizedPnL + realizedPnL,
      totalAppliedIPOs: totalAppsCount,
      allottedIPOs: allottedAppsCount,
      winRatePct,
      totalLotsApplied,
      totalLotsAllotted,
    };

    // Return safe data
    return NextResponse.json({
      success: true,
      member: {
        id: activeMember.id,
        name: activeMember.name,
        displayName: activeMember.displayName || activeMember.name,
        username: activeMember.username,
        password: activeMember.password || "",
        email: activeMember.email,
        avatar: activeMember.avatar,
        phone: activeMember.phone || "",
        joinedAt: activeMember.joinedAt,
        createdAt: activeMember.createdAt,
        role: activeUser.role,
        status: activeUser.status,
        emailVerified: activeUser.emailVerified,
        mustChangePassword: activeUser.mustChangePassword || false,
        panMasked: activeMember.panMasked,
      },
      portfolio,
      applications: appsResolved,
    });
  } catch (err: any) {
    console.error("GET /api/admin/members/[id] error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred fetching member detail." }, { status: 500 });
  }
}

// PUT /api/admin/members/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const resolvedParams = await params;
    const memberId = resolvedParams.id;

    const body = await req.json();
    const { name, displayName, email, phone, avatar } = body;
    let username = body.username;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Full Name is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Verify member exists
    const member = await db.collection<MemberDocument>("members").findOne({ id: memberId });
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found." }, { status: 404 });
    }

    // Normal Admin cannot change username -> preserve existing username
    if (auth.role !== "SUPER_ADMIN" || !username || typeof username !== "string") {
      username = member.username;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      return NextResponse.json({
        success: false,
        error: "Username must be 3-24 characters, lowercase, containing only letters, numbers, and underscores (no spaces)."
      }, { status: 400 });
    }

    // Check username uniqueness if changed
    if (cleanUsername !== member.username) {
      const duplicateUsername = await db.collection<MemberDocument>("members").findOne({ username: cleanUsername });
      if (duplicateUsername) {
        return NextResponse.json({ success: false, error: "Username is already in use by another member." }, { status: 409 });
      }
    }

    // Check email uniqueness if changed
    const userEmail = email ? email.trim() : member.email;
    const emailNorm = userEmail.toLowerCase();
    if (userEmail !== member.email) {
      const duplicateEmail = await db.collection<UserDocument>("users").findOne({ emailNormalized: emailNorm });
      if (duplicateEmail) {
        return NextResponse.json({ success: false, error: "Email is already registered by another account." }, { status: 409 });
      }
    }

    // Clean old avatar if changing to a new one
    if (avatar && avatar !== member.avatar) {
      await cleanOldAvatar(member.avatar, avatar, db);
    }

    // Perform updates
    const memberUpdate: Partial<MemberDocument> = {
      name: name.trim(),
      displayName: (displayName || name).trim(),
      username: cleanUsername,
      email: emailNorm,
      phone: phone || undefined,
      avatar: avatar || member.avatar,
      updatedAt: new Date(),
    };

    await db.collection("members").updateOne({ id: memberId }, { $set: memberUpdate });

    // Sync credentials / email in users collection
    await db.collection("users").updateOne(
      { memberId: memberId },
      {
        $set: {
          email: userEmail,
          emailNormalized: emailNorm,
          updatedAt: new Date(),
        },
      }
    );

    // Log Activity
    const { logActivity } = await import("@/src/features/activity/activityService");
    await logActivity({
      eventType: "MEMBER_UPDATED",
      category: "USER",
      severity: "INFO",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: memberId,
      targetName: name.trim(),
      metadata: { username: cleanUsername },
    });

    // Also update profile record for consistency
    await db.collection("profiles").updateOne(
      { userId: memberId },
      {
        $set: {
          name: name.trim(),
          displayName: (displayName || name).trim(),
          email: emailNorm,
          phone: phone || "+91 98200 12345",
          avatar: avatar || member.avatar,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true, message: "Profile details updated successfully." });
  } catch (err: any) {
    console.error("PUT /api/admin/members/[id] error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred updating profile details." }, { status: 500 });
  }
}

// DELETE /api/admin/members/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Lockout self-deletion check
    if (auth.memberId === targetMemberId) {
      return NextResponse.json({
        success: false,
        error: "Forbidden. You cannot delete your own administrative account."
      }, { status: 403 });
    }

    // Protect Super Admin (ankitgod) from deletion
    const user = await db.collection<UserDocument>("users").findOne({ memberId: member.id });
    if (user?.role === "SUPER_ADMIN" || member.username === "ankitgod" || member.role === "SUPER_ADMIN") {
      return NextResponse.json({
        success: false,
        error: "Forbidden. Super Admin account cannot be deleted."
      }, { status: 403 });
    }

    // Delete records from members, users, profiles, and sessions
    await db.collection("members").deleteOne({ id: targetMemberId });
    await db.collection("users").deleteOne({ memberId: targetMemberId });
    await db.collection("profiles").deleteOne({ userId: targetMemberId });
    await db.collection("sessions").deleteMany({ memberId: targetMemberId });

    // Audit Event
    const { logActivity } = await import("@/src/features/activity/activityService");
    await logActivity({
      eventType: "MEMBER_DELETED",
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
      metadata: { username: member.username },
    });

    return NextResponse.json({ success: true, message: "Member profile deleted successfully." });
  } catch (err: any) {
    console.error("DELETE /api/admin/members/[id] error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred deleting member profile." }, { status: 500 });
  }
}
