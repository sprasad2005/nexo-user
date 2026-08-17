import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { validateSessionToken } from "@/src/lib/auth/session";
import { ObjectId } from "mongodb";
import { AuditCategory, AuditEventType, AuditSeverity } from "@/src/features/activity/types";

const DB_NAME = "nexo";
const SENSITIVE_EVENTS = [
  "PASSWORD_RESET",
  "ROLE_CHANGED",
  "SESSION_REVOKED",
  "ALL_SESSIONS_REVOKED",
  "ADMIN_ACCESS_DENIED",
  "SUPER_ADMIN_ACTION",
  "ACCOUNT_SUSPENDED",
];

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
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const col = db.collection("activities");

    // Parallelized summary metrics
    if (searchParams.get("summary") === "true") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [today, admins, members, security, investment, application] = await Promise.all([
        col.countDocuments({ createdAt: { $gte: startOfToday } }),
        col.countDocuments({ actorRole: { $in: ["ADMIN", "SUPER_ADMIN"] } }),
        col.countDocuments({ actorRole: "MEMBER" }),
        col.countDocuments({ category: "SECURITY" }),
        col.countDocuments({ category: "INVESTMENT" }),
        col.countDocuments({ category: "APPLICATION" }),
      ]);

      return NextResponse.json(
        {
          success: true,
          summary: { today, admins, members, security, investment, application },
        },
        {
          headers: {
            "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
          },
        }
      );
    }

    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const eventType = searchParams.get("eventType") || "";
    const severity = searchParams.get("severity") || "";
    const actorId = searchParams.get("actorId") || "";
    const memberId = searchParams.get("memberId") || "";
    const ipoId = searchParams.get("ipoId") || "";
    const applicationId = searchParams.get("applicationId") || "";
    const targetType = searchParams.get("targetType") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const cursor = searchParams.get("cursor") || "";

    const query: any = {};

    // Enforce role visibility constraints: ADMINs cannot see sensitive security logs
    if (!isSuperAdmin) {
      query.eventType = { $nin: SENSITIVE_EVENTS };
    }

    // Filters
    if (category && category !== "ALL") query.category = category as AuditCategory;
    if (eventType && eventType !== "ALL") query.eventType = eventType as AuditEventType;
    if (severity && severity !== "ALL") query.severity = severity as AuditSeverity;

    if (actorId) {
      query.$or = [{ actorUserId: actorId }, { actorMemberId: actorId }];
    }

    if (memberId) {
      query.$or = [{ memberId }, { actorMemberId: memberId }, { targetId: memberId }];
    }

    if (ipoId) query.ipoId = ipoId;
    if (applicationId) query.applicationId = applicationId;
    if (targetType && targetType !== "ALL") query.targetType = targetType;

    // Date Range Filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Search Query (Actor, Event, Target, Metadata)
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      const searchConditions = [
        { actorName: searchRegex },
        { actorUsername: searchRegex },
        { targetName: searchRegex },
        { eventType: searchRegex },
        { category: searchRegex },
        { "metadata.ipoName": searchRegex },
        { "metadata.applicationName": searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Cursor Pagination Query
    if (cursor) {
      const [ts, id] = cursor.split("_");
      if (ts && id) {
        const cursorDate = new Date(parseInt(ts));
        const cursorQuery = {
          $or: [
            { createdAt: { $lt: cursorDate } },
            { createdAt: cursorDate, _id: { $lt: new ObjectId(id) } },
          ],
        };

        if (query.$and) {
          query.$and.push(cursorQuery);
        } else if (query.$or) {
          query.$and = [{ $or: query.$or }, cursorQuery];
          delete query.$or;
        } else {
          query.$and = [cursorQuery];
        }
      }
    }

    const activities = await col
      .find(query, {
        projection: {
          id: 1,
          type: 1,
          category: 1,
          eventType: 1,
          severity: 1,
          title: 1,
          subtitle: 1,
          description: 1,
          actorName: 1,
          actorUsername: 1,
          actorAvatar: 1,
          actorRole: 1,
          targetName: 1,
          targetType: 1,
          metadata: 1,
          timestamp: 1,
          createdAt: 1,
          ipAddress: 1,
        },
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .toArray();

    let hasMore = false;
    let nextCursor = "";

    if (activities.length > limit) {
      hasMore = true;
      const nextItem = activities[limit - 1];
      const nextDate = nextItem.createdAt instanceof Date ? nextItem.createdAt : new Date(nextItem.createdAt);
      nextCursor = `${nextDate.getTime()}_${nextItem._id.toString()}`;
      activities.pop(); // remove the extra item
    }

    return NextResponse.json(
      {
        success: true,
        activities,
        pagination: {
          hasMore,
          nextCursor,
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
