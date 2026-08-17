import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { MOCK_MEMBERS, MOCK_IPOS } from "@/lib/mockData";
import { hashPassword, normalizeEmail } from "@/src/lib/auth/password";
import { ensureActivityIndexes } from "@/src/features/activity/activityService";
import { requireSuperAdmin } from "@/src/lib/auth/authorization";

const DB_NAME = "nexo";

export async function POST() {
  try {
    await requireSuperAdmin();
    await ensureActivityIndexes();
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Fetch existing SUPER_ADMIN user to preserve it
    const existingSuperAdminUser = await db.collection("users").findOne({ role: "SUPER_ADMIN" });
    const superAdminMemberId = existingSuperAdminUser?.memberId;

    // 1. SEED MEMBERS COLLECTION ("members")
    const membersCol = db.collection("members");
    if (superAdminMemberId) {
      await membersCol.deleteMany({ id: { $ne: superAdminMemberId } });
    } else {
      await membersCol.deleteMany({});
    }
    const memberDocs = MOCK_MEMBERS.map((m) => ({
      ...m,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const memberResult = await membersCol.insertMany(memberDocs);

    // 2. SEED USERS COLLECTION ("users") FOR AUTHENTICATION
    const usersCol = db.collection("users");
    if (existingSuperAdminUser) {
      await usersCol.deleteMany({ role: { $ne: "SUPER_ADMIN" } });
    } else {
      await usersCol.deleteMany({});
    }
    const userDocs = MOCK_MEMBERS.map((m) => {
      const pass = m.password || (m.role === "SUPER_ADMIN" || m.role === "ADMIN" ? "admin123" : "user123");
      const emailNorm = normalizeEmail(m.email);
      return {
        id: `usr_${m.id}`,
        email: m.email,
        emailNormalized: emailNorm,
        passwordHash: hashPassword(pass),
        memberId: m.id,
        role: m.role,
        status: "ACTIVE",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    const userResult = await usersCol.insertMany(userDocs);

    // 3. SEED IPOS COLLECTION ("ipos")
    const iposCol = db.collection("ipos");
    await iposCol.deleteMany({});
    const ipoDocs = MOCK_IPOS.map((i) => ({
      ...i,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const ipoResult = await iposCol.insertMany(ipoDocs);

    // 4. SEED APPLICATIONS COLLECTION ("applications")
    const appsCol = db.collection("applications");
    await appsCol.deleteMany({});
    const appDocs = MOCK_IPOS.flatMap((ipo) =>
      (ipo.applications || []).map((app) => ({
        id: app.id,
        ipoId: ipo.id,
        ipoName: ipo.name,
        fundingStructure: app.type === "COMBINED" || app.type === "COMBO" ? "MULTI_FRIEND" : "SOLO",
        applicantName: app.applicantName || "Ankit",
        memberId: app.memberId || "mem_1",
        numberOfPanCards: app.lotCount || 1,
        panNumbers: app.panNumbers || [app.panMasked || "ABCDE1234F"],
        totalContribution: app.totalContribution,
        contributors: (app.participants || []).map((p) => ({
          memberId: p.memberId,
          memberName: p.memberName,
          amount: p.contribution,
          percentage: p.percentage,
        })),
        allotmentStatus: app.allotmentStatus || "AWAITING",
        status: app.status || "AWAITING",
        createdAt: new Date(app.createdAt || Date.now()),
        updatedAt: new Date(),
      }))
    );
    let appResultCount = 0;
    if (appDocs.length > 0) {
      const appResult = await appsCol.insertMany(appDocs);
      appResultCount = appResult.insertedCount;
    }

    // 5. SEED TRANSACTIONS COLLECTION ("transactions")
    const txnsCol = db.collection("transactions");
    await txnsCol.deleteMany({});
    const txnDocs = appDocs.map((app) => ({
      id: app.id,
      ipoId: app.ipoId,
      ipoName: app.ipoName,
      type: app.fundingStructure === "MULTI_FRIEND" ? "COMBO" : "SOLO",
      amount: app.totalContribution,
      applicationNumber: `NEXO-APP-${Math.floor(1000 + Math.random() * 9000)}`,
      participants: app.contributors.map((c) => c.memberName),
      status: app.allotmentStatus === "ALLOTTED" ? "ALLOTTED" : app.allotmentStatus === "NOT_ALLOTTED" ? "REFUNDED" : "SUBMITTED",
      createdAt: new Date(),
    }));
    let txnResultCount = 0;
    if (txnDocs.length > 0) {
      const txnResult = await txnsCol.insertMany(txnDocs);
      txnResultCount = txnResult.insertedCount;
    }

    // 6. SEED PROFILES COLLECTION ("profiles")
    const profilesCol = db.collection("profiles");
    if (superAdminMemberId) {
      await profilesCol.deleteMany({ userId: { $ne: superAdminMemberId } });
    } else {
      await profilesCol.deleteMany({});
    }
    const profileDocs = MOCK_MEMBERS.map((m) => ({
      userId: m.id,
      name: m.name,
      displayName: m.name,
      email: m.email,
      phone: m.phone || "+91 98200 12345",
      avatar: m.avatar,
      bio: `NEXO ${m.role} Member`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const profileResult = await profilesCol.insertMany(profileDocs);

    return NextResponse.json({
      success: true,
      message: "MongoDB database successfully seeded across all 6 core collections!",
      seededCounts: {
        members: memberResult.insertedCount,
        users: userResult.insertedCount,
        ipos: ipoResult.insertedCount,
        applications: appResultCount,
        transactions: txnResultCount,
        profiles: profileResult.insertedCount,
      },
    });
  } catch (err: any) {
    console.error("POST /api/seed-db error:", err);
    if (err.message === "UNAUTHORIZED" || err.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Access Denied. Super Admin access required." }, { status: err.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to seed database: " + err.message },
      { status: 500 }
    );
  }
}
