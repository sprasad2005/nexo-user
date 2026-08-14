import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/src/lib/auth/authorization";

const DB_NAME = "nexo";

// POST /api/admin/notifications - Broadcast notification to members
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    const body = await req.json();

    const {
      targetMemberId = "ALL",
      title,
      message,
      severity = "INFO",
      ipoId,
      ipoName,
      ctaLabel,
      ctaLink,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Notification title is required." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ success: false, error: "Notification message is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const notificationDoc = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: auth.memberId,
      senderName: auth.displayName || "Administrator",
      targetMemberId: targetMemberId || "ALL",
      title: title.trim(),
      message: message.trim(),
      severity: ["INFO", "SUCCESS", "WARNING", "CRITICAL"].includes(severity) ? severity : "INFO",
      ipoId: ipoId || null,
      ipoName: ipoName || null,
      ctaLabel: ctaLabel ? ctaLabel.trim().replace(/→+$/, "").trim() : null,
      ctaLink: ctaLink || null,
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    await db.collection("notifications").insertOne(notificationDoc);

    return NextResponse.json({
      success: true,
      message: targetMemberId === "ALL" ? "Notification broadcasted to all group members!" : "Notification sent to member.",
      notification: notificationDoc,
    });
  } catch (err: any) {
    console.error("POST /api/admin/notifications error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to send notification." }, { status: 500 });
  }
}

// GET /api/admin/notifications - Get all sent notifications history
export async function GET() {
  try {
    await requireAdmin();
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const notifications = await db
      .collection("notifications")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        senderName: n.senderName,
        targetMemberId: n.targetMemberId,
        title: n.title,
        message: n.message,
        severity: n.severity,
        ipoId: n.ipoId,
        ipoName: n.ipoName,
        ctaLabel: n.ctaLabel,
        ctaLink: n.ctaLink,
        createdAt: n.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("GET /api/admin/notifications error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch notifications history." }, { status: 500 });
  }
}
