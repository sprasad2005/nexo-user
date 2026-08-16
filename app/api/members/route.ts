import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { MemberDocument } from "@/src/models/Member";
import { MOCK_MEMBERS } from "@/lib/mockData";
import { MemberPermissions } from "@/types/nexo";
import { logActivity } from "@/src/features/activity/activityService";
import { cleanOldAvatar } from "@/lib/avatarCleanup";

const DB = "nexo";
const COL = "members";

function getDefaultPermissions(role: string): MemberPermissions {
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  return {
    canSubmitApplications: true,
    canDistributeProfit: isAdmin,
    canEditIpos: isAdmin,
    canAccessAdminConsole: isAdmin,
    canManageMembers: isAdmin,
  };
}

/* ────────────────────────────────────────────────────────────────
   GET /api/members
   Fetches all group members & credentials from MongoDB.
──────────────────────────────────────────────────────────────── */
export async function GET() {
  try {
    const client = await clientPromise;
    const col = client.db(DB).collection<MemberDocument>(COL);

    let members = await col.find({}).toArray();

    /* Seed default mock members if empty */
    if (members.length === 0) {
      const seedMembers: MemberDocument[] = MOCK_MEMBERS.map((m) => ({
        id: m.id,
        name: m.name,
        username: (m as any).username || m.name.toLowerCase(),
        password: (m as any).password || (m.role === "ADMIN" ? "admin123" : "user123"),
        email: m.email,
        avatar: m.avatar,
        role: m.role,
        status: (m as any).status || "ACTIVE",
        panMasked: m.panMasked,
        panFull: m.panFull || m.panMasked,
        defaultContribution: m.defaultContribution,
        joinedAt: m.joinedAt,
        phone: m.phone,
        permissions: getDefaultPermissions(m.role),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      try {
        await col.insertMany(seedMembers as any);
        members = await col.find({}).toArray();
      } catch (e) {
        members = seedMembers as any;
      }
    }

    const getPriority = (m: any): number => {
      const u = (m.username || m.name || "").toLowerCase().trim();
      if (m.role === "SUPER_ADMIN" || u === "ankitgod" || u === "ankit") return 1;
      if (u === "aanikett" || u.startsWith("aaniket") || u === "aniket") return 2;
      if (u === "shivam_p" || u.startsWith("shivam")) return 3;
      return 4;
    };

    members.sort((a: any, b: any) => {
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return (a.name || "").localeCompare(b.name || "");
    });

    return NextResponse.json(
      { success: true, members },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (err: any) {
    console.warn("GET /api/members MongoDB unavailable, returning mock members fallback.");
    const fallback = [...MOCK_MEMBERS].sort((a: any, b: any) => {
      const getPriority = (m: any): number => {
        const u = (m.username || m.name || "").toLowerCase().trim();
        if (m.role === "SUPER_ADMIN" || u === "ankitgod" || u === "ankit") return 1;
        if (u === "aanikett" || u.startsWith("aaniket") || u === "aniket") return 2;
        if (u === "shivam_p" || u.startsWith("shivam")) return 3;
        return 4;
      };
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return (a.name || "").localeCompare(b.name || "");
    });
    return NextResponse.json({ success: true, members: fallback });
  }
}

/* ────────────────────────────────────────────────────────────────
   POST /api/members
   Creates a new user / member with assigned Username, Password, Role, Status & Permissions.
──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || !body.name) {
      return NextResponse.json({ success: false, error: "Missing required member fields" }, { status: 400 });
    }

    const role = body.role || "MEMBER";

    const newMember: MemberDocument = {
      id: body.id || `mem_${Date.now()}`,
      name: body.name,
      username: (body.username || body.name.toLowerCase().replace(/\s+/g, "")).toLowerCase(),
      password: body.password || "user123",
      email: body.email || `${body.username || "user"}@nexo.private`,
      avatar: body.avatar || "/oggy.png",
      role: role,
      status: body.status || "ACTIVE",
      panMasked: body.panMasked || body.panFull || "ABCDE1234F",
      panFull: body.panFull || body.panMasked || "ABCDE1234F",
      defaultContribution: Number(body.defaultContribution) || 50000,
      joinedAt: body.joinedAt || "Just now",
      phone: body.phone || "+91 98765 43210",
      upiId: body.upiId,
      permissions: body.permissions || getDefaultPermissions(role),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const client = await clientPromise;
      const col = client.db(DB).collection<MemberDocument>(COL);
      await col.insertOne(newMember as any);

      // Also provision User Account in nexo.users for authentication
      const usersCol = client.db(DB).collection("users");
      const { hashPassword, normalizeEmail } = await import("@/src/lib/auth/password");
      const userEmail = newMember.email;
      const emailNorm = normalizeEmail(userEmail);
      const passwordHash = hashPassword(newMember.password || "user123");

      await usersCol.updateOne(
        { emailNormalized: emailNorm },
        {
          $set: {
            id: `usr_${Date.now()}`,
            email: userEmail,
            emailNormalized: emailNorm,
            passwordHash: passwordHash,
            memberId: newMember.id,
            role: newMember.role,
            status: newMember.status || "ACTIVE",
            emailVerified: true,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      // Automatically join newly created member to IPO Investor Group chat
      const convCol = client.db(DB).collection("conversations");
      const convMemberCol = client.db(DB).collection("conversationMembers");
      const now = new Date();

      const ipoGroupId = "conv_grp_main";
      let ipoGroup = await convCol.findOne({ title: "IPO Investor" });
      if (!ipoGroup) {
        const newGroupDoc = {
          id: ipoGroupId,
          type: "GROUP",
          title: "IPO Investor",
          avatar: "/oggy.png",
          createdBy: "mem_admin",
          lastMessage: "Welcome to the IPO Investor Group Chat!",
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now,
        };
        await convCol.insertOne(newGroupDoc);
      }

      await convMemberCol.updateOne(
        { conversationId: ipoGroupId, memberId: newMember.id },
        {
          $set: {
            id: `cm_${ipoGroupId}_${newMember.id}`,
            conversationId: ipoGroupId,
            memberId: newMember.id,
            role: "MEMBER",
            joinedAt: now,
            lastReadAt: now,
          },
        },
        { upsert: true }
      );
    } catch (dbErr) {
      console.warn("POST /api/members MongoDB unavailable, continuing with local store.");
    }

    // Audit log — MEMBER_CREATED
    await logActivity({
      eventType: "MEMBER_CREATED",
      category: "USER",
      targetType: "MEMBER",
      targetId: newMember.id,
      targetName: newMember.name,
      memberId: newMember.id,
      metadata: { role: newMember.role, username: newMember.username },
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully.",
      member: newMember,
    });
  } catch (err: any) {
    console.error("POST /api/members error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────
   PUT /api/members
   Updates an existing member's credentials, status, role or permissions.
──────────────────────────────────────────────────────────────── */
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id) {
      return NextResponse.json({ success: false, error: "Missing member ID" }, { status: 400 });
    }

    const updateDoc: Record<string, any> = { updatedAt: new Date() };
    const allowed = [
      "name",
      "username",
      "password",
      "email",
      "avatar",
      "role",
      "status",
      "panMasked",
      "panFull",
      "defaultContribution",
      "phone",
      "upiId",
      "permissions",
      "sessionsRevokedAt",
      "lastLoginAt",
    ];

    for (const key of allowed) {
      if (key in body) updateDoc[key] = body[key];
    }

    try {
      const client = await clientPromise;
      const db = client.db(DB);
      const col = db.collection<MemberDocument>(COL);

      // Clean old avatar if changing to a new one
      if (body.avatar) {
        const existingMember = await col.findOne({ id: body.id });
        if (existingMember?.avatar && existingMember.avatar !== body.avatar) {
          await cleanOldAvatar(existingMember.avatar, body.avatar, db);
        }
      }

      await col.updateOne({ id: body.id }, { $set: updateDoc });

      // Sync user auth credentials if username/password/role/status modified
      if (body.password || body.role || body.status || body.email) {
        const usersCol = client.db(DB).collection("users");
        const { hashPassword, normalizeEmail } = await import("@/src/lib/auth/password");
        const member = await col.findOne({ id: body.id });
        if (member) {
          const userEmail = member.email;
          const emailNorm = normalizeEmail(userEmail);
          const userUpdate: Record<string, any> = { updatedAt: new Date() };

          if (body.role) userUpdate.role = body.role;
          if (body.status) userUpdate.status = body.status;
          if (body.password) userUpdate.passwordHash = hashPassword(body.password);

          await usersCol.updateOne(
            { $or: [{ memberId: body.id }, { emailNormalized: emailNorm }] },
            { $set: userUpdate }
          );
        }
      }
    } catch (dbErr) {
      console.warn("PUT /api/members MongoDB unavailable, continuing with local store.");
    }

    // Audit log — MEMBER_UPDATED or ROLE_CHANGED
    if (body.role) {
      await logActivity({
        eventType: "ROLE_CHANGED",
        category: "SECURITY",
        targetType: "MEMBER",
        targetId: body.id,
        memberId: body.id,
        previousValue: body.previousRole ? { role: body.previousRole } : undefined,
        newValue: { role: body.role },
        metadata: { memberId: body.id },
      });
    } else {
      await logActivity({
        eventType: "MEMBER_UPDATED",
        category: "USER",
        targetType: "MEMBER",
        targetId: body.id,
        memberId: body.id,
        metadata: { updatedFields: Object.keys(updateDoc).filter((k) => k !== "updatedAt") },
      });
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully.",
    });
  } catch (err: any) {
    console.error("PUT /api/members error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
