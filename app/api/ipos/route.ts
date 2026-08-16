import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { validateSessionToken } from "@/src/lib/auth/session";
import { logActivity } from "@/src/features/activity/activityService";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "nexo";
const SHARED_FILE_PATH_PARENT = path.join(process.cwd(), "..", "shared_ipos.json");
const SHARED_FILE_PATH_LOCAL = path.join(process.cwd(), "shared_ipos.json");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

function cleanDate(str: string | undefined, defaultVal: string): string {
  if (!str || !str.trim()) return defaultVal;
  let cleaned = str.trim().replace(/^(\d+)([a-zA-Z]+)/, "$1 $2");
  return cleaned.replace(/\s+/g, " ");
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    let allIpos = readSharedIpos();

    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      const dbIpos = await db.collection("ipos").find({}).sort({ _id: -1 }).toArray();
      if (Array.isArray(dbIpos) && dbIpos.length > 0) {
        allIpos = dbIpos.map((item: any) => ({
          ...item,
          id: item.id || String(item._id),
          createdAt: item.createdAt || (item._id?.getTimestamp ? item._id.getTimestamp().toISOString() : new Date().toISOString()),
          addedAt: item.addedAt || item.createdAt || (item._id?.getTimestamp ? item._id.getTimestamp().toISOString() : new Date().toISOString()),
          _id: undefined,
        }));
        // Cache to local file
        writeSharedIpos(allIpos);
      } else if (allIpos.length > 0) {
        // Seed MongoDB from shared_ipos.json on first connection
        try {
          await db.collection("ipos").insertMany(
            allIpos.map((item: any) => ({
              ...item,
              _id: undefined,
              createdAt: new Date(),
            }))
          );
        } catch (_seedErr) {}
      }
    } catch (dbErr) {
      // Fallback to local file if MongoDB is temporarily offline
    }

    return NextResponse.json({ success: true, ipos: allIpos }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("GET /api/ipos error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nexo_session")?.value;
    let actorUserId = undefined;
    let actorMemberId = undefined;
    let actorName = "System";
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

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400, headers: corsHeaders }
      );
    }

    const allIpos = readSharedIpos();

    // 1. Action: Publish Profit Distribution
    if (body.action === "publishProfit") {
      const { ipoId, profitDistribution, memberPayouts = [] } = body;
      const fullProfitDist = {
        ...profitDistribution,
        memberPayouts,
      };

      const updated = allIpos.map((ipo) =>
        ipo.id === ipoId ? { ...ipo, profitDistribution: fullProfitDist } : ipo
      );
      writeSharedIpos(updated);

      // Persist to MongoDB
      try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // Update IPO record in MongoDB
        await db.collection("ipos").updateOne(
          { $or: [{ id: ipoId }, { _id: ipoId as any }] },
          {
            $set: {
              profitDistribution: fullProfitDist,
              updatedAt: new Date(),
            },
          }
        );

        // Store full profit distribution history record in profit_distributions collection
        await db.collection("profit_distributions").insertOne({
          ipoId,
          profitDistribution,
          memberPayouts,
          publishedAt: new Date(),
          publishedBy: actorName || "Admin",
          actorUserId,
          actorMemberId,
        });
      } catch (dbErr) {
        console.warn("MongoDB profit distribution update optional fallback:", dbErr);
      }
      
      await logActivity({
        eventType: "ALLOTMENT_UPDATED",
        category: "INVESTMENT",
        severity: "SUCCESS",
        actorUserId,
        actorMemberId,
        actorName,
        actorUsername,
        actorRole,
        targetType: "IPO",
        targetId: ipoId,
        targetName: "Profit Distribution",
        ipoId
      });

      return NextResponse.json({ success: true, message: "Profit distribution published and saved to database." }, { headers: corsHeaders });
    }

    // 2. Action: Add Application to IPO
    if (body.action === "addApplication") {
      const { ipoId, application } = body;
      const updated = allIpos.map((ipo) => {
        if (ipo.id === ipoId) {
          const existingApps = Array.isArray(ipo.applications) ? ipo.applications : [];
          const mergedApps = [application, ...existingApps.filter((a: any) => a.id !== application.id)];
          const totalCombined = mergedApps.reduce((sum: number, a: any) => sum + (a.totalContribution || 0), 0);
          return {
            ...ipo,
            applications: mergedApps,
            combinedCapital: totalCombined,
          };
        }
        return ipo;
      });
      writeSharedIpos(updated);
      return NextResponse.json({ success: true, message: "Application saved to IPO." }, { headers: corsHeaders });
    }

    // 3. Action: Update Existing IPO Opportunity
    if (body.action === "updateIpo") {
      const { ipoId, data } = body;
      const updated = allIpos.map((ipo) => {
        if (ipo.id === ipoId) {
          const currentMetrics = ipo.metrics || {};
          const issueSizeVal = data.issueSize !== undefined ? data.issueSize : currentMetrics.issueSize;
          const formattedIssueSize = typeof issueSizeVal === "number" ? `₹${issueSizeVal.toLocaleString("en-IN")} Cr` : String(issueSizeVal || "—");

          return {
            ...ipo,
            name: data.name ? data.name.trim() : ipo.name,
            company: data.name ? data.name.trim() : ipo.company,
            thesis: data.description ? data.description.trim() : ipo.thesis,
            registrarUrl: data.registrarUrl !== undefined ? data.registrarUrl.trim() : ipo.registrarUrl,
            metrics: {
              ...currentMetrics,
              issueSize: formattedIssueSize,
              minInvestment: data.minInvestment !== undefined ? Number(data.minInvestment) : currentMetrics.minInvestment,
              gmpPercent: data.gmpPercent !== undefined ? Number(data.gmpPercent) : (currentMetrics.gmpPercent ?? 18.5),
              openDate: data.openDate ? data.openDate.trim() : currentMetrics.openDate,
              closeDate: data.closeDate ? data.closeDate.trim() : currentMetrics.closeDate,
              allotmentDate: data.allotmentDate ? data.allotmentDate.trim() : currentMetrics.allotmentDate,
              listingDate: data.listingDate ? data.listingDate.trim() : currentMetrics.listingDate,
              fundUnblockDate: data.fundUnblockDate ? data.fundUnblockDate.trim() : currentMetrics.fundUnblockDate,
            },
          };
        }
        return ipo;
      });
      writeSharedIpos(updated);

      await logActivity({
        eventType: "IPO_UPDATED",
        category: "PRODUCT",
        severity: "INFO",
        actorUserId,
        actorMemberId,
        actorName,
        actorUsername,
        actorRole,
        targetType: "IPO",
        targetId: ipoId,
        targetName: data.name || "IPO",
        ipoId
      });

      return NextResponse.json({ success: true, message: "IPO updated successfully." }, { headers: corsHeaders });
    }

    // 3b. Action: Update Registrar Check Allotment URL
    if (body.action === "updateRegistrarUrl") {
      const { ipoId, registrarUrl } = body;
      const urlToSave = String(registrarUrl || "").trim();

      const updated = allIpos.map((ipo) => {
        if (ipo.id === ipoId || ipo.name?.toLowerCase() === String(ipoId).toLowerCase()) {
          return {
            ...ipo,
            registrarUrl: urlToSave,
          };
        }
        return ipo;
      });
      writeSharedIpos(updated);

      try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        await db.collection("ipos").updateOne(
          { $or: [{ id: ipoId }, { name: { $regex: new RegExp(`^${ipoId}$`, "i") } }] },
          { $set: { registrarUrl: urlToSave } }
        );
      } catch (err) {
        console.warn("MongoDB update optional for registrarUrl:", err);
      }

      return NextResponse.json({ success: true, message: "Check Allotment link updated successfully.", registrarUrl: urlToSave }, { headers: corsHeaders });
    }

    // 4. Action: Create New IPO Opportunity
    const name = String(body.name || body.company || body.data?.name || "").trim();
    const minInvestment = Number(body.minInvestment || body.minimumInvestment || body.data?.minInvestment) || 15000;
    const issueSize = Number(body.issueSize || body.data?.issueSize) || 2400;
    const description = String(body.description || body.thesis || body.data?.description || "").trim() || "Strong operating profile and growth prospects.";
    const closeDate = String(body.closeDate || body.data?.closeDate || "").trim() || "28 Aug 2026";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Missing required field: name." },
        { status: 400, headers: corsHeaders }
      );
    }

    const formattedIssueSize = typeof issueSize === "number" ? `₹${issueSize.toLocaleString("en-IN")} Cr` : String(issueSize);

    const newIpo = {
      id: `ipo_${Date.now()}`,
      name: name.trim(),
      company: name.trim(),
      logo: name.trim().substring(0, 2).toUpperCase(),
      category: body.type || body.category || "Mainboard",
      status: body.status || "APPLICATION_OPEN",
      recommendation: body.recommendation || body.decision || "APPLY",
      thesis: description.trim(),
      isHidden: false,
      metrics: {
        issueSize: formattedIssueSize,
        priceBand: { min: body.priceMin || 0, max: body.priceMax || 0 },
        lotSize: body.lotSize || 1,
        minInvestment: minInvestment,
        gmpPercent: Number(body.gmpPercent !== undefined ? body.gmpPercent : 18.5),
        openDate: cleanDate(body.openDate, "18 Aug 2026"),
        closeDate: cleanDate(closeDate, "28 Aug 2026"),
        allotmentDate: cleanDate(body.allotmentDate, "01 Sep 2026"),
        listingDate: cleanDate(body.listingDate, "04 Sep 2026"),
        fundUnblockDate: cleanDate(body.fundUnblockDate, "02 Sep 2026"),
      },
      createdBy: String(body.createdBy || "Shivam Prasad"),
      participantsCount: 0,
      combinedCapital: 0,
      applications: [],
      createdAt: new Date().toISOString(),
      addedAt: new Date().toISOString(),
    };

    const updated = [newIpo, ...allIpos];
    writeSharedIpos(updated);

    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      await db.collection("ipos").updateOne(
        { id: newIpo.id },
        { $set: newIpo },
        { upsert: true }
      );
    } catch (dbErr) {
      console.warn("MongoDB insert optional fallback:", dbErr);
    }

    await logActivity({
      eventType: "IPO_CREATED",
      category: "PRODUCT",
      severity: "INFO",
      actorUserId,
      actorMemberId,
      actorName,
      actorUsername,
      actorRole,
      targetType: "IPO",
      targetId: newIpo.id,
      targetName: name.trim(),
      ipoId: newIpo.id
    });

    return NextResponse.json({
      success: true,
      ipo: newIpo,
      message: `✓ IPO added successfully. ${name} is now visible on the user website.`,
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("POST /api/ipos error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing IPO ID." }, { status: 400, headers: corsHeaders });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("nexo_session")?.value;
    let actorUserId = undefined;
    let actorMemberId = undefined;
    let actorName = "System";
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

    const allIpos = readSharedIpos();
    const updated = allIpos.map((ipo) =>
      ipo.id === id ? { ...ipo, isHidden: true } : ipo
    );

    writeSharedIpos(updated);

    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      await db.collection("ipos").updateOne(
        { $or: [{ id }, { _id: id as any }] },
        { $set: { isHidden: true } }
      );
    } catch (dbErr) {
      console.warn("MongoDB delete optional fallback:", dbErr);
    }

    await logActivity({
      eventType: "IPO_ARCHIVED",
      category: "PRODUCT",
      severity: "INFO",
      actorUserId,
      actorMemberId,
      actorName,
      actorUsername,
      actorRole,
      targetType: "IPO",
      targetId: id,
      targetName: "IPO",
      ipoId: id
    });

    return NextResponse.json({ success: true, message: "✓ IPO removed." }, { headers: corsHeaders });
  } catch (err: any) {
    console.error("DELETE /api/ipos error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500, headers: corsHeaders });
  }
}
