import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "nexo";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unknown";
  let dbLatencyMs = 0;
  let calculationCheck = "pass";

  try {
    const dbStart = Date.now();
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Fast ping
    await db.command({ ping: 1 });
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "connected";

    // Lightweight Invariant Sample Check (Total Apps === Sum of Categories)
    const [totalApps, allottedApps, notAllottedApps, pendingApps] = await Promise.all([
      db.collection("applications").countDocuments({}),
      db.collection("applications").countDocuments({ $or: [{ allotmentStatus: { $in: ["ALLOTTED", "allotted"] } }, { status: { $in: ["ALLOTTED", "allotted"] } }] }),
      db.collection("applications").countDocuments({ $or: [{ allotmentStatus: { $in: ["NOT_ALLOTTED", "not_allotted", "REFUNDED"] } }, { status: { $in: ["NOT_ALLOTTED", "not_allotted", "REFUNDED"] } }] }),
      db.collection("applications").countDocuments({ $or: [{ allotmentStatus: { $in: ["PENDING", "AWAITING", "pending", "awaiting"] } }, { status: { $in: ["PENDING", "AWAITING", "pending", "awaiting"] } }] }),
    ]);

    if (totalApps !== (allottedApps + notAllottedApps + pendingApps)) {
      calculationCheck = "warning_inconsistency";
    }
  } catch (err: any) {
    dbStatus = "disconnected";
    dbLatencyMs = Date.now() - startTime;
  }

  const isHealthy = dbStatus === "connected" && calculationCheck === "pass";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      invariants: {
        allotmentConservation: calculationCheck,
      },
      system: {
        environment: process.env.NODE_ENV || "production",
        uptimeSeconds: Math.floor(process.uptime()),
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
