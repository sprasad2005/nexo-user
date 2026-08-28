import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import clientPromise from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";
import { formatApplicantNames } from "@/lib/mockData";

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
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedIpoId = searchParams.get("ipoId")?.trim();

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const activeMemberId = auth.memberId;
    const activeUserId = auth.userId;
    const activeUsername = (auth.username || "").toLowerCase().replace(/^@+/, "");
    const activeDisplayName = (auth.displayName || "").toLowerCase();

    // Helper to test if a contributor or participant belongs to the authenticated user
    const isUserSelf = (identifier?: string, name?: string) => {
      if (identifier) {
        const idClean = identifier.trim();
        if (idClean === activeMemberId || idClean === activeUserId) return true;
      }
      if (name) {
        const nameClean = name.trim().toLowerCase().replace(/^@+/, "");
        if (nameClean === activeUsername) return true;
        if (activeDisplayName && nameClean === activeDisplayName) return true;
      }
      return false;
    };

    // Parallel MongoDB queries
    const [allDbApps, allIpos, allProfitDists, userTxns] = await Promise.all([
      db.collection("applications").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("ipos").find({}).toArray(),
      db.collection("profit_distributions").find({}).toArray(),
      db.collection("transactions").find({
        $or: [
          { memberId: activeMemberId },
          { memberId: activeUserId },
          { userId: activeUserId },
          { participants: activeUsername },
          { participants: `@${activeUsername}` },
        ],
      }).sort({ createdAt: -1 }).toArray(),
    ]);

    // Fallback merge with shared_ipos.json
    const sharedIpos = readSharedIpos();
    const ipoMap = new Map<string, any>();

    sharedIpos.forEach((ipo) => {
      ipoMap.set(ipo.id, ipo);
    });
    allIpos.forEach((ipo) => {
      const id = ipo.id || ipo._id?.toString();
      if (id) {
        ipoMap.set(id, { ...ipoMap.get(id), ...ipo });
      }
    });

    // Filter applications where the authenticated user is a participant/applicant/contributor
    const userApps = allDbApps.filter((app) => {
      if (isUserSelf(app.memberId, app.applicantName)) return true;
      if (Array.isArray(app.contributors) && app.contributors.some((c: any) => isUserSelf(c.memberId, c.memberName))) return true;
      if (Array.isArray(app.participants) && app.participants.some((p: any) => isUserSelf(p.memberId, p.memberName || p.memberUsername))) return true;
      return false;
    });

    // 1. Group user applications by IPO ID
    const appsByIpoId = new Map<string, any[]>();
    userApps.forEach((app) => {
      const targetIpoId = app.ipoId || "unknown";
      if (!appsByIpoId.has(targetIpoId)) {
        appsByIpoId.set(targetIpoId, []);
      }
      appsByIpoId.get(targetIpoId)!.push(app);
    });

    // Group all applications in database by IPO ID (for total IPO applied capital by ALL users)
    const allAppsByIpoId = new Map<string, any[]>();
    allDbApps.forEach((app) => {
      const targetIpoId = app.ipoId || "unknown";
      if (!allAppsByIpoId.has(targetIpoId)) {
        allAppsByIpoId.set(targetIpoId, []);
      }
      allAppsByIpoId.get(targetIpoId)!.push(app);
    });

    // 2. Compute exact profit per IPO and cumulative profit across all historical IPOs for the user
    let cumulativeProfit = 0;
    const ipoProfitMap = new Map<string, number>();

    allProfitDists.forEach((dist: any) => {
      const targetIpoId = dist.ipoId;
      const memberPayouts = dist.memberPayouts || dist.profitDistribution?.memberPayouts || dist.participants || [];
      
      // Find all payout entries for this authenticated user in this distribution
      const userPayouts = memberPayouts.filter((p: any) =>
        isUserSelf(p.memberId, p.name || p.memberName || p.username)
      );

      let distProfitForUser = 0;
      userPayouts.forEach((p: any) => {
        distProfitForUser += Number(p.profit || p.profitAmount || 0);
      });

      if (distProfitForUser > 0) {
        cumulativeProfit += distProfitForUser;
        if (targetIpoId) {
          const cleanId = targetIpoId.replace(/^pub_/, "");
          ipoProfitMap.set(targetIpoId, distProfitForUser);
          ipoProfitMap.set(cleanId, distProfitForUser);
          ipoProfitMap.set(`pub_${cleanId}`, distProfitForUser);
        }
      }
    });

    // 3. Build list of Applied IPOs
    const appliedIpos: any[] = [];

    for (const [ipoId, apps] of appsByIpoId.entries()) {
      const ipoInfo = ipoMap.get(ipoId) || ipoMap.get(ipoId.replace(/^pub_/, "")) || {
        id: ipoId,
        name: apps[0]?.ipoName || "IPO",
        category: "Mainboard",
        status: "CLOSED",
      };

      const ipoLotPrice = Number(ipoInfo.metrics?.minInvestment) || Number(apps[0]?.totalContribution) || 15000;

      // Find all applications submitted by ALL users for this IPO
      const allAppsForThisIpo = allAppsByIpoId.get(ipoId) || allAppsByIpoId.get(ipoId.replace(/^pub_/, "")) || apps;

      // Total lots applied by all users across entire IPO
      const totalAllUsersLots = allAppsForThisIpo.reduce((sum, a) => {
        const lots = Math.max(1, a.numberOfPanCards || a.lotsApplied || a.lotCount || (Array.isArray(a.panNumbers) ? a.panNumbers.length : 1) || 1);
        return sum + lots;
      }, 0);

      // Total money applied on this IPO = total applications by all users * ipo lot price
      const totalIpoAppliedCapital = Math.max(
        totalAllUsersLots * ipoLotPrice,
        allAppsForThisIpo.reduce((sum, a) => sum + (Number(a.totalContribution) || 0), 0)
      );

      let yourCapitalForIpo = 0;
      let yourLotsForIpo = 0;
      let earliestDate: Date = new Date();
      let hasAllotted = false;

      apps.forEach((app) => {
        const appDate = app.createdAt ? new Date(app.createdAt) : new Date();
        if (appDate < earliestDate) earliestDate = appDate;

        const appTotalLots = Math.max(1, app.numberOfPanCards || app.lotsApplied || app.lotCount || (Array.isArray(app.panNumbers) ? app.panNumbers.length : 1) || 1);
        const appTotalCap = Number(app.totalContribution) || (appTotalLots * ipoLotPrice);

        const panNumbersList: string[] = Array.isArray(app.panNumbers) && app.panNumbers.length > 0
          ? app.panNumbers
          : (app.panNumber ? [app.panNumber] : []);

        const isAppAllotted = (Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0) ||
          Boolean(app.allottedPan) ||
          (app.allotmentStatus === "ALLOTTED" && panNumbersList.length <= 1);

        if (isAppAllotted) {
          hasAllotted = true;
        }

        // Exact money applied by user:
        // Solo applied lots money + Multi-friend how much money user applied
        const isMultiFriend = app.fundingStructure === "MULTI_FRIEND" || (Array.isArray(app.contributors) && app.contributors.length > 1);

        if (isMultiFriend && Array.isArray(app.contributors) && app.contributors.length > 0) {
          let userContribAmt = 0;
          app.contributors.forEach((c: any) => {
            if (isUserSelf(c.memberId, c.memberName)) {
              userContribAmt += Number(c.amount) || 0;
            }
          });

          if (userContribAmt > 0) {
            yourCapitalForIpo += userContribAmt;
            const proportion = appTotalCap > 0 ? userContribAmt / appTotalCap : 1;
            yourLotsForIpo += Math.max(1, Math.round(proportion * appTotalLots));
          }
        } else if (isUserSelf(app.memberId, app.applicantName)) {
          // Solo application by user
          yourCapitalForIpo += appTotalCap;
          yourLotsForIpo += appTotalLots;
        }
      });

      // Calculate exact money-wise lots applied by user (e.g. 5.5, 5.67, 1)
      const exactMoneyWiseLots = ipoLotPrice > 0 ? Math.round((yourCapitalForIpo / ipoLotPrice) * 100) / 100 : yourLotsForIpo;

      // Calculate profit for this IPO
      let ipoProfit = ipoProfitMap.get(ipoId) || ipoProfitMap.get(ipoId.replace(/^pub_/, "")) || 0;

      // If profit distribution hasn't been explicitly recorded, calculate potential listing gain if finalized
      if (ipoProfit === 0 && hasAllotted && ipoInfo.listingGainPercent && yourCapitalForIpo > 0) {
        ipoProfit = Math.round((yourCapitalForIpo * Number(ipoInfo.listingGainPercent)) / 100);
      }

      let status = "AWAITING";
      const hasAnyAllotment = allAppsForThisIpo.some(
        (a) =>
          a.allotmentStatus === "ALLOTTED" ||
          a.status === "ALLOTTED" ||
          (Array.isArray(a.allottedIndices) && a.allottedIndices.length > 0) ||
          Boolean(a.allottedPan)
      ) || allProfitDists.some((d: any) => (d.ipoId === ipoId || d.ipoId === ipoId.replace(/^pub_/, "")) && d.memberPayouts?.length > 0);

      const isIpoFinalized = Boolean(ipoInfo.allotmentFinalized || hasAnyAllotment);

      if (hasAllotted) {
        status = "ALLOTTED";
      } else if (isIpoFinalized) {
        status = "ALLOTMENT_OUT";
      } else {
        status = "AWAITING";
      }

      appliedIpos.push({
        ipoId,
        ipoName: ipoInfo.name || apps[0]?.ipoName || "IPO",
        category: ipoInfo.category || "Mainboard",
        status,
        appliedDate: earliestDate,
        yourCapital: yourCapitalForIpo,
        groupCapital: totalIpoAppliedCapital,
        yourLots: exactMoneyWiseLots,
        groupLots: totalAllUsersLots,
        yourApplicationsCount: exactMoneyWiseLots,
        groupApplicationsCount: totalAllUsersLots,
        profit: ipoProfit,
      });
    }

    // Sort applied IPOs chronologically descending (newest first)
    appliedIpos.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());

    // 4. Handle Empty State
    if (appliedIpos.length === 0) {
      return NextResponse.json(
        {
          success: true,
          hasApplications: false,
          appliedIpos: [],
          selectedIpo: null,
          summary: {
            totalGroupCapital: 0,
            groupApplicationsCount: 0,
            yourCapital: 0,
            yourApplicationsCount: 0,
            thisIpoProfit: 0,
            tillNowProfit: 0,
            totalIposCount: 0,
          },
          transactions: [],
        },
        {
          headers: {
            "Cache-Control": "private, max-age=1, stale-while-revalidate=5",
          },
        }
      );
    }

    // 5. Select Active IPO (From Query Parameter or Most Recent Applied)
    let selectedIpoSummary = appliedIpos[0];
    if (requestedIpoId) {
      const match = appliedIpos.find(
        (i) =>
          i.ipoId === requestedIpoId ||
          i.ipoId === requestedIpoId.replace(/^pub_/, "") ||
          i.ipoId === `pub_${requestedIpoId.replace(/^pub_/, "")}` ||
          i.ipoName.toLowerCase() === requestedIpoId.toLowerCase()
      );
      if (match) {
        selectedIpoSummary = match;
      }
    }

    const selectedIpoId = selectedIpoSummary.ipoId;
    const selectedIpoApps = appsByIpoId.get(selectedIpoId) || [];
    const selectedIpoInfo = ipoMap.get(selectedIpoId) || ipoMap.get(selectedIpoId.replace(/^pub_/, "")) || {};

    // 6. Allotted Accounts & PAN Cards for Selected IPO (Exact published PANs)
    const allAppsForSelectedIpo = allAppsByIpoId.get(selectedIpoId) || allAppsByIpoId.get(selectedIpoId.replace(/^pub_/, "")) || [];
    
    const allottedAccountsMap = new Map<string, {
      applicantName: string;
      username: string;
      pan: string;
      lots: number;
      status: string;
      isSelf: boolean;
      allottedDate?: string | Date;
    }>();

    const allottedPansSet = new Set<string>();
    const isIpoAllotmentFinalized = allAppsForSelectedIpo.some(
      (a) => a.allotmentStatus === "ALLOTTED" || a.allotmentStatus === "NOT_ALLOTTED" || a.status === "ALLOTTED" || a.status === "NOT_ALLOTTED"
    );

    allAppsForSelectedIpo.forEach((app) => {
      const isSelf = isUserSelf(app.memberId, app.applicantName);
      const name = formatApplicantNames(app);
      const username = (app.applicantName || "").replace(/^@+/, "");
      const allottedDate = app.allottedAt || app.updatedAt || app.createdAt;
      const panNumbersList: string[] = Array.isArray(app.panNumbers) && app.panNumbers.length > 0
        ? app.panNumbers
        : (app.panNumber ? [app.panNumber] : (app.panMasked ? [app.panMasked] : []));

      // Extract the EXACT allotted PAN(s) from this application based on Admin selection
      const allottedPansForThisApp: string[] = [];

      if (app.allottedPan) {
        allottedPansForThisApp.push(app.allottedPan.trim().toUpperCase());
      } else if (Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0) {
        app.allottedIndices.forEach((idx: number) => {
          if (panNumbersList[idx]) {
            allottedPansForThisApp.push(panNumbersList[idx].trim().toUpperCase());
          }
        });
      } else if (app.allotmentStatus === "ALLOTTED" || app.status === "ALLOTTED") {
        if (panNumbersList.length > 0) {
          allottedPansForThisApp.push(panNumbersList[0].trim().toUpperCase());
        }
      }

      allottedPansForThisApp.forEach((pan) => {
        allottedPansSet.add(pan);

        const key = `${username}_${pan}`;
        if (!allottedAccountsMap.has(key)) {
          allottedAccountsMap.set(key, {
            applicantName: isSelf ? "You" : name,
            username,
            pan,
            lots: 1,
            status: "ALLOTTED",
            isSelf,
            allottedDate,
          });
        }
      });
    });

    const selectedIpoDist = allProfitDists.find(
      (d: any) => d.ipoId === selectedIpoId || d.ipoId === selectedIpoId.replace(/^pub_/, "")
    );
    if (selectedIpoDist && Array.isArray(selectedIpoDist.memberPayouts)) {
      selectedIpoDist.memberPayouts.forEach((p: any) => {
        if (p.pan) {
          allottedPansSet.add(p.pan.trim().toUpperCase());
        }
      });
    }

    const allottedAccounts = Array.from(allottedAccountsMap.values());
    allottedAccounts.sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      return a.username.localeCompare(b.username);
    });

    const groupBreakdown: any[] = [];

    const selectedIpoTxns: any[] = [];

    // Process all applications for the user in this IPO
    selectedIpoApps.forEach((app) => {
      const contributors = Array.isArray(app.contributors) ? app.contributors : [];
      const distinctOtherContributors = contributors.filter((c: any) => !isUserSelf(c.memberId, c.memberName));
      const isAllSelf = distinctOtherContributors.length === 0;

      const lotCount = Math.max(1, app.numberOfPanCards || app.lotsApplied || app.lotCount || (Array.isArray(app.panNumbers) ? app.panNumbers.length : 1) || 1);
      const appTotalCap = Number(app.totalContribution) || (lotCount * (Number(selectedIpoInfo.metrics?.minInvestment) || 15000));
      const lotPrice = Math.round(appTotalCap / lotCount);

      if (isAllSelf && lotCount > 1) {
        // When applied multiple lots at once by the same user, separate each into its own Solo application row
        for (let i = 0; i < lotCount; i++) {
          const pan = Array.isArray(app.panNumbers) && app.panNumbers[i]
            ? app.panNumbers[i].trim().toUpperCase()
            : (app.panNumber ? app.panNumber.trim().toUpperCase() : undefined);

          let rowStatus = "AWAITING";
          if (pan && allottedPansSet.has(pan)) {
            rowStatus = "ALLOTTED";
          } else if (isIpoAllotmentFinalized) {
            rowStatus = "NOT_ALLOTTED";
          } else if (app.allotmentStatus === "NOT_ALLOTTED" || app.status === "NOT_ALLOTTED") {
            rowStatus = "NOT_ALLOTTED";
          }

          selectedIpoTxns.push({
            id: `${app.id || "app"}_lot_${i + 1}`,
            ipoId: selectedIpoId,
            ipoName: selectedIpoSummary.ipoName,
            type: "SOLO",
            participants: [activeUsername],
            pan: pan || "—",
            amount: lotPrice,
            userAmount: lotPrice,
            totalPoolAmount: lotPrice,
            status: rowStatus,
            lots: 1,
            createdAt: app.createdAt || new Date(),
          });
        }
      } else if (isAllSelf) {
        const pan = Array.isArray(app.panNumbers) && app.panNumbers[0]
          ? app.panNumbers[0].trim().toUpperCase()
          : (app.panNumber ? app.panNumber.trim().toUpperCase() : undefined);

        let rowStatus = "AWAITING";
        if (pan && allottedPansSet.has(pan)) {
          rowStatus = "ALLOTTED";
        } else if (isIpoAllotmentFinalized) {
          rowStatus = "NOT_ALLOTTED";
        } else if (app.allotmentStatus === "NOT_ALLOTTED" || app.status === "NOT_ALLOTTED") {
          rowStatus = "NOT_ALLOTTED";
        }

        selectedIpoTxns.push({
          id: app.id || `app_${Date.now()}`,
          ipoId: selectedIpoId,
          ipoName: selectedIpoSummary.ipoName,
          type: "SOLO",
          participants: [activeUsername],
          pan: pan || "—",
          amount: appTotalCap,
          userAmount: appTotalCap,
          totalPoolAmount: appTotalCap,
          status: rowStatus,
          lots: 1,
          createdAt: app.createdAt || new Date(),
        });
      } else {
        // Genuinely Multi-Friend application with distinct participants
        let userContributedAmt = 0;
        let userPan: string | undefined = undefined;
        contributors.forEach((c: any) => {
          if (isUserSelf(c.memberId, c.memberName)) {
            userContributedAmt += Number(c.amount) || 0;
            if (c.pan) userPan = c.pan.trim().toUpperCase();
          }
        });

        if (!userPan && Array.isArray(app.panNumbers) && app.panNumbers.length > 0) {
          userPan = app.panNumbers[0].trim().toUpperCase();
        }

        let rowStatus = "AWAITING";
        if (userPan && allottedPansSet.has(userPan)) {
          rowStatus = "ALLOTTED";
        } else if (isIpoAllotmentFinalized) {
          rowStatus = "NOT_ALLOTTED";
        } else if (app.allotmentStatus === "NOT_ALLOTTED" || app.status === "NOT_ALLOTTED") {
          rowStatus = "NOT_ALLOTTED";
        }

        const participantNames = [...new Set(contributors.map((c: any) => (c.memberName || "").replace(/^@+/, "")))];

        selectedIpoTxns.push({
          id: app.id || `app_${Date.now()}`,
          ipoId: selectedIpoId,
          ipoName: selectedIpoSummary.ipoName,
          type: "GROUP",
          participants: participantNames,
          pan: userPan || "—",
          amount: userContributedAmt > 0 ? userContributedAmt : appTotalCap,
          userAmount: userContributedAmt > 0 ? userContributedAmt : appTotalCap,
          totalPoolAmount: appTotalCap,
          status: rowStatus,
          lots: lotCount,
          createdAt: app.createdAt || new Date(),
        });
      }
    });

    // Also include any Profit Distribution payout transactions
    const payoutTxns = userTxns.filter(
      (t) =>
        t.type === "PROFIT_DISTRIBUTION" &&
        (t.ipoId === selectedIpoId ||
          t.ipoId === selectedIpoId.replace(/^pub_/, "") ||
          t.ipoId === `pub_${selectedIpoId.replace(/^pub_/, "")}` ||
          (t.ipoName && t.ipoName.toLowerCase() === selectedIpoSummary.ipoName.toLowerCase()))
    );

    payoutTxns.forEach((p) => {
      selectedIpoTxns.push({
        id: p.id,
        ipoId: selectedIpoId,
        ipoName: selectedIpoSummary.ipoName,
        type: "PROFIT_DISTRIBUTION",
        participants: [activeUsername],
        amount: Number(p.amount) || 0,
        userAmount: Number(p.amount) || 0,
        totalPoolAmount: Number(p.amount) || 0,
        status: "COMPLETED",
        createdAt: p.createdAt || new Date(),
      });
    });

    // Sort descending by date
    selectedIpoTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(
      {
        success: true,
        hasApplications: true,
        appliedIpos,
        selectedIpo: {
          id: selectedIpoId,
          name: selectedIpoSummary.ipoName,
          category: selectedIpoSummary.category,
          status: selectedIpoSummary.status,
          appliedDate: selectedIpoSummary.appliedDate,
          minInvestment: selectedIpoInfo.metrics?.minInvestment || 15000,
          lotSize: selectedIpoInfo.metrics?.lotSize || 1,
          allotmentDate: selectedIpoInfo.metrics?.allotmentDate || "01 Sep 2026",
          listingDate: selectedIpoInfo.metrics?.listingDate || "04 Sep 2026",
          isSolo: selectedIpoApps.every((a) => a.fundingStructure === "SOLO" || (!Array.isArray(a.contributors) || a.contributors.length <= 1)),
        },
        summary: {
          totalGroupCapital: selectedIpoSummary.groupCapital,
          groupApplicationsCount: selectedIpoSummary.groupLots,
          yourCapital: selectedIpoSummary.yourCapital,
          yourApplicationsCount: selectedIpoSummary.yourLots,
          thisIpoProfit: selectedIpoSummary.profit,
          tillNowProfit: cumulativeProfit,
          totalIposCount: appliedIpos.length,
          allottedAccountsCount: allottedAccounts.length,
        },
        allottedAccounts,
        groupBreakdown,
        transactions: selectedIpoTxns,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
        },
      }
    );
  } catch (err: any) {
    console.error("GET /api/portfolio error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch portfolio data" }, { status: 500 });
  }
}
