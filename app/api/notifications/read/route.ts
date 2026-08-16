import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

const DB_NAME = "nexo";

// PUT /api/notifications/read - Mark notification(s) as read by authenticated user
export async function PUT(req: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId } = body;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    if (notificationId) {
      // Mark specific notification as read
      await db.collection("notifications").updateOne(
        { id: notificationId },
        { $addToSet: { readBy: authUser.memberId } as any }
      );
    } else {
      // Mark all targeted notifications as read
      await db.collection("notifications").updateMany(
        {
          $or: [{ targetMemberId: "ALL" }, { targetMemberId: authUser.memberId }],
        },
        { $addToSet: { readBy: authUser.memberId } as any }
      );
    }

    return NextResponse.json({ success: true, message: "Marked as read." });
  } catch (err: any) {
    console.error("PUT /api/notifications/read error:", err);
    return NextResponse.json({ success: false, error: "Failed to mark as read." }, { status: 500 });
  }
}
