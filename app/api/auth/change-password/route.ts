import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/src/lib/auth/password";
import { revokeAllOtherSessions } from "@/src/lib/auth/session";
import { recordSecurityEvent } from "@/src/lib/auth/security";

const DB_NAME = "nexo";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmNewPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: "Please enter current and new passwords." }, { status: 400 });
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json({ success: false, error: "New password confirmation does not match." }, { status: 400 });
    }

    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.isValid) {
      return NextResponse.json(
        { success: false, error: strengthCheck.feedback || "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // 1. Verify Current Password (PBKDF2 hash or member assigned password)
    const isHashValid = verifyPassword(currentPassword, auth.user.passwordHash);
    const isPlainValid = auth.member?.password ? currentPassword === auth.member.password : false;

    if (!isHashValid && !isPlainValid) {
      return NextResponse.json({ success: false, error: "Incorrect current password. Please enter your active or temporary password." }, { status: 401 });
    }

    // 2. Hash New Password & Update MongoDB User Document
    const newPasswordHash = hashPassword(newPassword);
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await db.collection("users").updateOne(
      { $or: [{ id: auth.userId }, { memberId: auth.memberId }] },
      { $set: { passwordHash: newPasswordHash, password: newPassword, mustChangePassword: false, updatedAt: new Date() } }
    );

    // Update active password in member document so it remains visible to Admin and Super Admin
    await db.collection("members").updateOne(
      { $or: [{ id: auth.memberId }, { id: auth.userId }] },
      { $set: { password: newPassword, updatedAt: new Date() } }
    );

    // 3. Revoke all other device sessions for security
    await revokeAllOtherSessions(auth.userId, auth.session.id);

    // 4. Record Security Audit Log
    await recordSecurityEvent("PASSWORD_CHANGED", {
      userId: auth.userId,
      memberId: auth.memberId,
      memberName: auth.displayName,
      email: auth.email,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully! All other active sessions have been signed out.",
    });
  } catch (err: any) {
    console.error("POST /api/auth/change-password error:", err);
    return NextResponse.json({ success: false, error: "Failed to change password" }, { status: 500 });
  }
}
