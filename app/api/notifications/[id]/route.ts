import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

const DB_NAME = "nexo";

// DELETE /api/notifications/[id] - Delete/Dismiss notification by User or Admin
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Build filter matching by custom 'id' or MongoDB '_id'
    const queryConditions: any[] = [{ id }];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }
    const filter = { $or: queryConditions };

    const url = new URL(req.url);
    const scopeParam = url.searchParams.get("scope");
    const isAdmin = authUser?.role === "SUPER_ADMIN" || authUser?.role === "ADMIN";
    const scope = scopeParam || (isAdmin ? "everyone" : "me");

    if (scope === "everyone" && isAdmin) {
      // Admin permanently removes it for everyone
      const res = await db.collection("notifications").deleteOne(filter);
      return NextResponse.json({
        success: true,
        message: "Notification permanently deleted for everyone.",
        deletedCount: res.deletedCount,
      });
    }

    if (authUser?.memberId) {
      // Delete for Me: dismiss from personal view
      await db.collection("notifications").updateOne(
        filter,
        { $addToSet: { dismissedBy: authUser.memberId } as any }
      );
      return NextResponse.json({
        success: true,
        message: "Notification removed from your feed.",
      });
    }

    // Fallback if not authenticated (e.g. demo)
    await db.collection("notifications").deleteOne(filter);
    return NextResponse.json({ success: true, message: "Notification deleted." });
  } catch (err: any) {
    console.error("DELETE /api/notifications/[id] error:", err);
    return NextResponse.json({ success: false, error: "Failed to delete notification." }, { status: 500 });
  }
}
