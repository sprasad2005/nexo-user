import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/src/lib/auth/authorization";

const DB_NAME = "nexo";

// PUT /api/admin/notifications/[id] - Edit existing notification (Super Admin only)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const {
      targetMemberId = "ALL",
      title,
      message,
      severity = "INFO",
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Notification title is required." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ success: false, error: "Notification message is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const queryConditions: any[] = [{ id }];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }
    const filter = { $or: queryConditions };

    const updateDoc = {
      targetMemberId: targetMemberId || "ALL",
      title: title.trim(),
      message: message.trim(),
      severity: ["INFO", "SUCCESS", "WARNING", "CRITICAL"].includes(severity) ? severity : "INFO",
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("notifications").updateOne(
      filter,
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Notification not found." }, { status: 404 });
    }

    const updated = await db.collection("notifications").findOne(filter);

    return NextResponse.json({
      success: true,
      message: "Notification updated successfully!",
      notification: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/admin/notifications/[id] error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to update notification." }, { status: 500 });
  }
}

// DELETE /api/admin/notifications/[id] - Delete notification (Super Admin only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const queryConditions: any[] = [{ id }];
    if (ObjectId.isValid(id)) {
      queryConditions.push({ _id: new ObjectId(id) });
    }
    const filter = { $or: queryConditions };

    const result = await db.collection("notifications").deleteOne(filter);

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully!",
      deletedCount: result.deletedCount,
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/notifications/[id] error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to delete notification." }, { status: 500 });
  }
}
