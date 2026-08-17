import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/src/lib/auth/authorization";

import { MOCK_MEMBERS, formatApplicantNames } from "@/lib/mockData";

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

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();

    const { searchParams } = new URL(req.url);
    let selectedIpoId = searchParams.get("ipoId");

    // Read real IPOs from shared_ipos.json
    const sharedIpos = readSharedIpos();

    // Fetch MongoDB state
    let dbIpos: any[] = [];
    let dbApps: any[] = [];
    let dbMembers: any[] = [];

    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      const [iposArr, memsArr] = await Promise.all([
        db
          .collection("ipos")
          .find(
            { isHidden: { $ne: true }, isArchived: { $ne: true } },
            {
              projection: {
                id: 1,
                name: 1,
                company: 1,
                category: 1,
                status: 1,
                allotmentFinalized: 1,
                allotmentFinalizedAt: 1,
                allotmentFinalizedBy: 1,
                metrics: 1,
                applications: 1,
                createdAt: 1,
                addedAt: 1,
              },
            }
          )
          .sort({ createdAt: -1 })
          .toArray(),
        db
          .collection("members")
          .find({}, { projection: { id: 1, name: 1, username: 1, avatar: 1, panMasked: 1 } })
          .toArray(),
      ]);

      dbIpos = iposArr;
      dbMembers = memsArr;

      // If no ipoId query was passed, default to first available IPO
      if (!selectedIpoId) {
        selectedIpoId = dbIpos[0]?.id || dbIpos[0]?._id?.toString() || sharedIpos[0]?.id || "";
      }

      // Query ONLY applications for the target IPO
      if (selectedIpoId) {
        dbApps = await db
          .collection("applications")
          .find(
            { ipoId: selectedIpoId },
            {
              projection: {
                id: 1,
                ipoId: 1,
                ipoName: 1,
                memberId: 1,
                applicantName: 1,
                panMasked: 1,
                panFull: 1,
                panNumbers: 1,
                lotCount: 1,
                numberOfPanCards: 1,
                allotmentStatus: 1,
                status: 1,
                totalContribution: 1,
                participants: 1,
                contributors: 1,
                allottedIndices: 1,
                createdAt: 1,
                applicationNumber: 1,
              },
            }
          )
          .sort({ createdAt: -1 })
          .toArray();
      }
    } catch (_e) {
      console.warn("MongoDB fetch optional, using shared_ipos.json data.");
    }

    // Member lookup map
    const memberMap = new Map<string, any>();
    MOCK_MEMBERS.forEach((m) => {
      if (m.id) memberMap.set(m.id, m);
      if (m.username) memberMap.set(m.username.toLowerCase(), m);
      if (m.name) memberMap.set(m.name.toLowerCase(), m);
    });
    dbMembers.forEach((m) => {
      if (m.id) memberMap.set(m.id, m);
      if (m.username) memberMap.set(m.username.toLowerCase(), m);
      if (m.name) memberMap.set(m.name.toLowerCase(), m);
    });

    // Combine IPOs from shared_ipos.json and MongoDB
    const ipoMap = new Map<string, any>();

    sharedIpos.forEach((ipo) => {
      if (!ipo.isHidden) {
        ipoMap.set(ipo.id, {
          id: ipo.id,
          name: ipo.name,
          company: ipo.company || ipo.name,
          category: ipo.category || "Mainboard",
          status: ipo.status || "APPLICATION_OPEN",
          allotmentFinalized: Boolean(ipo.allotmentFinalized),
          allotmentFinalizedAt: ipo.allotmentFinalizedAt || null,
          allotmentFinalizedBy: ipo.allotmentFinalizedBy || null,
          metrics: ipo.metrics || {},
          embeddedApplications: Array.isArray(ipo.applications) ? ipo.applications : [],
        });
      }
    });

    dbIpos.forEach((ipo) => {
      const id = ipo.id || ipo._id?.toString();
      if (id && !ipo.isHidden) {
        const existing = ipoMap.get(id);
        const embedded = Array.isArray(ipo.applications) ? ipo.applications : [];
        if (existing) {
          ipoMap.set(id, {
            ...existing,
            allotmentFinalized: Boolean(ipo.allotmentFinalized || existing.allotmentFinalized),
            allotmentFinalizedAt: ipo.allotmentFinalizedAt || existing.allotmentFinalizedAt || null,
            allotmentFinalizedBy: ipo.allotmentFinalizedBy || existing.allotmentFinalizedBy || null,
            createdAt: ipo.createdAt || existing.createdAt || null,
            addedAt: ipo.addedAt || existing.addedAt || null,
            embeddedApplications: [...existing.embeddedApplications, ...embedded],
          });
        } else {
          ipoMap.set(id, {
            id,
            name: ipo.name,
            company: ipo.company || ipo.name,
            category: ipo.category || "Mainboard",
            status: ipo.status || "APPLICATION_OPEN",
            allotmentFinalized: Boolean(ipo.allotmentFinalized),
            allotmentFinalizedAt: ipo.allotmentFinalizedAt || null,
            allotmentFinalizedBy: ipo.allotmentFinalizedBy || null,
            createdAt: ipo.createdAt || null,
            addedAt: ipo.addedAt || ipo.createdAt || null,
            metrics: ipo.metrics || {},
            embeddedApplications: embedded,
          });
        }
      }
    });

    const ipos = Array.from(ipoMap.values()).map(({ embeddedApplications, ...rest }) => rest);

    let selectedIpo: any = null;
    let applications: any[] = [];
    let metrics = {
      totalApplications: 0,
      pendingApplications: 0,
      allottedApplications: 0,
      notAllottedApplications: 0,
      totalLotsApplied: 0,
    };

    if (selectedIpoId) {
      selectedIpo = ipos.find((i) => i.id === selectedIpoId) || null;

      if (selectedIpo) {
        const targetIpoData = ipoMap.get(selectedIpoId);
        const embedded = targetIpoData?.embeddedApplications || [];

        // Filter MongoDB applications matching selected IPO ID or Name
        const matchingDbApps = dbApps.filter(
          (a) =>
            a.ipoId === selectedIpoId ||
            (a.ipoName && a.ipoName.toLowerCase() === selectedIpo.name.toLowerCase())
        );

        // Deduplicate applications by ID or applicationNumber
        const appMap = new Map<string, any>();

        const processRawApp = (app: any) => {
          const appId = app.id || app._id?.toString() || app.applicationNumber;
          if (!appId || appMap.has(appId)) return;

          const member = memberMap.get(app.memberId) || memberMap.get(app.applicantName?.toLowerCase()?.replace(/^@/, ""));

          const pan =
            app.panNumbers?.[0] ||
            app.panMasked ||
            app.panFull ||
            app.participants?.[0]?.panMasked ||
            app.participants?.[0]?.panFull ||
            member?.panMasked ||
            member?.panFull ||
            "N/A";

          const appNo = app.applicationNumber || app.id || "APP-001";
          const lots = app.lotCount || app.numberOfPanCards || app.contributors?.length || app.participants?.length || 1;

          const statusRaw = String(app.allotmentStatus || app.status || "AWAITING").toUpperCase();
          let normalizedStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED" = "PENDING";
          if (statusRaw === "ALLOTTED") normalizedStatus = "ALLOTTED";
          else if (statusRaw === "NOT_ALLOTTED" || statusRaw === "REFUNDED") normalizedStatus = "NOT_ALLOTTED";

          const cleanApplicant = formatApplicantNames(app);

          // Extract first applicant/participant username
          let cleanUsername = "";
          if (Array.isArray(app.participants) && app.participants.length > 0 && app.participants[0]?.memberName) {
            cleanUsername = String(app.participants[0].memberName).split(",")[0].replace(/^@+/, "").trim();
          }
          if (!cleanUsername) {
            cleanUsername = cleanApplicant.split(",")[0].replace(/^@+/, "").trim();
          }
          if (member?.username && member.username !== "admin" && member.username !== "ankitgod") {
            cleanUsername = member.username.replace(/^@+/, "").trim();
          }
          cleanUsername = cleanUsername.toLowerCase().replace(/[^a-z0-9_]/g, "");
          if (!cleanUsername) cleanUsername = "user";

          const panNumbersList = Array.isArray(app.panNumbers) && app.panNumbers.length > 0
            ? app.panNumbers
            : [pan];

          appMap.set(appId, {
            id: appId,
            applicantName: cleanApplicant,
            username: cleanUsername,
            memberId: app.memberId || member?.id || undefined,
            memberAvatar: member?.avatar || undefined,
            pan: pan,
            panNumbers: panNumbersList,
            allottedIndices: app.allottedIndices || (normalizedStatus === "ALLOTTED" ? Array.from({ length: Number(lots) || 1 }, (_, i) => i) : []),
            applicationNumber: appNo,
            lotsApplied: Number(lots) || 1,
            allotmentStatus: normalizedStatus,
            rawStatus: app.allotmentStatus || app.status || "AWAITING",
            totalContribution: app.totalContribution || 15000,
            participants: app.participants || [],
            contributors: app.contributors || [],
            createdAt: app.createdAt || new Date(),
          });
        };

        embedded.forEach(processRawApp);
        matchingDbApps.forEach(processRawApp);

        applications = Array.from(appMap.values());

        // Calculate summary statistics
        metrics.totalApplications = applications.length;
        metrics.pendingApplications = applications.filter((a) => a.allotmentStatus === "PENDING").length;
        metrics.allottedApplications = applications.filter((a) => a.allotmentStatus === "ALLOTTED").length;
        metrics.notAllottedApplications = applications.filter((a) => a.allotmentStatus === "NOT_ALLOTTED").length;
        metrics.totalLotsApplied = applications.reduce((sum, a) => sum + (a.lotsApplied || 1), 0);
      }
    }

    return NextResponse.json(
      {
        success: true,
        currentUserRole: auth.role,
        ipos,
        selectedIpo,
        applications,
        metrics,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/admin/allotment error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch allotment data." }, { status: 500 });
  }
}
