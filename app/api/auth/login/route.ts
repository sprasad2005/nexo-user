import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { verifyPassword, hashPassword } from "@/src/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME, ABSOLUTE_EXPIRATION_MS } from "@/src/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/src/lib/auth/rateLimit";
import { recordSecurityEvent } from "@/src/lib/auth/security";
import { MOCK_MEMBERS } from "@/lib/mockData";

const DB_NAME = "nexo";

function isAdminRole(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
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

    const identifier = identifierRaw.toLowerCase();

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

    // ── Super Admin / Admin Username Matching Alias ────────────────
    const isSuperAdminAlias = ["ankitgod", "aniketgod", "anikitgod", "admin", "superadmin"].includes(identifier);

    // ── Resolve User ────────────────────────────────────────────
    let user: UserDocument | null = await db
      .collection<UserDocument>("users")
      .findOne({
        $or: [
          { emailNormalized: identifier },
          { id: identifier },
          ...(isSuperAdminAlias ? [{ role: "SUPER_ADMIN" as const }] : []),
        ],
      });

    let member: MemberDocument | null = null;

    if (user) {
      member = await db.collection<MemberDocument>("members").findOne({ id: user.memberId });
    } else {
      // Resolve by username, email, name, or id in members collection
      member = await db.collection<MemberDocument>("members").findOne({
        $or: [
          { username: { $regex: new RegExp(`^${identifier}$`, "i") } },
          { email: { $regex: new RegExp(`^${identifier}$`, "i") } },
          { name: { $regex: new RegExp(`^${identifier}$`, "i") } },
          { id: identifier },
          ...(isSuperAdminAlias ? [{ role: "SUPER_ADMIN" as const }] : []),
        ],
      });

      if (member) {
        user = await db.collection<UserDocument>("users").findOne({ memberId: member.id });
      }
    }

    // ── Fallback Seeding from MOCK_MEMBERS if DB is unseeded ─────
    if (!member || !user) {
      const mockMatch = MOCK_MEMBERS.find((m) => {
        const uName = (m.username || m.name).toLowerCase();
        const uEmail = m.email.toLowerCase();
        return uName === identifier || uEmail === identifier || m.id.toLowerCase() === identifier || (isSuperAdminAlias && m.role === "SUPER_ADMIN");
      });

      if (mockMatch) {
        const expectedPass = mockMatch.password || "admin123";
        if (passwordRaw === expectedPass) {
          // Seed member into MongoDB
          const newMemberDoc: MemberDocument = {
            id: mockMatch.id,
            name: mockMatch.name,
            username: mockMatch.username || mockMatch.name.toLowerCase(),
            password: mockMatch.password || expectedPass,
            email: mockMatch.email,
            avatar: mockMatch.avatar,
            role: mockMatch.role,
            panMasked: mockMatch.panMasked,
            panFull: mockMatch.panFull,
            defaultContribution: mockMatch.defaultContribution,
            joinedAt: mockMatch.joinedAt,
            phone: mockMatch.phone,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const passHash = await hashPassword(passwordRaw);
          const newUserDoc: UserDocument = {
            id: `usr_${mockMatch.id}`,
            memberId: mockMatch.id,
            email: mockMatch.email,
            emailNormalized: mockMatch.email.toLowerCase(),
            passwordHash: passHash,
            emailVerified: true,
            role: mockMatch.role,
            status: "ACTIVE",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.collection<MemberDocument>("members").updateOne(
            { id: mockMatch.id },
            { $set: newMemberDoc },
            { upsert: true }
          );

          await db.collection<UserDocument>("users").updateOne(
            { id: newUserDoc.id },
            { $set: newUserDoc },
            { upsert: true }
          );

          member = newMemberDoc;
          user = newUserDoc;
        }
      }
    }

    // ── Credential Verification ─────────────────────────────────
    const failedLoginEvent = context === "ADMIN" ? "ADMIN_LOGIN_FAILED" : "USER_LOGIN_FAILED";

    if (!user || !member) {
      await recordSecurityEvent(failedLoginEvent, {
        email: identifier,
        ipAddress,
        loginContext: context,
      });
      const msg = context === "ADMIN"
        ? "Invalid credentials."
        : "Invalid username or password.";
      return NextResponse.json({ success: false, error: msg }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      await recordSecurityEvent(failedLoginEvent, {
        email: identifier,
        ipAddress,
        loginContext: context,
      });
      return NextResponse.json(
        { success: false, error: "Your account is currently unavailable. Please contact support." },
        { status: 401 }
      );
    }

    // Verify password hash or assigned member password
    const isHashValid   = verifyPassword(passwordRaw, user.passwordHash);
    const isMemberPass  = Boolean(member.password && passwordRaw === member.password);

    if (!isHashValid && !isMemberPass) {
      await recordSecurityEvent(failedLoginEvent, {
        email: user.email,
        ipAddress,
        loginContext: context,
      });
      const msg = context === "ADMIN"
        ? "Invalid credentials."
        : "Invalid username or password.";
      return NextResponse.json({ success: false, error: msg }, { status: 401 });
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

    // ── Build Response ───────────────────────────────────────────
    const response = NextResponse.json({
      success: true,
      user: {
        id:     user.id,
        email:  user.email,
        role:   user.role,
        status: user.status,
      },
      member: {
        id:       member.id,
        name:     member.name,
        username: member.username,
        avatar:   member.avatar,
        role:     member.role,
        phone:    member.phone,
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
