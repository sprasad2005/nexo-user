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
    const { ipoId, allottedApplicationIds = [] } = body;

    if (!ipoId || typeof ipoId !== "string") {
      return NextResponse.json({ success: false, error: "IPO ID is required." }, { status: 400 });
    }

    const allottedSet = new Set<string>(
      Array.isArray(allottedApplicationIds) ? allottedApplicationIds.map(String) : []
    );
    const finalizedDate = new Date();
    const adminName = auth.displayName || auth.username || "Admin";

    const getAllottedIndices = (appId: string): number[] => {
      const indices: number[] = [];
      for (const item of Array.from(allottedSet)) {
        if (item === appId) {
          indices.push(0);
        } else if (item.startsWith(`${appId}_lot_`)) {
          const idxStr = item.split("_lot_")[1];
          const idx = parseInt(idxStr, 10);
          if (!isNaN(idx)) indices.push(idx);
        }
      }
      return indices;
    };

    // 1. Update shared_ipos.json
    const sharedIpos = readSharedIpos();
    let ipoFoundInShared = false;
    let targetIpoName = "IPO";
    let allottedCount = 0;
    let notAllottedCount = 0;

    const updatedSharedIpos = sharedIpos.map((ipo) => {
      if (ipo.id === ipoId || ipo.name?.toLowerCase() === ipoId.toLowerCase()) {
        ipoFoundInShared = true;
        targetIpoName = ipo.name;

        const updatedApps = (ipo.applications || []).map((app: any) => {
          const appId = app.id || app.applicationNumber;
          const allottedIndices = getAllottedIndices(appId);
          const isAllotted = allottedIndices.length > 0;
          if (isAllotted) allottedCount += allottedIndices.length;
          else notAllottedCount += Math.max(1, app.lotCount || app.numberOfPanCards || 1);

          return {
            ...app,
            allotmentStatus: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
            status: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
            allottedIndices,
            updatedAt: finalizedDate.toISOString(),
          };
        });

        return {
          ...ipo,
          allotmentFinalized: true,
          allotmentFinalizedAt: finalizedDate.toISOString(),
          allotmentFinalizedBy: adminName,
          status: "ALLOTMENT_OUT",
          applications: updatedApps,
        };
      }
      return ipo;
    });

    if (ipoFoundInShared) {
      writeSharedIpos(updatedSharedIpos);
    }

    // 2. Update MongoDB (if available)
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const dbIpo = await db.collection("ipos").findOne({
        $or: [{ id: ipoId }, { name: { $regex: new RegExp(`^${targetIpoName}$`, "i") } }]
      });

      if (dbIpo) {
        targetIpoName = dbIpo.name || targetIpoName;

        const dbApps = await db.collection("applications").find({
          $or: [
            { ipoId: dbIpo.id || ipoId },
            { ipoName: { $regex: new RegExp(`^${targetIpoName}$`, "i") } }
          ]
        }).toArray();

        for (const app of dbApps) {
          const appId = app.id || app._id?.toString() || app.applicationNumber;
          const allottedIndices = getAllottedIndices(appId);
          const isAllotted = allottedIndices.length > 0;

          await db.collection("applications").updateOne(
            { _id: app._id },
            {
              $set: {
                allotmentStatus: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
                status: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
                allottedIndices,
                updatedAt: finalizedDate,
              }
            }
          );
        }

        await db.collection("ipos").updateOne(
          { _id: dbIpo._id },
          {
            $set: {
              allotmentFinalized: true,
              allotmentFinalizedAt: finalizedDate,
              allotmentFinalizedBy: adminName,
              status: "ALLOTMENT_OUT",
              updatedAt: finalizedDate,
            }
          }
        );
      }
    } catch (_dbErr) {
      console.warn("MongoDB update optional, shared_ipos.json successfully updated.");
    }

    // Audit Event Log
    await logActivity({
      eventType: "ALLOTMENT_FINALIZED",
      category: "APPLICATION",
      severity: "SUCCESS",
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
        allottedCount,
        notAllottedCount,
        finalizedAt: finalizedDate.toISOString(),
      }
    });

    return NextResponse.json({
      success: true,
      message: `Allotment finalized successfully. ${allottedCount} applications allotted. ${notAllottedCount} applications not allotted.`,
      allottedCount,
      notAllottedCount,
      finalizedAt: finalizedDate.toISOString(),
      finalizedBy: adminName,
    });
  } catch (err: any) {
    console.error("POST /api/admin/allotment/finalize error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "An error occurred finalizing allotment." }, { status: 500 });
  }
}
