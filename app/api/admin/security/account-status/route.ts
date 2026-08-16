import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { validateSessionToken } from "@/src/lib/auth/session";

const DB_NAME = "nexo";

export async function GET() {
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

    const { user } = sessionData;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const isAdmin = user.role === "ADMIN";

    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const usersCol = db.collection("users");
    const membersCol = db.collection("members");

    // Parallel execution of all counts and list queries in a single Promise.all batch
    const [
      activeCount,
      suspendedCount,
      disabledCount,
      passwordResetRequiredCount,
      emailUnverifiedCount,
      suspendedUsers,
      passwordRequiredUsers,
      allMembers,
    ] = await Promise.all([
      usersCol.countDocuments({ status: "ACTIVE" }),
      usersCol.countDocuments({ status: "SUSPENDED" }),
      usersCol.countDocuments({ status: "DISABLED" }),
      usersCol.countDocuments({ mustChangePassword: true }),
      usersCol.countDocuments({ emailVerified: false }),
      usersCol
        .find({ status: "SUSPENDED" }, { projection: { memberId: 1, role: 1, updatedAt: 1 } })
        .limit(50)
        .toArray(),
      usersCol
        .find({ mustChangePassword: true }, { projection: { memberId: 1, role: 1 } })
        .limit(10)
        .toArray(),
      membersCol
        .find({}, { projection: { id: 1, name: 1, username: 1, avatar: 1 } })
        .toArray(),
    ]);

    const memberMap = new Map(allMembers.map((m) => [m.id, m]));

    const suspendedAccounts = suspendedUsers.map((u) => {
      const m = memberMap.get(u.memberId);
      return {
        id: u.memberId,
        name: m?.name || "Unknown",
        username: m?.username || "unknown",
        avatar: m?.avatar || "/oggy.png",
        role: u.role,
        suspendedAt: u.updatedAt || new Date(),
        reason: "Administrative Action",
      };
    });

    const passwordRequiredAccounts = passwordRequiredUsers.map((u) => {
      const m = memberMap.get(u.memberId);
      return {
        id: u.memberId,
        name: m?.name || "Unknown",
        username: m?.username || "unknown",
        avatar: m?.avatar || "/oggy.png",
        role: u.role,
      };
    });

    return NextResponse.json(
      {
        success: true,
        metrics: {
          active: activeCount,
          suspended: suspendedCount,
          disabled: disabledCount,
          passwordChangeRequired: passwordResetRequiredCount,
          emailUnverified: emailUnverifiedCount,
        },
        suspendedAccounts,
        passwordRequiredAccounts,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
