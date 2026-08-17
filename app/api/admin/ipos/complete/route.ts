import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/src/lib/auth/authorization";
import { logActivity } from "@/src/features/activity/activityService";

const DB_NAME = "nexo";
const SHARED_FILE_PATH_PARENT = path.join(process.cwd(), "..", "shared_ipos.json");
const SHARED_FILE_PATH_LOCAL = path.join(process.cwd(), "shared_ipos.json");

function readSharedIpos(): any[] {
  try {
    if (fs.existsSync(SHARED_FILE_PATH_LOCAL)) {
      const data = fs.readFileSync(SHARED_FILE_PATH_LOCAL, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    if (fs.existsSync(SHARED_FILE_PATH_PARENT)) {
      const data = fs.readFileSync(SHARED_FILE_PATH_PARENT, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading shared_ipos.json:", err);
  }
  return [];
}

function writeSharedIpos(ipos: any[]) {
  try {
    const jsonStr = JSON.stringify(ipos, null, 2);
    fs.writeFileSync(SHARED_FILE_PATH_LOCAL, jsonStr, "utf-8");
    try {
      fs.writeFileSync(SHARED_FILE_PATH_PARENT, jsonStr, "utf-8");
    } catch (_e) {}
  } catch (err) {
    console.error("Error writing shared_ipos.json:", err);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const { ipoId } = body;

    if (!ipoId || typeof ipoId !== "string") {
      return NextResponse.json({ success: false, error: "IPO ID is required." }, { status: 400 });
    }

    const completedAt = new Date().toISOString();
    const adminName = auth.displayName || auth.username || "Admin";

    // 1. Update shared_ipos.json
    const sharedIpos = readSharedIpos();
    let updatedIpoName = "IPO";

    const updatedShared = sharedIpos.map((ipo) => {
      if (ipo.id === ipoId || ipo.name?.toLowerCase() === ipoId.toLowerCase()) {
        updatedIpoName = ipo.name;
        return {
          ...ipo,
          status: "COMPLETED",
          isCompleted: true,
          allotmentFinalized: true,
          completedAt: completedAt,
          completedBy: adminName,
        };
      }
      return ipo;
    });

    writeSharedIpos(updatedShared);

    // 2. Update MongoDB ipos collection
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      await db.collection("ipos").updateOne(
        { $or: [{ id: ipoId }, { name: { $regex: new RegExp(`^${ipoId}$`, "i") } }] },
        {
          $set: {
            status: "COMPLETED",
            isCompleted: true,
            allotmentFinalized: true,
            completedAt: new Date(completedAt),
            completedBy: adminName,
          },
        },
        { upsert: false }
      );
    } catch (err) {
      console.warn("MongoDB update optional for complete IPO:", err);
    }

    // 3. Log activity
    try {
      await logActivity({
        eventType: "IPO_ARCHIVED",
        category: "PRODUCT",
        severity: "INFO",
        actorUserId: auth.userId,
        actorMemberId: auth.memberId,
        actorName: adminName,
        actorUsername: auth.username,
        actorRole: auth.role,
        targetType: "IPO",
        targetId: ipoId,
        targetName: updatedIpoName,
        previousValue: { status: "APPLICATION_OPEN" },
        newValue: { status: "COMPLETED" },
        metadata: { status: "COMPLETED", completedAt, action: `Archived IPO "${updatedIpoName}" and moved to History.` },
      });
    } catch (_e) {}

    return NextResponse.json({
      success: true,
      message: `✓ IPO "${updatedIpoName}" marked as Completed and moved to History.`,
    });
  } catch (err: any) {
    console.error("POST /api/admin/ipos/complete error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to complete IPO." },
      { status: 500 }
    );
  }
}
