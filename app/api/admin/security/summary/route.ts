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
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const sessionsCol = db.collection("sessions");
    const usersCol = db.collection("users");
    const activitiesCol = db.collection("activities");

    // Execute all 9 count queries concurrently in a single parallel Promise.all batch
    const [
      activeSessionsCount,
      activeAdminsCount,
      activeMembersCount,
      suspendedAccountsCount,
      passwordChangesCount,
      loginsTodayCount,
      failedLoginsTodayCount,
      recentSecurityEventsCount,
      suspendedAdminsCount,
    ] = await Promise.all([
      // 1. Active Sessions
      sessionsCol.countDocuments({ revokedAt: null, expiresAt: { $gt: now } }),
      // 2. Active Admins
      usersCol.countDocuments({ role: { $in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" }),
      // 3. Active Members
      usersCol.countDocuments({ role: "MEMBER", status: "ACTIVE" }),
      // 4. Suspended Accounts
      usersCol.countDocuments({ status: "SUSPENDED" }),
      // 5. Password Changes Required
      usersCol.countDocuments({ mustChangePassword: true }),
      // 6. Logins Today
      activitiesCol.countDocuments({
        eventType: { $in: ["LOGIN_SUCCESS", "ADMIN_LOGIN_SUCCESS"] },
        createdAt: { $gte: startOfToday },
      }),
      // 7. Failed Logins Today
      activitiesCol.countDocuments({
        eventType: { $in: ["LOGIN_FAILED", "ADMIN_LOGIN_FAILED"] },
        createdAt: { $gte: startOfToday },
      }),
      // 8. Recent Security Events
      activitiesCol.countDocuments({
        category: "SECURITY",
        createdAt: { $gte: oneDayAgo },
      }),
      // 9. Suspended Admins
      usersCol.countDocuments({
        role: { $in: ["ADMIN", "SUPER_ADMIN"] },
        status: "SUSPENDED",
      }),
    ]);

    // Generate Security Alerts
    const alerts: Array<{ id: string; severity: "WARNING" | "CRITICAL" | "INFO"; title: string; desc: string }> = [];

    if (failedLoginsTodayCount >= 5) {
      alerts.push({
        id: "elevated_login_failures",
        severity: "WARNING",
        title: "Elevated failed-login activity",
        desc: `${failedLoginsTodayCount} failed sign-in attempts detected on the platform today.`,
      });
    }

    if (suspendedAdminsCount > 0) {
      alerts.push({
        id: "suspended_admins",
        severity: "CRITICAL",
        title: "Suspended admin accounts",
        desc: `There are ${suspendedAdminsCount} suspended administrator accounts requiring review.`,
      });
    }

    if (passwordChangesCount > 0) {
      alerts.push({
        id: "outstanding_passwords",
        severity: "INFO",
        title: "Password reset active",
        desc: `${passwordChangesCount} account(s) require a password change on next login.`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        summary: {
          activeSessions: activeSessionsCount,
          activeAdmins: activeAdminsCount,
          activeMembers: activeMembersCount,
          loginsToday: loginsTodayCount,
          failedLogins: failedLoginsTodayCount,
          suspendedAccounts: suspendedAccountsCount,
          passwordChangesRequired: passwordChangesCount,
          recentSecurityEvents: recentSecurityEventsCount,
          alerts,
        },
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
