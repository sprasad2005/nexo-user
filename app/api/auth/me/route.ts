import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";
import { getSafeAvatarUrl } from "@/lib/avatarHelper";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json(
        { authenticated: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        role: auth.user.role,
        status: auth.user.status,
        mustChangePassword: auth.user.mustChangePassword || false,
        createdAt: auth.user.createdAt,
      },
      member: {
        id: auth.member.id,
        name: auth.member.name,
        username: auth.member.username,
        email: auth.member.email,
        avatar: getSafeAvatarUrl(auth.member.avatar, auth.member.id),
        role: auth.member.role,
        panMasked: auth.member.panMasked || "ABCDE1234F",
        defaultContribution: auth.member.defaultContribution,
        phone: auth.member.phone,
        joinedAt: auth.member.joinedAt,
      },
      session: {
        id: auth.session.id,
        createdAt: auth.session.createdAt,
        lastActiveAt: auth.session.lastActiveAt,
        deviceName: auth.session.deviceName,
      },
    });
  } catch (err: any) {
    console.error("GET /api/auth/me error:", err);
    return NextResponse.json(
      { authenticated: false, error: "Authentication check failed" },
      { status: 500 }
    );
  }
}
