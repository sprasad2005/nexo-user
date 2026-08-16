import clientPromise from "@/lib/mongodb";
import { startTiming } from "@/lib/perfLogger";

const DB_NAME = "nexo";

export interface DashboardSummaryDTO {
  stats: {
    totalMembers: number;
    activeMembers: number;
    totalIpos: number;
    activeIpos: number;
    totalApplications: number;
    allottedApplications: number;
    activeSessions: number;
    securityAlerts: number;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    category: string;
    eventType: string;
    severity: string;
    title: string;
    actorName: string;
    actorRole: string;
    createdAt: string | Date;
  }>;
  recentIpos: Array<{
    id: string;
    name: string;
    company: string;
    status: string;
    gmpPercent: number;
    closeDate: string;
  }>;
}

/**
 * Service to fetch consolidated dashboard data in a single highly-parallelized pipeline.
 */
export async function getDashboardSummary(): Promise<DashboardSummaryDTO> {
  const timer = startTiming("getDashboardSummary");
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const usersCol = db.collection("users");
  const iposCol = db.collection("ipos");
  const appsCol = db.collection("applications");
  const sessionsCol = db.collection("sessions");
  const activitiesCol = db.collection("activities");

  const now = new Date();

  // Run all count and sample queries concurrently in parallel
  const [
    totalMembers,
    activeMembers,
    totalIpos,
    activeIpos,
    totalApplications,
    allottedApplications,
    activeSessions,
    securityAlerts,
    recentActivities,
    recentIpos,
  ] = await Promise.all([
    usersCol.countDocuments({}),
    usersCol.countDocuments({ status: "ACTIVE" }),
    iposCol.countDocuments({ isHidden: { $ne: true } }),
    iposCol.countDocuments({ isHidden: { $ne: true }, isArchived: { $ne: true } }),
    appsCol.countDocuments({}),
    appsCol.countDocuments({
      $or: [
        { allotmentStatus: { $in: ["ALLOTTED", "allotted"] } },
        { status: { $in: ["ALLOTTED", "allotted"] } },
      ],
    }),
    sessionsCol.countDocuments({ revokedAt: null, expiresAt: { $gt: now } }),
    activitiesCol.countDocuments({ category: "SECURITY", severity: { $in: ["HIGH", "CRITICAL", "WARN"] } }),
    activitiesCol
      .find(
        {},
        {
          projection: {
            id: 1,
            type: 1,
            category: 1,
            eventType: 1,
            severity: 1,
            title: 1,
            actorName: 1,
            actorRole: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray(),
    iposCol
      .find(
        { isHidden: { $ne: true }, isArchived: { $ne: true } },
        {
          projection: {
            id: 1,
            name: 1,
            company: 1,
            status: 1,
            "metrics.gmpPercent": 1,
            "metrics.closeDate": 1,
            closeDate: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(4)
      .toArray(),
  ]);

  timer.end(100);

  return {
    stats: {
      totalMembers,
      activeMembers,
      totalIpos,
      activeIpos,
      totalApplications,
      allottedApplications,
      activeSessions,
      securityAlerts,
    },
    recentActivities: recentActivities.map((act) => ({
      id: act.id || String(act._id),
      type: act.type || "ACTIVITY",
      category: act.category || "GENERAL",
      eventType: act.eventType || "INFO",
      severity: act.severity || "INFO",
      title: act.title || "Activity logged",
      actorName: act.actorName || "System",
      actorRole: act.actorRole || "MEMBER",
      createdAt: act.createdAt,
    })),
    recentIpos: recentIpos.map((ipo) => ({
      id: ipo.id || String(ipo._id),
      name: ipo.name,
      company: ipo.company || ipo.name,
      status: ipo.status || "ACTIVE",
      gmpPercent: ipo.metrics?.gmpPercent ?? 18.5,
      closeDate: ipo.metrics?.closeDate || ipo.closeDate || "Upcoming",
    })),
  };
}
