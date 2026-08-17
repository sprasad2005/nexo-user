import { ipoRepository } from "@/src/lib/db/repositories/ipoRepository";
import { applicationRepository } from "@/src/lib/db/repositories/applicationRepository";
import { memberRepository } from "@/src/lib/db/repositories/memberRepository";
import { logActivity } from "@/src/features/activity/activityService";
import { AuthContext } from "@/src/lib/auth/authorization";

export const allotmentService = {
  async getAllotmentData(selectedIpoId?: string | null) {
    const ipos = await ipoRepository.find(
      { isHidden: { $ne: true }, isArchived: { $ne: true } },
      { sort: { createdAt: -1 } }
    );

    let selectedIpo = ipos.find((i) => i.id === selectedIpoId) || ipos[0] || null;

    let applications: any[] = [];
    if (selectedIpo) {
      applications = await applicationRepository.findByIpoId(selectedIpo.id, selectedIpo.name);
    }

    const members = await memberRepository.find({}, {
      projection: { id: 1, name: 1, username: 1, avatar: 1, panMasked: 1, panFull: 1 }
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const enrichedApps = applications.map((app) => {
      const member = memberMap.get(app.memberId);
      return {
        ...app,
        memberName: app.applicantName || member?.name || "Unknown",
        panNumber: app.panNumbers?.[0] || member?.panMasked || "ABCDE1234F",
        memberAvatar: member?.avatar || "/oggy.png",
      };
    });

    const metrics = {
      totalApplications: enrichedApps.length,
      pendingApplications: enrichedApps.filter((a) => a.allotmentStatus === "PENDING" || a.allotmentStatus === "AWAITING").length,
      allottedApplications: enrichedApps.filter((a) => a.allotmentStatus === "ALLOTTED").length,
      notAllottedApplications: enrichedApps.filter((a) => a.allotmentStatus === "NOT_ALLOTTED").length,
      totalLotsApplied: enrichedApps.reduce((sum, a) => sum + (a.numberOfPanCards || 1), 0),
    };

    return {
      ipos,
      selectedIpo,
      applications: enrichedApps,
      metrics,
    };
  },

  async finalizeAllotment(
    ipoId: string,
    allottedApplicationIds: string[],
    auth: AuthContext
  ) {
    const ipo = await ipoRepository.findById(ipoId);
    if (!ipo) throw new Error("IPO not found.");

    const allottedSet = new Set(allottedApplicationIds.map(String));
    const applications = await applicationRepository.findByIpoId(ipo.id, ipo.name);

    if (applications.length > 0) {
      const bulkOps = applications.map((app) => {
        const isAllotted = allottedSet.has(app.id) || allottedSet.has(String((app as any)._id));
        return {
          updateOne: {
            filter: { _id: (app as any)._id },
            update: {
              $set: {
                allotmentStatus: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
                status: isAllotted ? "ALLOTTED" : "NOT_ALLOTTED",
                updatedAt: new Date(),
              },
            },
          },
        };
      });

      await applicationRepository.bulkWrite(bulkOps as any);
    }

    await ipoRepository.updateOne(ipo.id, {
      $set: {
        allotmentFinalized: true,
        allotmentFinalizedAt: new Date(),
        allotmentFinalizedBy: auth.displayName,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      eventType: "ALLOTMENT_FINALIZED",
      category: "APPLICATION",
      severity: "INFO",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "IPO",
      targetId: ipo.id,
      targetName: ipo.name,
      metadata: { allottedCount: allottedSet.size, totalCount: applications.length },
    });

    return { success: true, allottedCount: allottedSet.size };
  },

  async reopenAllotment(ipoId: string, auth: AuthContext) {
    const ipo = await ipoRepository.findById(ipoId);
    if (!ipo) throw new Error("IPO not found.");

    const applications = await applicationRepository.findByIpoId(ipo.id, ipo.name);
    if (applications.length > 0) {
      const bulkOps = applications.map((app) => ({
        updateOne: {
          filter: { _id: (app as any)._id },
          update: {
            $set: {
              allotmentStatus: "PENDING",
              status: "PENDING",
              allottedIndices: [],
              updatedAt: new Date(),
            },
          },
        },
      }));
      await applicationRepository.bulkWrite(bulkOps as any);
    }

    await ipoRepository.updateOne(ipo.id, {
      $set: {
        allotmentFinalized: false,
        allotmentFinalizedAt: null,
        allotmentFinalizedBy: null,
        updatedAt: new Date(),
      },
    });

    await logActivity({
      eventType: "ALLOTMENT_REOPENED",
      category: "APPLICATION",
      severity: "WARNING",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "IPO",
      targetId: ipo.id,
      targetName: ipo.name,
    });

    return { success: true };
  },
};
