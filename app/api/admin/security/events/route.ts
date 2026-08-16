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

    const { user } = sessionData;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const isAdmin = user.role === "ADMIN";

    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const eventType = searchParams.get("eventType") || "";
    const severity = searchParams.get("severity") || "";
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

    const query: any = {
      category: "SECURITY"
    };

    // Filters
    if (eventType && eventType !== "ALL") query.eventType = eventType;
    if (severity && severity !== "ALL") query.severity = severity;

    // Search Query (Actor, Target, Type)
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { actorName: searchRegex },
        { actorUsername: searchRegex },
        { targetName: searchRegex },
        { eventType: searchRegex }
      ];
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const events = await db
      .collection("activities")
      .find(query, {
        projection: {
          id: 1,
          eventType: 1,
          category: 1,
          severity: 1,
          title: 1,
          actorName: 1,
          actorUsername: 1,
          actorRole: 1,
          targetName: 1,
          metadata: 1,
          createdAt: 1,
          ipAddress: 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(
      {
        success: true,
        events,
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
