import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { verifyPassword, verifyPasswordWithSalt, hashPassword } from "@/src/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME, ABSOLUTE_EXPIRATION_MS } from "@/src/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/src/lib/auth/rateLimit";
import { recordSecurityEvent } from "@/src/lib/auth/security";
import { getSafeAvatarUrl } from "@/lib/avatarHelper";

const DB_NAME = "nexo";

function isAdminRole(role?: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Accept context to distinguish user vs admin login attempt
    const context: "USER" | "ADMIN" = body.context === "ADMIN" ? "ADMIN" : "USER";

    // Accept usernameOrEmail, email, or username fields
    const identifierRaw = (body.usernameOrEmail || body.username || body.email || "").trim();
    const passwordRaw   = (body.password || "").trim();

    const userAgent  = req.headers.get("user-agent") || undefined;
    const ipAddress  = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    if (!identifierRaw || !passwordRaw) {
      return NextResponse.json(
        { success: false, error: "Please enter your credentials." },
        { status: 400 }
      );
    }

    const identifier = identifierRaw.toLowerCase().replace(/^@+/, "");

    // ── Rate Limiting ───────────────────────────────────────────
    const rateLimitKey      = `${context.toLowerCase()}_login:${identifier}`;
    const rateLimitMax      = context === "ADMIN" ? 5 : 10;
    const rateLimitWindowMs = 15 * 60 * 1000;

    const rateCheck = checkRateLimit(rateLimitKey, rateLimitMax, rateLimitWindowMs);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Please try again in ${rateCheck.retryAfterSecs} seconds.`,
        },
        { status: 429 }
      );
    }

    const client = await clientPromise;
    const db     = client.db(DB_NAME);

    // ── Super Admin Username Matching Alias ────────────────
    const isSuperAdminAlias = ["ankitgod", "aniketgod", "anikitgod"].includes(identifier);
    const escapedIdentifier = escapeRegex(identifier);

    // ── Resolve Member & User dynamically from MongoDB ──────────
    // 1. Check members collection first
    let member: (MemberDocument & { passwordHash?: string; salt?: string; status?: string }) | null = await db
      .collection<MemberDocument>("members")
      .findOne({
        $or: [
          { username: { $regex: new RegExp(`^@?${escapedIdentifier}$`, "i") } },
          { email: { $regex: new RegExp(`^${escapedIdentifier}$`, "i") } },
          { name: { $regex: new RegExp(`^${escapedIdentifier}$`, "i") } },
          { displayName: { $regex: new RegExp(`^${escapedIdentifier}$`, "i") } },
          { id: identifier },
          ...(isSuperAdminAlias ? [{ role: "SUPER_ADMIN" as const }] : []),
        ],
      }) as any;

    // 2. Check users collection
    let user: (UserDocument & { password?: string; status?: string }) | null = null;
    if (member) {
      user = await db.collection<UserDocument>("users").findOne({
        $or: [
          { memberId: member.id },
          { id: member.id },
          { id: `usr_${member.id.replace(/^mem_/, "")}` },
          { emailNormalized: (member.email || "").toLowerCase() },
          { username: { $regex: new RegExp(`^@?${escapedIdentifier}$`, "i") } },
        ],
      }) as any;
    } else {
      user = await db.collection<UserDocument>("users").findOne({
        $or: [
          { username: { $regex: new RegExp(`^@?${escapedIdentifier}$`, "i") } },
          { emailNormalized: identifier },
          { email: { $regex: new RegExp(`^${escapedIdentifier}$`, "i") } },
          { memberId: identifier },
          { id: identifier },
          ...(isSuperAdminAlias ? [{ role: "SUPER_ADMIN" as const }] : []),
        ],
      }) as any;

      if (user) {
        member = await db.collection<MemberDocument>("members").findOne({
          $or: [
            { id: user.memberId },
            { id: user.id },
            { email: user.email },
            { username: (user as any).username },
          ],
        }) as any;
      }
    }

    const failedLoginEvent = context === "ADMIN" ? "ADMIN_LOGIN_FAILED" : "USER_LOGIN_FAILED";

    // If neither member nor user was found in MongoDB
    if (!member && !user) {
      await recordSecurityEvent(failedLoginEvent, {
        email: identifier,
        ipAddress,
        loginContext: context,
      });
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // ── Auto-Sync Member / User Documents in MongoDB ────────────
    if (member && !user) {
      const memberPass = member.password || member.passwordHash || passwordRaw;
      const passHash = memberPass && memberPass.includes(":") ? memberPass : hashPassword(memberPass || passwordRaw);
      const isMemSuspended = String((member as any).status || "").toUpperCase() === "SUSPENDED" ||
                             String((member as any).status || "").toUpperCase() === "INACTIVE" ||
                             String((member as any).status || "").toUpperCase() === "BLOCKED";

      const newUserDoc: UserDocument = {
        id: `usr_${member.id.replace(/^mem_/, "")}`,
        memberId: member.id,
        email: member.email || `${(member.username || member.name || "user").toLowerCase().replace(/\s+/g, "_")}@nexo.private`,
        emailNormalized: (member.email || `${(member.username || member.name || "user").toLowerCase().replace(/\s+/g, "_")}@nexo.private`).toLowerCase(),
        passwordHash: passHash,
        emailVerified: true,
        role: member.role || "MEMBER",
        status: isMemSuspended ? "DISABLED" : "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (newUserDoc as any).username = member.username || (member.name || "").toLowerCase().replace(/\s+/g, "_");

      await db.collection<UserDocument>("users").updateOne(
        { id: newUserDoc.id },
        { $set: newUserDoc },
        { upsert: true }
      );
      user = newUserDoc as any;
    } else if (user && !member) {
      const userNameStr = (user as any).username || user.email.split("@")[0];
      const newMemberDoc: MemberDocument = {
        id: user.memberId || user.id.replace(/^usr_/, "mem_"),
        name: userNameStr,
        username: userNameStr,
        email: user.email,
        avatar: "/oggy.png",
        role: user.role || "MEMBER",
        defaultContribution: 15000,
        joinedAt: "Jan 2025",
        password: passwordRaw,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (newMemberDoc as any).status = user.status === "DISABLED" ? "SUSPENDED" : "ACTIVE";
      await db.collection<MemberDocument>("members").updateOne(
        { id: newMemberDoc.id },
        { $set: newMemberDoc },
        { upsert: true }
      );
      member = newMemberDoc as any;
    }

    if (!user || !member) {
      await recordSecurityEvent(failedLoginEvent, {
        email: identifier,
        ipAddress,
        loginContext: context,
      });
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // ── Check Account Status (Active vs Suspended / Inactive) ────
    const userStatusUpper = String(user.status || "").toUpperCase();
    const memberStatusUpper = String((member as any).status || "").toUpperCase();

    const isSuspended =
      userStatusUpper === "DISABLED" ||
      userStatusUpper === "SUSPENDED" ||
      userStatusUpper === "INACTIVE" ||
      userStatusUpper === "BLOCKED" ||
      memberStatusUpper === "DISABLED" ||
      memberStatusUpper === "SUSPENDED" ||
      memberStatusUpper === "INACTIVE" ||
      memberStatusUpper === "BLOCKED";

    if (isSuspended) {
      await recordSecurityEvent(failedLoginEvent, {
        email: user.email || identifier,
        ipAddress,
        loginContext: context,
      });
      return NextResponse.json(
        { success: false, error: "Your account is inactive or suspended. Please contact support." },
        { status: 403 }
      );
    }

    // ── Credential Verification (Salted Hash & Assigned Passwords) ─
    let isPasswordValid = false;

    // 1. Verify against user.passwordHash (PBKDF2-SHA512 salt:hash)
    if (user.passwordHash && verifyPassword(passwordRaw, user.passwordHash)) {
      isPasswordValid = true;
    }

    // 2. Verify against member.salt + member.passwordHash
    if (!isPasswordValid && member.salt && member.passwordHash) {
      if (verifyPasswordWithSalt(passwordRaw, member.salt, member.passwordHash)) {
        isPasswordValid = true;
        // Sync to standard salt:hash format in users
        const standardHash = `${member.salt}:${member.passwordHash}`;
        await db.collection<UserDocument>("users").updateOne(
          { id: user.id },
          { $set: { passwordHash: standardHash, updatedAt: new Date() } }
        ).catch(() => {});
      }
    }

    // 3. Verify against member.passwordHash (if combined salt:hash)
    if (!isPasswordValid && member.passwordHash && member.passwordHash.includes(":")) {
      if (verifyPassword(passwordRaw, member.passwordHash)) {
        isPasswordValid = true;
        await db.collection<UserDocument>("users").updateOne(
          { id: user.id },
          { $set: { passwordHash: member.passwordHash, updatedAt: new Date() } }
        ).catch(() => {});
      }
    }

    // 4. Verify against member.password (plain text string or hashed)
    if (!isPasswordValid && member.password && typeof member.password === "string") {
      if (member.password.includes(":") && verifyPassword(passwordRaw, member.password)) {
        isPasswordValid = true;
        await db.collection<UserDocument>("users").updateOne(
          { id: user.id },
          { $set: { passwordHash: member.password, updatedAt: new Date() } }
        ).catch(() => {});
      } else if (passwordRaw === member.password) {
        isPasswordValid = true;
        // Upgrade plain password to secure hash in users collection
        const secureHash = hashPassword(passwordRaw);
        await db.collection<UserDocument>("users").updateOne(
          { id: user.id },
          { $set: { passwordHash: secureHash, updatedAt: new Date() } }
        ).catch(() => {});
      }
    }

    // 5. Verify against user.password (if present)
    if (!isPasswordValid && (user as any).password && typeof (user as any).password === "string") {
      if ((user as any).password.includes(":") && verifyPassword(passwordRaw, (user as any).password)) {
        isPasswordValid = true;
      } else if (passwordRaw === (user as any).password) {
        isPasswordValid = true;
        const secureHash = hashPassword(passwordRaw);
        await db.collection<UserDocument>("users").updateOne(
          { id: user.id },
          { $set: { passwordHash: secureHash, updatedAt: new Date() } }
        ).catch(() => {});
      }
    }

    if (!isPasswordValid) {
      await recordSecurityEvent(failedLoginEvent, {
        email: user.email || identifier,
        ipAddress,
        loginContext: context,
      });
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // ── Admin Context Role Check ─────────────────────────────────
    if (context === "ADMIN" && !isAdminRole(user.role)) {
      await recordSecurityEvent("ADMIN_ACCESS_DENIED", {
        userId: user.id,
        email: user.email,
        memberName: member.name,
        ipAddress,
        loginContext: "ADMIN",
      });
      return NextResponse.json(
        {
          success: false,
          error: "Administrative access is not available for this account.",
        },
        { status: 403 }
      );
    }

    // ── Create Session ───────────────────────────────────────────
    const { sessionToken, session } = await createSession(user.id, userAgent, ipAddress);

    // ── Reset Rate Limit & Record Success ────────────────────────
    resetRateLimit(rateLimitKey);

    const successEvent = context === "ADMIN" ? "ADMIN_LOGIN_SUCCESS" : "USER_LOGIN_SUCCESS";
    await recordSecurityEvent(successEvent, {
      userId:      user.id,
      memberId:    member.id,
      memberName:  member.name,
      email:       user.email,
      ipAddress,
      deviceName:  session.deviceName,
      loginContext: context,
      sessionId:   session.id,
    });

    // ── Build Response (No sensitive hashes/secrets) ─────────────
    const response = NextResponse.json({
      success: true,
      user: {
        id:     user.id,
        email:  user.email,
        role:   user.role || "MEMBER",
        status: user.status || "ACTIVE",
      },
      member: {
        id:                  member.id,
        name:                member.name,
        username:            member.username || (member.name || "").toLowerCase().replace(/\s+/g, "_"),
        email:               member.email,
        avatar:              getSafeAvatarUrl(member.avatar, member.id),
        role:                member.role || "MEMBER",
        phone:               member.phone,
        panMasked:           member.panMasked || "ABCDE2741D",
        defaultContribution: member.defaultContribution || 15000,
        joinedAt:            member.joinedAt || "Jan 2025",
      },
    });

    response.cookies.set({
      name:     SESSION_COOKIE_NAME,
      value:    sessionToken,
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   Math.floor(ABSOLUTE_EXPIRATION_MS / 1000),
    });

    return response;
  } catch (err: any) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json(
      { success: false, error: "An authentication error occurred. Please try again." },
      { status: 500 }
    );
  }
}

