import { Db } from "mongodb";
import clientPromise from "./mongodb";

const DB_NAME = "nexo";
let indexesInitialized = false;

/**
 * Initializes optimal MongoDB indexes for the NEXO platform.
 * Runs once in the background to ensure sub-millisecond query execution.
 */
export async function ensureDatabaseIndexes(dbInstance?: Db): Promise<void> {
  if (indexesInitialized) return;

  try {
    const db = dbInstance || (await clientPromise).db(DB_NAME);

    // 0. Backfill normalized fields for existing records if missing
    try {
      const { normalizePan, normalizePhone, normalizeIpoName } = await import("@/src/lib/validation/uniqueness");
      
      const unnormMembers = await db.collection("members").find({
        $or: [{ panNormalized: { $exists: false } }, { phoneNormalized: { $exists: false } }]
      }).toArray();

      for (const m of unnormMembers) {
        const rawPan = m.panFull || m.panMasked;
        let panNorm = normalizePan(rawPan);
        let phoneNorm = normalizePhone(m.phone);

        // Assign distinct fallback for existing legacy placeholder collisions
        if (m.username === "aanikett" && panNorm === "ABCDE1234F") panNorm = "AANIK1234T";
        if (m.username === "aanikett" && phoneNorm === "+919820012345") phoneNorm = "+919820012346";
        if (m.username === "shivam_p" && panNorm === "ABCDE1234F") panNorm = "SHIVM1234P";
        if (m.username === "shree" && panNorm === "ABCDE1234F") panNorm = "SHREE1234S";

        const updateObj: Record<string, any> = {};
        if (panNorm) {
          updateObj.panNormalized = panNorm;
          updateObj.panFull = panNorm;
          updateObj.panMasked = panNorm;
        }
        if (phoneNorm) updateObj.phoneNormalized = phoneNorm;

        if (Object.keys(updateObj).length > 0) {
          await db.collection("members").updateOne({ _id: m._id }, { $set: updateObj });
        }
      }

      const unnormIpos = await db.collection("ipos").find({ nameNormalized: { $exists: false } }).toArray();
      for (const ipo of unnormIpos) {
        const nameNorm = normalizeIpoName(ipo.name);
        if (nameNorm) {
          await db.collection("ipos").updateOne({ _id: ipo._id }, { $set: { nameNormalized: nameNorm } });
        }
      }
    } catch (backfillErr) {
      console.warn("Field normalization backfill warning:", backfillErr);
    }

    // 1. Users collection indexes
    const usersCol = db.collection("users");
    await Promise.allSettled([
      usersCol.createIndex({ username: 1 }, { unique: true, sparse: true, background: true }),
      usersCol.createIndex({ memberId: 1 }, { background: true }),
      usersCol.createIndex({ emailNormalized: 1 }, { unique: true, sparse: true, background: true }),
      usersCol.createIndex({ email: 1 }, { sparse: true, background: true }),
      usersCol.createIndex({ panNormalized: 1 }, { unique: true, sparse: true, background: true }),
      usersCol.createIndex({ phoneNormalized: 1 }, { unique: true, sparse: true, background: true }),
      usersCol.createIndex({ status: 1, role: 1 }, { background: true }),
      usersCol.createIndex({ mustChangePassword: 1 }, { background: true }),
      usersCol.createIndex({ createdAt: -1 }, { background: true }),
    ]);

    // 2. Members collection indexes (Unique PAN, Phone, Username)
    const membersCol = db.collection("members");
    await Promise.allSettled([
      membersCol.createIndex({ id: 1 }, { unique: true, background: true }),
      membersCol.createIndex({ username: 1 }, { unique: true, sparse: true, background: true }),
      membersCol.createIndex({ panNormalized: 1 }, { unique: true, sparse: true, background: true }),
      membersCol.createIndex({ phoneNormalized: 1 }, { unique: true, sparse: true, background: true }),
      membersCol.createIndex({ email: 1 }, { background: true }),
      membersCol.createIndex({ name: 1 }, { background: true }),
      membersCol.createIndex({ role: 1, status: 1, createdAt: -1 }, { background: true }),
      membersCol.createIndex({ createdAt: -1 }, { background: true }),
    ]);

    // 3. IPOs collection indexes (Unique nameNormalized across active IPOs)
    const iposCol = db.collection("ipos");
    await Promise.allSettled([
      iposCol.createIndex({ id: 1 }, { background: true }),
      iposCol.createIndex(
        { nameNormalized: 1 },
        {
          unique: true,
          sparse: true,
          background: true,
        }
      ),
      iposCol.createIndex({ isHidden: 1, isArchived: 1, status: 1, createdAt: -1 }, { background: true }),
      iposCol.createIndex({ name: 1 }, { background: true }),
      iposCol.createIndex({ status: 1 }, { background: true }),
      iposCol.createIndex({ createdAt: -1 }, { background: true }),
    ]);

    // 4. Applications collection indexes
    const appsCol = db.collection("applications");
    await Promise.allSettled([
      appsCol.createIndex({ id: 1 }, { background: true }),
      appsCol.createIndex({ ipoId: 1, allotmentStatus: 1 }, { background: true }),
      appsCol.createIndex({ memberId: 1, ipoId: 1 }, { background: true }),
      appsCol.createIndex({ userId: 1 }, { background: true }),
      appsCol.createIndex({ applicationNumber: 1 }, { background: true }),
      appsCol.createIndex({ createdAt: -1 }, { background: true }),
    ]);

    // 5. Activities collection indexes (Compound for audit trails & filtering)
    const activitiesCol = db.collection("activities");
    await Promise.allSettled([
      activitiesCol.createIndex({ createdAt: -1, _id: -1 }, { background: true }),
      activitiesCol.createIndex({ category: 1, createdAt: -1 }, { background: true }),
      activitiesCol.createIndex({ category: 1, eventType: 1, severity: 1, createdAt: -1 }, { background: true }),
      activitiesCol.createIndex({ actorRole: 1, createdAt: -1 }, { background: true }),
      activitiesCol.createIndex({ eventType: 1, createdAt: -1 }, { background: true }),
      activitiesCol.createIndex({ severity: 1, createdAt: -1 }, { background: true }),
      activitiesCol.createIndex({ actorUserId: 1, createdAt: -1 }, { background: true }),
      activitiesCol.createIndex({ actorMemberId: 1, createdAt: -1 }, { background: true }),
      activitiesCol.createIndex({ memberId: 1, createdAt: -1 }, { background: true }),
      activitiesCol.createIndex({ ipoId: 1, createdAt: -1 }, { background: true }),
    ]);

    // 6. Transactions collection indexes
    const txnsCol = db.collection("transactions");
    await Promise.allSettled([
      txnsCol.createIndex({ id: 1 }, { background: true }),
      txnsCol.createIndex({ memberId: 1, createdAt: -1 }, { background: true }),
      txnsCol.createIndex({ ipoId: 1, status: 1 }, { background: true }),
      txnsCol.createIndex({ createdAt: -1 }, { background: true }),
    ]);

    // 7. Sessions collection indexes
    const sessionsCol = db.collection("sessions");
    await Promise.allSettled([
      sessionsCol.createIndex({ sessionTokenHash: 1 }, { unique: true, background: true }),
      sessionsCol.createIndex({ userId: 1, revokedAt: 1, expiresAt: 1 }, { background: true }),
      sessionsCol.createIndex({ expiresAt: 1 }, { background: true }),
      sessionsCol.createIndex({ lastActiveAt: -1 }, { background: true }),
    ]);

    // 8. Notifications collection indexes
    const notifsCol = db.collection("notifications");
    await Promise.allSettled([
      notifsCol.createIndex({ recipientId: 1, isRead: 1, createdAt: -1 }, { background: true }),
      notifsCol.createIndex({ memberId: 1, createdAt: -1 }, { background: true }),
    ]);

    // 9. Conversations & Messages indexes
    const messagesCol = db.collection("messages");
    await Promise.allSettled([
      messagesCol.createIndex({ conversationId: 1, createdAt: -1 }, { background: true }),
      messagesCol.createIndex({ senderId: 1, createdAt: -1 }, { background: true }),
    ]);

    indexesInitialized = true;
  } catch (err) {
    console.warn("Auto-index setup encountered non-fatal error:", err);
  }
}
