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

    // Fetch login events with projection
    const loginEvents = await db
      .collection("activities")
      .find(
        {
          eventType: {
            $in: [
              "LOGIN_SUCCESS",
              "ADMIN_LOGIN_SUCCESS",
              "LOGIN_FAILED",
              "ADMIN_LOGIN_FAILED",
              "LOGOUT",
              "ADMIN_LOGOUT",
            ],
          },
        },
        {
          projection: {
            id: 1,
            eventType: 1,
            category: 1,
            severity: 1,
            actorName: 1,
            actorUsername: 1,
            actorRole: 1,
            ipAddress: 1,
            createdAt: 1,
            userAgent: 1,
            metadata: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Map and sanitize failed login attempts to prevent user enumeration
    const sanitizedEvents = loginEvents.map((event) => {
      const isFailed = event.eventType === "LOGIN_FAILED" || event.eventType === "ADMIN_LOGIN_FAILED";

      return {
        id: event.id,
        eventType: event.eventType,
        category: event.category,
        severity: event.severity,
        actorName: isFailed ? "Unknown / masked" : event.actorName || "System",
        actorUsername: isFailed ? "unknown" : event.actorUsername || "unknown",
        actorRole: isFailed ? "MEMBER" : event.actorRole || "MEMBER",
        deviceName: event.metadata?.deviceName || event.userAgent || "Unknown Device",
        ipAddress: event.ipAddress || "127.0.0.1",
        createdAt: event.createdAt,
        success: !isFailed,
        context: event.eventType?.startsWith("ADMIN") ? "ADMIN" : "MEMBER",
      };
    });

    return NextResponse.json(
      {
        success: true,
        loginEvents: sanitizedEvents,
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
