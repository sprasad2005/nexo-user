import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { validateSessionToken } from "@/src/lib/auth/session";

const DB_NAME = "nexo";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nexo_session")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sessionData = await validateSessionToken(token);
    if (!sessionData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { user, session: currentSession } = sessionData;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const isAdmin = user.role === "ADMIN";

    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role") || "ALL";
    const statusFilter = searchParams.get("status") || "ACTIVE";
    const deviceFilter = searchParams.get("device") || "ALL";

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const now = new Date();

    const query: any = {};

    if (statusFilter === "ACTIVE") {
      query.revokedAt = null;
      query.expiresAt = { $gt: now };
    } else if (statusFilter === "REVOKED") {
      query.revokedAt = { $ne: null };
    }

    if (deviceFilter && deviceFilter !== "ALL") {
      query.deviceType = deviceFilter.toLowerCase();
    }

    // Query active sessions with projection and sort
    const sessions = await db
      .collection("sessions")
      .find(query, {
        projection: {
          id: 1,
          userId: 1,
          sessionTokenHash: 1,
          deviceType: 1,
          browser: 1,
          os: 1,
          deviceName: 1,
          ipAddress: 1,
          createdAt: 1,
          lastActiveAt: 1,
          expiresAt: 1,
          revokedAt: 1,
        },
      })
      .sort({ lastActiveAt: -1 })
      .limit(100)
      .toArray();

    // Batch fetch users & members in parallel
    const sessionUserIds = Array.from(new Set(sessions.map((s) => s.userId)));

    const [usersList, membersList] = await Promise.all([
      db
        .collection("users")
        .find({ id: { $in: sessionUserIds } }, { projection: { id: 1, memberId: 1, role: 1 } })
        .toArray(),
      db
        .collection("members")
        .find({}, { projection: { id: 1, name: 1, username: 1, avatar: 1 } })
        .toArray(),
    ]);

    const userMap = new Map(usersList.map((u) => [u.id, u]));
    const memberMap = new Map(membersList.map((m) => [m.id, m]));

    let result = sessions.map((sess) => {
      const u = userMap.get(sess.userId);
      const m = u ? memberMap.get(u.memberId) : null;
      const isCurrent = sess.sessionTokenHash === currentSession.sessionTokenHash;

      return {
        id: sess.id,
        userId: sess.userId,
        memberId: u?.memberId || "",
        memberName: m?.name || "Unknown",
        username: m?.username || "unknown",
        avatar: m?.avatar || "/oggy.png",
        role: u?.role || "MEMBER",
        deviceType: sess.deviceType || "desktop",
        browser: sess.browser || "Chrome",
        os: sess.os || "Windows",
        deviceName: sess.deviceName || "Chrome · Windows",
        ipAddress: sess.ipAddress || "127.0.0.1",
        createdAt: sess.createdAt,
        lastActiveAt: sess.lastActiveAt,
        expiresAt: sess.expiresAt,
        status: sess.revokedAt ? "REVOKED" : new Date(sess.expiresAt) < now ? "EXPIRED" : "ACTIVE",
        isCurrent,
      };
    });

    if (roleFilter && roleFilter !== "ALL") {
      result = result.filter((r) => r.role === roleFilter);
    }

    return NextResponse.json(
      {
        success: true,
        sessions: result,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
