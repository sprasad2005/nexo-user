import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireSuperAdmin, requireAdmin } from "@/src/lib/auth/authorization";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { hashPassword, normalizeEmail, validatePasswordStrength } from "@/src/lib/auth/password";
import { logActivity } from "@/src/features/activity/activityService";
import { MOCK_MEMBERS } from "@/lib/mockData";

const DB_NAME = "nexo";

// GET /api/admin/members
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const role = (searchParams.get("role") || "ALL").toUpperCase();
    const status = (searchParams.get("status") || "ALL").toUpperCase();
    const verification = (searchParams.get("verification") || "ALL").toUpperCase();
    const sortBy = searchParams.get("sortBy") || "recently_added"; // recently_added, last_login, name, role

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Fetch all users and members to merge
    const users = await db.collection<UserDocument>("users").find({}).toArray();
    let members = await db.collection<MemberDocument>("members").find({}).toArray();

    // Auto-seed if members collection is empty
    if (members.length === 0) {
      const seedMembers: MemberDocument[] = MOCK_MEMBERS.map((m) => ({
        id: m.id,
        name: m.name,
        username: (m as any).username || m.name.toLowerCase(),
        password: (m as any).password || (m.role === "SUPER_ADMIN" ? "super123" : m.role === "ADMIN" ? "admin123" : "user123"),
        email: m.email,
        avatar: m.avatar,
        role: m.role,
        status: (m as any).status || "ACTIVE",
        panMasked: m.panMasked,
        panFull: m.panFull || m.panMasked,
        defaultContribution: m.defaultContribution,
        joinedAt: m.joinedAt,
        phone: m.phone || "+91 98200 12345",
        permissions: {
          canSubmitApplications: true,
          canDistributeProfit: m.role === "SUPER_ADMIN" || m.role === "ADMIN",
          canEditIpos: m.role === "SUPER_ADMIN" || m.role === "ADMIN",
          canAccessAdminConsole: m.role === "SUPER_ADMIN" || m.role === "ADMIN",
          canManageMembers: m.role === "SUPER_ADMIN" || m.role === "ADMIN",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      try {
        await db.collection("members").insertMany(seedMembers as any);
        members = await db.collection<MemberDocument>("members").find({}).toArray();
      } catch {
        members = seedMembers as any;
      }
    }

    // Map by memberId, id, and username for efficient lookups
    const usersMap = new Map<string, UserDocument>();
    users.forEach((u) => {
      const uUsername = (u as any).username || (u as any).usernameOrEmail;
      if (u.memberId) usersMap.set(u.memberId, u);
      if (u.id) usersMap.set(u.id, u);
      if (uUsername) usersMap.set(uUsername, u);
    });

    const memberIdsSeen = new Set<string>();

    // Merge member and user details
    let merged = members.map((member) => {
      memberIdsSeen.add(member.id);
      if (member.username) memberIdsSeen.add(member.username);

      const user = usersMap.get(member.id) || usersMap.get(member.username);
      const isEmailVerified = user?.emailVerified || false;
      const isVerified = member.panMasked ? true : isEmailVerified;

      return {
        id: member.id,
        name: member.name,
        username: member.username,
        email: member.email,
        avatar: member.avatar,
        phone: member.phone,
        password: member.password || "",
        role: user?.role || member.role || "MEMBER",
        status: user?.status || "ACTIVE",
        isVerified: isVerified,
        lastLoginAt: user?.lastLoginAt || null,
        createdAt: member.createdAt || new Date(),
        mustChangePassword: user?.mustChangePassword || false,
      };
    });

    // Add any users present in users collection not present in members collection
    users.forEach((u) => {
      const uUsername = (u as any).username || (u as any).usernameOrEmail || "user";
      const uKey = u.memberId || u.id || uUsername;
      if (uKey && !memberIdsSeen.has(uKey) && !memberIdsSeen.has(uUsername)) {
        memberIdsSeen.add(uKey);
        merged.push({
          id: u.memberId || u.id || `mem_${Date.now()}`,
          name: (u as any).name || uUsername,
          username: uUsername,
          email: u.email || `${uUsername}@nexo.private`,
          avatar: (u as any).avatar || "/oggy.png",
          phone: (u as any).phone || "",
          password: "",
          role: u.role || "MEMBER",
          status: u.status || "ACTIVE",
          isVerified: u.emailVerified || false,
          lastLoginAt: u.lastLoginAt || null,
          createdAt: u.createdAt || new Date(),
          mustChangePassword: u.mustChangePassword || false,
        });
      }
    });

    // Filter
    if (search) {
      merged = merged.filter((m) => {
        const nameMatch = m.name.toLowerCase().includes(search);
        const usernameMatch = (m.username || "").toLowerCase().includes(search);
        const isInternalEmail = m.email.endsWith("@nexo.private") || m.email.endsWith("@nexo.io");
        const emailMatch = !isInternalEmail && m.email.toLowerCase().includes(search);
        return nameMatch || usernameMatch || emailMatch;
      });
    }

    if (role !== "ALL") {
      merged = merged.filter((m) => m.role === role);
    }

    if (status !== "ALL") {
      merged = merged.filter((m) => m.status === status);
    }

    if (verification !== "ALL") {
      const wantVerified = verification === "VERIFIED";
      merged = merged.filter((m) => m.isVerified === wantVerified);
    }

    // Sort
    const getPriority = (m: any): number => {
      const u = (m.username || m.name || "").toLowerCase().trim();
      if (m.role === "SUPER_ADMIN" || u === "ankitgod" || u === "ankit") return 1;
      if (u === "aanikett" || u.startsWith("aaniket") || u === "aniket") return 2;
      if (u === "shivam_p" || u.startsWith("shivam")) return 3;
      return 4;
    };

    merged.sort((a, b) => {
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;

      if (sortBy === "last_login") {
        const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "role") {
        return a.role.localeCompare(b.role);
      }
      // Default: recently_added
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, members: merged });
  } catch (err: any) {
    console.error("GET /api/admin/members error, providing resilient fallback:", err);
    const fallback = MOCK_MEMBERS.map((m) => ({
      id: m.id,
      name: m.name,
      username: (m as any).username || m.name.toLowerCase(),
      email: m.email,
      avatar: m.avatar,
      phone: m.phone || "+91 98200 12345",
      password: (m as any).password || "user123",
      role: m.role,
      status: (m as any).status || "ACTIVE",
      isVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      mustChangePassword: false,
    }));
    return NextResponse.json({ success: true, members: fallback });
  }
}

// POST /api/admin/members
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    const body = await req.json();

    const { name, role, email, phone, avatar } = body;
    let { username, password } = body;

    // Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Full name is required." }, { status: 400 });
    }

    // Auto-generate username from name if not provided
    if (!username || typeof username !== "string" || !username.trim()) {
      const baseUser = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 18);
      username = `${baseUser}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const cleanUsername = username.trim().toLowerCase();
    // Validate username format (lowercase, 3-24 characters, alphanumeric and underscore, no spaces)
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      return NextResponse.json({
        success: false,
        error: "Username must be 3-24 characters, lowercase, containing only letters, numbers, and underscores (no spaces)."
      }, { status: 400 });
    }

    // Auto-generate password if omitted
    if (!password || typeof password !== "string" || password.length < 6) {
      password = `Nexo@${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const assignedRole = role === "SUPER_ADMIN" && cleanUsername === "ankitgod" ? "SUPER_ADMIN" : "MEMBER";

    if (role === "SUPER_ADMIN" && cleanUsername !== "ankitgod") {
      return NextResponse.json({
        success: false,
        error: "Super Admin role is restricted to ankitgod only."
      }, { status: 400 });
    }

    const isEmailProvided = Boolean(email && typeof email === "string" && email.trim());
    const userEmail = isEmailProvided ? email.trim() : `${cleanUsername}@nexo.private`;
    const emailNorm = normalizeEmail(userEmail);

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Check username uniqueness first
    const existingMember = await db.collection<MemberDocument>("members").findOne({ username: cleanUsername });
    const existingUserByUsername = await db.collection<UserDocument>("users").findOne({
      $or: [{ username: cleanUsername }, { memberId: cleanUsername }]
    } as any);

    if (existingMember || existingUserByUsername) {
      return NextResponse.json({
        success: false,
        error: `Username '${cleanUsername}' is already taken. Please choose another username.`
      }, { status: 409 });
    }

    // Check email uniqueness only if custom email was provided
    if (isEmailProvided) {
      const existingUserByEmail = await db.collection<UserDocument>("users").findOne({ emailNormalized: emailNorm });
      if (existingUserByEmail) {
        return NextResponse.json({ success: false, error: "Email is already registered." }, { status: 409 });
      }
    }

    const memberId = `mem_${Date.now()}`;
    const userId = `usr_${Date.now()}`;

    // Hash password
    const passwordHash = hashPassword(password);

    const AVATARS = ["/oggy.png", "/jack.png", "/sinchan.png", "/doremon.png", "/japlu.png"];
    const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const chosenAvatar = avatar || randomAvatar;

    // Create Member Document
    const memberDoc: MemberDocument = {
      id: memberId,
      name: name.trim(),
      username: cleanUsername,
      password: password, // Store password so Super Admin can view it
      email: emailNorm,
      avatar: chosenAvatar,
      role: role as any,
      status: "ACTIVE",
      panMasked: "ABCDE1234F", // default dummy PAN for basic creation
      panFull: "ABCDE1234F",
      defaultContribution: 50000,
      joinedAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      phone: phone || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: {
        canSubmitApplications: true,
        canDistributeProfit: role === "SUPER_ADMIN" || role === "ADMIN",
        canEditIpos: role === "SUPER_ADMIN" || role === "ADMIN",
        canAccessAdminConsole: role === "SUPER_ADMIN" || role === "ADMIN",
        canManageMembers: role === "SUPER_ADMIN" || role === "ADMIN",
      }
    };

    // Create User Document
    const userDoc: UserDocument = {
      id: userId,
      email: userEmail,
      emailNormalized: emailNorm,
      passwordHash: passwordHash,
      memberId: memberId,
      role: role as any,
      status: "ACTIVE",
      emailVerified: true,
      mustChangePassword: true, // Force password change on first login
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create Profile Document for UI consistency
    const profileDoc = {
      userId: memberId,
      name: name.trim(),
      displayName: name.trim(),
      email: emailNorm,
      phone: phone || "+91 98200 12345",
      avatar: chosenAvatar,
      bio: `NEXO ${role} Profile`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Database
    await db.collection<MemberDocument>("members").insertOne(memberDoc as any);
    await db.collection<UserDocument>("users").insertOne(userDoc as any);
    await db.collection("profiles").insertOne(profileDoc);

    // Audit Event
    await logActivity({
      eventType: "MEMBER_CREATED",
      category: "SECURITY",
      severity: "INFO",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "MEMBER",
      targetId: memberId,
      targetName: name.trim(),
      metadata: { role, username: cleanUsername },
    });

    return NextResponse.json({
      success: true,
      message: "Member created successfully.",
      createdMember: {
        id: memberId,
        name: memberDoc.name,
        username: memberDoc.username,
        role: userDoc.role,
        status: userDoc.status,
      },
      // Return temporary password ONCE
      temporaryPassword: password,
    });
  } catch (err: any) {
    console.error("POST /api/admin/members error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred creating the member." }, { status: 500 });
  }
}
