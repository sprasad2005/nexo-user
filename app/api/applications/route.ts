import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { IPOApplicationDocument } from "@/src/models/Application";
import { validateSessionToken } from "@/src/lib/auth/session";
import { logActivity } from "@/src/features/activity/activityService";

const DB = "nexo";
const COL = "applications";

import fs from "fs";
import path from "path";

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

/* ────────────────────────────────────────────────────────────────
   GET /api/applications
   Fetches all saved IPO application responses from MongoDB & shared_ipos.json.
 * ──────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const ipoId = searchParams.get("ipoId");
    const lotIndexParam = searchParams.get("lotIndex") !== null && searchParams.get("lotIndex") !== ""
      ? parseInt(searchParams.get("lotIndex")!, 10)
      : null;
    const lotIdParam = searchParams.get("lotId")?.trim();
    const panParam = searchParams.get("pan")?.trim().toUpperCase();
    const statusParam = searchParams.get("status")?.trim().toUpperCase();
    const allottedOnly = searchParams.get("allottedOnly") === "true" || statusParam === "ALLOTTED";

    const query: any = {};
    if (ipoId) query.ipoId = ipoId;
    if (memberId) {
      query.$or = [
        { memberId },
        { "participants.memberId": memberId },
        { userId: memberId },
      ];
    }
    if (panParam) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { panNumbers: panParam },
          { panMasked: panParam },
          { panNormalized: panParam },
        ],
      });
    }
    if (statusParam && statusParam !== "ALL") {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { allotmentStatus: statusParam },
          { status: statusParam },
        ],
      });
    }

    let dbApps: any[] = [];
    try {
      const client = await clientPromise;
      const col = client.db(DB).collection<IPOApplicationDocument>(COL);
      dbApps = await col
        .find(
          query,
          {
            projection: {
              id: 1,
              ipoId: 1,
              ipoName: 1,
              memberId: 1,
              applicantName: 1,
              applicationNumber: 1,
              panMasked: 1,
              panNumbers: 1,
              allottedIndices: 1,
              numberOfPanCards: 1,
              lotCount: 1,
              lotsApplied: 1,
              allotmentStatus: 1,
              fundingStructure: 1,
              totalContribution: 1,
              contributors: 1,
              participants: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray();
    } catch (_e) {
      console.warn("GET /api/applications MongoDB fetch optional.");
    }

    let rawApplications: any[] = [];

    if (dbApps.length > 0) {
      rawApplications = dbApps;
    } else {
      const sharedIpos = readSharedIpos();
      const appMap = new Map<string, any>();

      // Process embedded apps from shared_ipos.json fallback
      sharedIpos.forEach((ipo) => {
        if (!ipoId || ipo.id === ipoId || ipo.name?.toLowerCase() === ipoId.toLowerCase()) {
          if (Array.isArray(ipo.applications)) {
            ipo.applications.forEach((app: any) => {
              const id = app.id;
              if (id && !appMap.has(id)) {
                appMap.set(id, {
                  ...app,
                  ipoName: ipo.name,
                });
              }
            });
          }
        }
      });

      rawApplications = Array.from(appMap.values());
    }

    // Apply lot / allocation level filtering so client receives only specifically selected/allotted accounts
    let finalApplications = rawApplications;

    if (allottedOnly) {
      const allottedList: any[] = [];
      rawApplications.forEach((app: any) => {
        const totalLots = Math.max(1, app.lotsApplied || app.lotCount || app.numberOfPanCards || 1);
        const pans = Array.isArray(app.panNumbers) && app.panNumbers.length > 0
          ? app.panNumbers
          : [app.panMasked || app.pan || "ABCDE2741D"];

        if (Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0) {
          app.allottedIndices.forEach((lotIdx: number) => {
            const specificPan = pans[lotIdx] || pans[0];
            if (panParam && specificPan.toUpperCase() !== panParam) return;
            if (lotIndexParam !== null && lotIdx !== lotIndexParam) return;
            const specificLotId = totalLots > 1 ? `${app.id}_lot_${lotIdx}` : app.id;
            if (lotIdParam && specificLotId !== lotIdParam) return;

            allottedList.push({
              ...app,
              id: specificLotId,
              lotIndex: lotIdx,
              panMasked: specificPan,
              panNumbers: [specificPan],
              lotsApplied: 1,
              lotCount: 1,
              allotmentStatus: "ALLOTTED",
              allottedIndices: [0],
            });
          });
        } else if (app.allotmentStatus === "ALLOTTED") {
          const specificPan = pans[0];
          if (!panParam || specificPan.toUpperCase() === panParam) {
            allottedList.push({
              ...app,
              panMasked: specificPan,
              panNumbers: [specificPan],
              lotsApplied: 1,
              lotCount: 1,
              allotmentStatus: "ALLOTTED",
              allottedIndices: [0],
            });
          }
        }
      });
      finalApplications = allottedList;
    } else if (lotIndexParam !== null || lotIdParam || panParam) {
      const filteredList: any[] = [];
      rawApplications.forEach((app: any) => {
        const totalLots = Math.max(1, app.lotsApplied || app.lotCount || app.numberOfPanCards || 1);
        const pans = Array.isArray(app.panNumbers) && app.panNumbers.length > 0
          ? app.panNumbers
          : [app.panMasked || app.pan || "ABCDE2741D"];

        for (let i = 0; i < totalLots; i++) {
          const specificPan = pans[i] || pans[0];
          const specificLotId = totalLots > 1 ? `${app.id}_lot_${i}` : app.id;

          if (lotIndexParam !== null && i !== lotIndexParam) continue;
          if (lotIdParam && specificLotId !== lotIdParam) continue;
          if (panParam && specificPan.toUpperCase() !== panParam) continue;

          const isAllotted = Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0
            ? app.allottedIndices.includes(i)
            : (app.allotmentStatus === "ALLOTTED" && i === 0);

          filteredList.push({
            ...app,
            id: specificLotId,
            lotIndex: i,
            panMasked: specificPan,
            panNumbers: [specificPan],
            lotsApplied: 1,
            lotCount: 1,
            allotmentStatus: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
          });
        }
      });
      finalApplications = filteredList;
    }

    return NextResponse.json(
      { success: true, applications: finalApplications },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/applications error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch applications" }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────
   POST /api/applications
   Stores a new IPO application response in MongoDB.
 * ──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const newDoc: IPOApplicationDocument = {
      id: body.id || `app_${Date.now()}`,
      ipoId: body.ipoId || "1",
      ipoName: body.ipoName || "IPO",
      fundingStructure: body.fundingStructure || (body.type === "COMBO" ? "MULTI_FRIEND" : "SOLO"),
      applicantName: body.applicantName || "Member",
      memberId: body.memberId || "mem_1",
      numberOfPanCards: Math.max(1, body.numberOfPanCards || body.lotCount || 1),
      panNumbers: body.panNumbers || (body.panMasked ? [body.panMasked] : ["ABCDE2741D"]),
      totalContribution: Number(body.totalContribution) || 15000,
      contributors: Array.isArray(body.contributors)
        ? body.contributors
        : (body.participants || []).map((p: any) => ({
            memberId: p.memberId,
            memberName: p.memberName || p.name || "Member",
            amount: p.contribution || 15000,
            percentage: p.percentage || 100,
          })),
      allotmentStatus: body.allotmentStatus || "AWAITING",
      status: body.status || "AWAITING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const client = await clientPromise;
      const col = client.db(DB).collection<IPOApplicationDocument>(COL);

      // Check for PAN card uniqueness for this ipoId
      const { normalizePan, isValidPan } = await import("@/src/lib/validation/uniqueness");
      const inputPans = (newDoc.panNumbers || []).map((p) => normalizePan(p)).filter(Boolean);
      
      // Validate format of each submitted PAN
      for (const p of inputPans) {
        if (!isValidPan(p)) {
          return NextResponse.json({
            success: false,
            code: "INVALID_PAN",
            error: `Invalid PAN number '${p}'. Must be a 10-character alphanumeric PAN.`,
            message: `Invalid PAN number '${p}'. Must be a 10-character alphanumeric PAN.`,
          }, { status: 400 });
        }
      }

      newDoc.panNumbers = inputPans;

      if (inputPans.length > 0) {
        const existingDoc = await col.findOne({
          id: { $ne: newDoc.id },
          ipoId: newDoc.ipoId,
          $or: [
            { panNumbers: { $in: inputPans } },
            { panMasked: { $in: inputPans } },
            { panNormalized: { $in: inputPans } }
          ]
        });

        if (existingDoc) {
          return NextResponse.json(
            {
              success: false,
              code: "DUPLICATE_PAN",
              error: "One or more PAN cards have already been used in an application for this IPO.",
              message: "One or more PAN cards have already been used in an application for this IPO.",
            },
            { status: 409 }
          );
        }
      }

      await col.updateOne(
        { id: newDoc.id },
        { $set: newDoc },
        { upsert: true }
      );
    } catch (dbErr) {
      console.warn("POST /api/applications MongoDB unavailable, continuing locally.");
    }

    // Resolve actor from session for audit log
    const cookieStore = await cookies();
    const token = cookieStore.get("nexo_session")?.value;
    let actorUserId = undefined;
    let actorMemberId = undefined;
    let actorName = newDoc.applicantName;
    let actorUsername = undefined;
    let actorRole = undefined;

    if (token) {
      const sessionData = await validateSessionToken(token);
      if (sessionData) {
        actorUserId = sessionData.user.id;
        actorMemberId = sessionData.member.id;
        actorName = sessionData.member.name;
        actorUsername = sessionData.member.username;
        actorRole = sessionData.user.role;
      }
    }

    await logActivity({
      eventType: "APPLICATION_CREATED",
      category: "APPLICATION",
      severity: "SUCCESS",
      actorUserId,
      actorMemberId,
      actorName,
      actorUsername,
      actorRole,
      targetType: "APPLICATION",
      targetId: newDoc.id,
      targetName: `${newDoc.ipoName} Application`,
      ipoId: newDoc.ipoId,
      memberId: newDoc.memberId,
      applicationId: newDoc.id,
      metadata: {
        type: newDoc.fundingStructure,
        amount: newDoc.totalContribution,
        ipoName: newDoc.ipoName
      }
    });

    return NextResponse.json({
      success: true,
      message: "Application recorded successfully.",
      application: newDoc,
    });
  } catch (err: any) {
    console.error("POST /api/applications error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────
   PUT /api/applications
   Updates an existing IPO application in MongoDB.
 * ──────────────────────────────────────────────────────────────── */
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id) {
      return NextResponse.json({ success: false, error: "Application ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const col = client.db(DB).collection<IPOApplicationDocument>(COL);

    const updateFields: any = { updatedAt: new Date() };
    if (body.applicantName) updateFields.applicantName = body.applicantName;
    if (body.lotCount !== undefined || body.numberOfPanCards !== undefined) {
      updateFields.numberOfPanCards = body.lotCount ?? body.numberOfPanCards;
    }
    if (body.panMasked) updateFields.panMasked = body.panMasked;
    if (Array.isArray(body.panNumbers)) updateFields.panNumbers = body.panNumbers;
    if (body.totalContribution !== undefined) updateFields.totalContribution = body.totalContribution;
    if (body.allotmentStatus) updateFields.allotmentStatus = body.allotmentStatus;
    if (body.status) updateFields.status = body.status;

    await col.updateOne({ id: body.id }, { $set: updateFields });

    return NextResponse.json({ success: true, message: "Application updated successfully" });
  } catch (err: any) {
    console.error("PUT /api/applications error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* ────────────────────────────────────────────────────────────────
   DELETE /api/applications
   Deletes an IPO application from MongoDB by id.
 * ──────────────────────────────────────────────────────────────── */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Application ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const col = client.db(DB).collection<IPOApplicationDocument>(COL);

    await col.deleteOne({ id });

    return NextResponse.json({ success: true, message: "Application deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/applications error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
