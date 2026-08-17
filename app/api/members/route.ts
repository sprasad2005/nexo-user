import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { MemberDocument } from "@/src/models/Member";
import { MOCK_MEMBERS } from "@/lib/mockData";
import { MemberPermissions } from "@/types/nexo";
import { logActivity } from "@/src/features/activity/activityService";
import { cleanOldAvatar } from "@/lib/avatarCleanup";
import {
  normalizePan,
  isValidPan,
  normalizePhone,
  isValidPhone,
  handleDuplicateKeyError,
} from "@/src/lib/validation/uniqueness";

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

    let members = await col.find({}, {
      projection: {
        password: 0,
        passwordHash: 0,
      }
    }).toArray();

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
    const cleanUsername = (body.username || body.name.toLowerCase().replace(/\s+/g, "")).toLowerCase().trim();

    // ── PAN VALIDATION & NORMALIZATION ──
    const rawPan = body.panFull || body.panMasked || body.pan || "";
    let panNormalized: string | undefined = undefined;
    if (rawPan && typeof rawPan === "string" && rawPan.trim()) {
      if (!isValidPan(rawPan)) {
        return NextResponse.json({
          success: false,
          code: "INVALID_PAN",
          error: "Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).",
          message: "Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).",
        }, { status: 400 });
      }
      panNormalized = normalizePan(rawPan);
    }

    // ── PHONE VALIDATION & NORMALIZATION ──
    const rawPhone = body.phone || "";
    let phoneNormalized: string | undefined = undefined;
    if (rawPhone && typeof rawPhone === "string" && rawPhone.trim()) {
      if (!isValidPhone(rawPhone)) {
        return NextResponse.json({
          success: false,
          code: "INVALID_PHONE",
          error: "Please enter a valid phone number.",
          message: "Please enter a valid phone number.",
        }, { status: 400 });
      }
      phoneNormalized = normalizePhone(rawPhone);
    }

    const client = await clientPromise;
    const col = client.db(DB).collection<MemberDocument>(COL);

    // ── Pre-flight Uniqueness Checks ──
    const existingUser = await col.findOne({ username: cleanUsername });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        code: "DUPLICATE_USERNAME",
        error: `Username '${cleanUsername}' is already taken.`,
        message: `Username '${cleanUsername}' is already taken.`,
      }, { status: 409 });
    }

    if (panNormalized) {
      const existingPan = await col.findOne({ panNormalized });
      if (existingPan) {
        return NextResponse.json({
          success: false,
          code: "DUPLICATE_PAN",
          error: `PAN number '${panNormalized}' is already registered to member '${existingPan.name}'.`,
          message: "This PAN number is already registered to another member.",
        }, { status: 409 });
      }
    }

    if (phoneNormalized) {
      const existingPhone = await col.findOne({ phoneNormalized });
      if (existingPhone) {
        return NextResponse.json({
          success: false,
          code: "DUPLICATE_PHONE",
          error: `Phone number '${phoneNormalized}' is already registered to member '${existingPhone.name}'.`,
          message: "This phone number is already registered to another member.",
        }, { status: 409 });
      }
    }

    const newMember: MemberDocument = {
      id: body.id || `mem_${Date.now()}`,
      name: body.name.trim(),
      username: cleanUsername,
      password: body.password || "user123",
      email: body.email || `${cleanUsername}@nexo.private`,
      avatar: body.avatar || "/oggy.png",
      role: role,
      status: body.status || "ACTIVE",
      panMasked: panNormalized || "ABCDE1234F",
      panFull: panNormalized || "ABCDE1234F",
      panNormalized: panNormalized,
      defaultContribution: Number(body.defaultContribution) || 50000,
      joinedAt: body.joinedAt || "Just now",
      phone: phoneNormalized || body.phone || undefined,
      phoneNormalized: phoneNormalized,
      upiId: body.upiId,
      permissions: body.permissions || getDefaultPermissions(role),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
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
            panNormalized: panNormalized,
            phoneNormalized: phoneNormalized,
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
    } catch (dbErr: any) {
      console.warn("POST /api/members insert warning:", dbErr);
      const dupError = handleDuplicateKeyError(dbErr);
      if (dupError) {
        return NextResponse.json({
          success: false,
          code: dupError.code,
          error: dupError.message,
          message: dupError.message,
        }, { status: 409 });
      }
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
    const dupError = handleDuplicateKeyError(err);
    if (dupError) {
      return NextResponse.json({
        success: false,
        code: dupError.code,
        error: dupError.message,
        message: dupError.message,
      }, { status: 409 });
    }
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

    const client = await clientPromise;
    const db = client.db(DB);
    const col = db.collection<MemberDocument>(COL);

    // ── PAN VALIDATION & UNIQUENESS ──
    const rawPan = body.panFull || body.panMasked || body.pan;
    let panNormalized: string | undefined = undefined;
    if (rawPan !== undefined && rawPan !== null) {
      const panStr = String(rawPan).trim();
      if (panStr) {
        if (!isValidPan(panStr)) {
          return NextResponse.json({
            success: false,
            code: "INVALID_PAN",
            error: "Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).",
            message: "Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).",
          }, { status: 400 });
        }
        panNormalized = normalizePan(panStr);

        const dupPan = await col.findOne({
          id: { $ne: body.id },
          panNormalized: panNormalized,
        });
        if (dupPan) {
          return NextResponse.json({
            success: false,
            code: "DUPLICATE_PAN",
            error: `PAN number '${panNormalized}' is already registered to member '${dupPan.name}'.`,
            message: "This PAN number is already registered to another member.",
          }, { status: 409 });
        }
      }
    }

    // ── PHONE VALIDATION & UNIQUENESS ──
    let phoneNormalized: string | undefined = undefined;
    if (body.phone !== undefined && body.phone !== null) {
      const phoneStr = String(body.phone).trim();
      if (phoneStr) {
        if (!isValidPhone(phoneStr)) {
          return NextResponse.json({
            success: false,
            code: "INVALID_PHONE",
            error: "Please enter a valid phone number.",
            message: "Please enter a valid phone number.",
          }, { status: 400 });
        }
        phoneNormalized = normalizePhone(phoneStr);

        const dupPhone = await col.findOne({
          id: { $ne: body.id },
          phoneNormalized: phoneNormalized,
        });
        if (dupPhone) {
          return NextResponse.json({
            success: false,
            code: "DUPLICATE_PHONE",
            error: `Phone number '${phoneNormalized}' is already registered to member '${dupPhone.name}'.`,
            message: "This phone number is already registered to another member.",
          }, { status: 409 });
        }
      }
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
      "defaultContribution",
      "upiId",
      "permissions",
      "sessionsRevokedAt",
      "lastLoginAt",
    ];

    for (const key of allowed) {
      if (key in body) updateDoc[key] = body[key];
    }

    if (panNormalized !== undefined) {
      updateDoc.panNormalized = panNormalized;
      updateDoc.panFull = panNormalized;
      updateDoc.panMasked = panNormalized;
    }
    if (phoneNormalized !== undefined) {
      updateDoc.phoneNormalized = phoneNormalized;
      updateDoc.phone = phoneNormalized;
    } else if (body.phone !== undefined) {
      updateDoc.phone = body.phone;
    }

    try {
      // Clean old avatar if changing to a new one
      if (body.avatar) {
        const existingMember = await col.findOne({ id: body.id });
        if (existingMember?.avatar && existingMember.avatar !== body.avatar) {
          await cleanOldAvatar(existingMember.avatar, body.avatar, db);
        }
      }

      await col.updateOne({ id: body.id }, { $set: updateDoc });

      // Sync user auth credentials if username/password/role/status modified
      if (body.password || body.role || body.status || body.email || panNormalized || phoneNormalized) {
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
          if (panNormalized) userUpdate.panNormalized = panNormalized;
          if (phoneNormalized) userUpdate.phoneNormalized = phoneNormalized;

          await usersCol.updateOne(
            { $or: [{ memberId: body.id }, { emailNormalized: emailNorm }] },
            { $set: userUpdate }
          );
        }
      }
    } catch (dbErr: any) {
      console.warn("PUT /api/members MongoDB update warning:", dbErr);
      const dupError = handleDuplicateKeyError(dbErr);
      if (dupError) {
        return NextResponse.json({
          success: false,
          code: dupError.code,
          error: dupError.message,
          message: dupError.message,
        }, { status: 409 });
      }
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
    const dupError = handleDuplicateKeyError(err);
    if (dupError) {
      return NextResponse.json({
        success: false,
        code: dupError.code,
        error: dupError.message,
        message: dupError.message,
      }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
