import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireSuperAdmin } from "@/src/lib/auth/authorization";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { hashPassword } from "@/src/lib/auth/password";
import { revokeAllUserSessions } from "@/src/lib/auth/session";
import { logActivity } from "@/src/features/activity/activityService";
import crypto from "crypto";

const DB_NAME = "nexo";

// Generate a cryptographically secure 16-character temporary password
function generateSecurePassword(): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{}|;:,.<>?";
  const allChars = lowercase + uppercase + numbers + symbols;

  let password = "";
  // Ensure at least one from each char class is included
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  // Fill up to 16 characters
  for (let i = 4; i < 16; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle characters to avoid predictable patterns
  return password
    .split("")
    .sort(() => crypto.randomInt(3) - 1)
    .join("");
}

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

    // Generate temporary password
    const temporaryPassword = generateSecurePassword();
    const passwordHash = hashPassword(temporaryPassword);

    // Update user credentials and member record concurrently
    await Promise.all([
      db.collection<UserDocument>("users").updateOne(
        { memberId: targetMemberId },
        {
          $set: {
            passwordHash: passwordHash,
            mustChangePassword: true,
            updatedAt: new Date(),
          },
        }
      ),
      db.collection<MemberDocument>("members").updateOne(
        { id: targetMemberId },
        {
          $set: {
            password: temporaryPassword,
            updatedAt: new Date(),
          },
        }
      ),
    ]);

    // Revoke all existing sessions so they are forced to log in with the new credentials
    await revokeAllUserSessions(user.id);

    // Log Activity
    await logActivity({
      eventType: "PASSWORD_RESET",
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
      metadata: { targetUserId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. A temporary password has been generated.",
      temporaryPassword,
    });
  } catch (err: any) {
    console.error("POST /api/admin/members/[id]/reset-password error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred resetting the password." }, { status: 500 });
  }
}
