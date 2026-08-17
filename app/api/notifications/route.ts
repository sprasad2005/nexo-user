import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

const DB_NAME = "nexo";

// GET /api/notifications - Get public/member notifications
export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Fetch notifications targeted at ALL or specific member, excluding dismissed ones
    const filter = authUser
      ? {
          $or: [{ targetMemberId: "ALL" }, { targetMemberId: authUser.memberId }],
          dismissedBy: { $ne: authUser.memberId },
        }
      : { targetMemberId: "ALL" };

    const notifications = await db
      .collection("notifications")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    return NextResponse.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        senderId: n.senderId,
        senderName: n.senderName,
        senderAvatar: n.senderAvatar || "/oggy.png",
        targetMemberId: n.targetMemberId,
        targetMemberName: n.targetMemberName || (n.targetMemberId === "ALL" ? "All Group Members" : n.targetMemberId),
        title: n.title,
        message: n.message,
        severity: n.severity,
        ipoId: n.ipoId,
        ipoName: n.ipoName,
        ctaLabel: n.ctaLabel,
        ctaLink: n.ctaLink,
        createdAt: n.createdAt,
        isRead: authUser ? (n.readBy || []).includes(authUser.memberId) : false,
      })),
    });
  } catch (err: any) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch notifications" }, { status: 500 });
  }
}
