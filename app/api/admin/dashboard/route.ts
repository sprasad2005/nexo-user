import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSessionToken } from "@/src/lib/auth/session";
import { getDashboardSummary } from "@/lib/services/dashboardService";
import { startTiming, createServerTimingHeader } from "@/lib/perfLogger";

export async function GET() {
  const reqTimer = startTiming("GET /api/admin/dashboard");
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nexo_session")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const authTimer = startTiming("auth");
    const sessionData = await validateSessionToken(token);
    const authDur = authTimer.end();

    if (!sessionData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (sessionData.user.role !== "SUPER_ADMIN" && sessionData.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const dbTimer = startTiming("db_dashboard");
    const dashboardData = await getDashboardSummary();
    const dbDur = dbTimer.end();

    const totalDur = reqTimer.end();

    return NextResponse.json(
      {
        success: true,
        data: dashboardData,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
          "Server-Timing": createServerTimingHeader({ auth: authDur, db: dbDur, total: totalDur }),
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
