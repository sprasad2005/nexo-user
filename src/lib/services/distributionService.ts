import { getDatabase, withTransaction } from "@/src/lib/db/connection";
import { ipoRepository } from "@/src/lib/db/repositories/ipoRepository";
import { applicationRepository } from "@/src/lib/db/repositories/applicationRepository";
import { memberRepository } from "@/src/lib/db/repositories/memberRepository";
import { logActivity } from "@/src/features/activity/activityService";
import { AuthContext } from "@/src/lib/auth/authorization";

export interface DistributionParticipant {
  memberId: string;
  memberName: string;
  investment: number;
  profitAmount: number;
  percentage: number;
}

export interface ProfitDistributionParams {
  ipoId: string;
  totalProfit: number;
  distributionType: "PRO_RATA" | "EQUAL" | "CUSTOM";
  participants: DistributionParticipant[];
  notes?: string;
}

export const distributionService = {
  async getDistributionHistory(ipoId?: string) {
    const db = await getDatabase();
    const filter: any = {};
    if (ipoId) {
      filter.$or = [{ ipoId }, { ipoId: ipoId.replace(/^pub_/, "") }];
    }
    return db.collection("profit_distributions").find(filter).sort({ distributedAt: -1 }).toArray();
  },

  async executeDistribution(params: ProfitDistributionParams, auth: AuthContext) {
    if (!params.ipoId || typeof params.totalProfit !== "number" || params.totalProfit <= 0) {
      throw new Error("Validation Error: Valid IPO ID and positive profit amount are required.");
    }

    if (!Array.isArray(params.participants) || params.participants.length === 0) {
      throw new Error("Validation Error: At least one participant is required for profit distribution.");
    }

    const ipo = await ipoRepository.findById(params.ipoId);
    if (!ipo) throw new Error("IPO not found.");

    const distributionId = `dist_${Date.now()}`;
    const now = new Date();

    const distributionDoc = {
      id: distributionId,
      ipoId: ipo.id,
      ipoName: ipo.name,
      totalProfit: params.totalProfit,
      distributionType: params.distributionType || "PRO_RATA",
      participants: params.participants,
      distributedBy: auth.displayName,
      distributedByMemberId: auth.memberId,
      distributedAt: now,
      notes: params.notes || "",
      createdAt: now,
      updatedAt: now,
    };

    const transactionDocs = params.participants.map((p) => ({
      id: `txn_dist_${Date.now()}_${p.memberId}`,
      ipoId: ipo.id,
      ipoName: ipo.name,
      type: "PROFIT_DISTRIBUTION",
      amount: p.profitAmount,
      applicationNumber: `NEXO-DIST-${distributionId.slice(-6)}`,
      participants: [p.memberName],
      memberId: p.memberId,
      status: "COMPLETED",
      distributionId,
      createdAt: now,
    }));

    const notificationDocs = params.participants.map((p) => ({
      id: `notif_dist_${Date.now()}_${p.memberId}`,
      senderId: auth.memberId,
      senderName: auth.displayName,
      targetMemberId: p.memberId,
      targetMemberName: p.memberName,
      title: `💰 Profit Distributed: ${ipo.name}`,
      message: `You received ₹${p.profitAmount.toLocaleString("en-IN")} from ${ipo.name} profit distribution.`,
      severity: "SUCCESS",
      ipoId: ipo.id,
      ipoName: ipo.name,
      ctaLabel: "View Portfolio",
      ctaLink: "/history",
      createdAt: now,
    }));

    // Execute atomic write
    const db = await getDatabase();
    await Promise.all([
      db.collection("profit_distributions").insertOne(distributionDoc as any),
      db.collection("transactions").insertMany(transactionDocs as any),
      db.collection("notifications").insertMany(notificationDocs as any),
      ipoRepository.updateOne(ipo.id, {
        $set: {
          profitDistributed: true,
          totalDistributedProfit: params.totalProfit,
          updatedAt: now,
        },
      }),
    ]);

    await logActivity({
      eventType: "IPO_UPDATED",
      category: "INVESTMENT",
      severity: "SUCCESS",
      actorUserId: auth.userId,
      actorMemberId: auth.memberId,
      actorName: auth.displayName,
      actorUsername: auth.username,
      actorRole: auth.role,
      targetType: "IPO",
      targetId: ipo.id,
      targetName: ipo.name,
      metadata: {
        totalProfit: params.totalProfit,
        participantsCount: params.participants.length,
        distributionId,
      },
    });

    return {
      success: true,
      distributionId,
      totalProfit: params.totalProfit,
      distributedCount: params.participants.length,
    };
  },
};
