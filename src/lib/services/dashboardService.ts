import { getDatabase } from "@/src/lib/db/connection";
import { ipoRepository } from "@/src/lib/db/repositories/ipoRepository";
import { memberRepository } from "@/src/lib/db/repositories/memberRepository";
import { applicationRepository } from "@/src/lib/db/repositories/applicationRepository";
import { transactionRepository } from "@/src/lib/db/repositories/transactionRepository";
import { sessionRepository } from "@/src/lib/db/repositories/sessionRepository";
import { AuthContext } from "@/src/lib/auth/authorization";

export const dashboardService = {
  async getAdminDashboardMetrics(auth: AuthContext) {
    const db = await getDatabase();
    const now = new Date();

    const [
      totalMembers,
      activeMembers,
      activeIpos,
      totalApplications,
      totalTransactions,
      activeSessions,
      recentActivities,
    ] = await Promise.all([
      memberRepository.count(),
      memberRepository.count({ status: "ACTIVE" }),
      ipoRepository.count({ status: "APPLICATION_OPEN", isArchived: { $ne: true } }),
      applicationRepository.count(),
      transactionRepository.count(),
      sessionRepository.countActive(),
      db.collection("activities").find({}).sort({ createdAt: -1 }).limit(10).toArray(),
    ]);

    return {
      metrics: {
        totalMembers,
        activeMembers,
        activeIpos,
        totalApplications,
        totalTransactions,
        activeSessions,
      },
      recentActivities,
    };
  },
};
