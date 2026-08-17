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

    const adminName = auth.displayName || auth.username || "Admin";
    let targetIpoName = "IPO";

    // 1. Reset in shared_ipos.json
    const sharedIpos = readSharedIpos();
    let foundInShared = false;

    const updatedSharedIpos = sharedIpos.map((ipo) => {
      if (ipo.id === ipoId || ipo.name?.toLowerCase() === ipoId.toLowerCase()) {
        foundInShared = true;
        targetIpoName = ipo.name;
        return {
          ...ipo,
          allotmentFinalized: false,
          allotmentFinalizedAt: null,
          allotmentFinalizedBy: null,
        };
      }
      return ipo;
    });

    if (foundInShared) {
      writeSharedIpos(updatedSharedIpos);
    }

    // 2. Reset in MongoDB
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const escapedTargetName = targetIpoName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const dbIpo = await db.collection("ipos").findOne({
        $or: [{ id: ipoId }, { name: { $regex: new RegExp(`^${escapedTargetName}$`, "i") } }]
      });

      if (dbIpo) {
        targetIpoName = dbIpo.name || targetIpoName;
        const finalEscapedName = targetIpoName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        await Promise.all([
          db.collection("ipos").updateOne(
            { _id: dbIpo._id },
            {
              $set: {
                allotmentFinalized: false,
                allotmentFinalizedAt: null,
                allotmentFinalizedBy: null,
                updatedAt: new Date(),
              }
            }
          ),
          db.collection("applications").updateMany(
            {
              $or: [
                { ipoId: ipoId },
                { ipoName: { $regex: new RegExp(`^${finalEscapedName}$`, "i") } },
              ],
            },
            {
              $set: {
                allotmentStatus: "PENDING",
                status: "PENDING",
                allottedIndices: [],
                updatedAt: new Date(),
              },
            }
          ),
        ]);
      }
    } catch (_dbErr) {
      console.warn("MongoDB reset optional, shared_ipos.json reset successfully.");
    }

    // Audit Event Log
    await logActivity({
      eventType: "ALLOTMENT_REOPENED",
      category: "APPLICATION",
      severity: "WARNING",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: adminName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "IPO",
      targetId: ipoId,
      targetName: targetIpoName,
      ipoId: ipoId,
      metadata: {
        ipoName: targetIpoName,
        reopenedAt: new Date().toISOString(),
      }
    });

    return NextResponse.json({
      success: true,
      message: `Allotment for ${targetIpoName} has been reopened successfully.`,
    });
  } catch (err: any) {
    console.error("POST /api/admin/allotment/reopen error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred reopening allotment." }, { status: 500 });
  }
}
