import { Db } from "mongodb";

let indexesEnsured = false;

/**
 * Idempotently ensures all critical MongoDB indexes are created in background mode.
 * Safe to call repeatedly; uses an in-memory lock to avoid redundant index builds.
 */
export async function ensureDatabaseIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;

  try {
    await Promise.all([
      // 1. Members
      db.collection("members").createIndexes([
        { key: { id: 1 }, unique: true, name: "idx_members_id_unique" },
        { key: { username: 1 }, unique: true, sparse: true, name: "idx_members_username_unique" },
        { key: { phone: 1 }, sparse: true, name: "idx_members_phone" },
        { key: { panMasked: 1 }, sparse: true, name: "idx_members_panMasked" },
        { key: { role: 1 }, name: "idx_members_role" },
        { key: { status: 1 }, name: "idx_members_status" },
        { key: { createdAt: -1 }, name: "idx_members_createdAt" },
      ]).catch(() => {}),

      // 2. Users
      db.collection("users").createIndexes([
        { key: { id: 1 }, unique: true, name: "idx_users_id_unique" },
        { key: { memberId: 1 }, unique: true, sparse: true, name: "idx_users_memberId_unique" },
        { key: { emailNormalized: 1 }, unique: true, sparse: true, name: "idx_users_email_unique" },
        { key: { role: 1 }, name: "idx_users_role" },
        { key: { status: 1 }, name: "idx_users_status" },
      ]).catch(() => {}),

      // 3. IPOs
      db.collection("ipos").createIndexes([
        { key: { id: 1 }, unique: true, name: "idx_ipos_id_unique" },
        { key: { name: 1 }, name: "idx_ipos_name" },
        { key: { status: 1 }, name: "idx_ipos_status" },
        { key: { isArchived: 1 }, name: "idx_ipos_isArchived" },
        { key: { isHidden: 1 }, name: "idx_ipos_isHidden" },
        { key: { createdAt: -1 }, name: "idx_ipos_createdAt" },
      ]).catch(() => {}),

      // 4. Applications
      db.collection("applications").createIndexes([
        { key: { id: 1 }, unique: true, name: "idx_apps_id_unique" },
        { key: { memberId: 1, createdAt: -1 }, name: "idx_apps_memberId_createdAt" },
        { key: { ipoId: 1, status: 1 }, name: "idx_apps_ipoId_status" },
        { key: { ipoName: 1 }, name: "idx_apps_ipoName" },
        { key: { allotmentStatus: 1 }, name: "idx_apps_allotmentStatus" },
      ]).catch(() => {}),

      // 5. Transactions
      db.collection("transactions").createIndexes([
        { key: { id: 1 }, unique: true, name: "idx_txns_id_unique" },
        { key: { memberId: 1, createdAt: -1 }, name: "idx_txns_memberId_createdAt" },
        { key: { ipoId: 1 }, name: "idx_txns_ipoId" },
        { key: { status: 1 }, name: "idx_txns_status" },
      ]).catch(() => {}),

      // 6. Activities
      db.collection("activities").createIndexes([
        { key: { id: 1 }, unique: true, name: "idx_activities_id_unique" },
        { key: { category: 1, createdAt: -1 }, name: "idx_activities_category_createdAt" },
        { key: { eventType: 1, createdAt: -1 }, name: "idx_activities_eventType_createdAt" },
        { key: { actorUserId: 1, createdAt: -1 }, name: "idx_activities_actorUserId_createdAt" },
        { key: { actorMemberId: 1, createdAt: -1 }, name: "idx_activities_actorMemberId_createdAt" },
        { key: { severity: 1, createdAt: -1 }, name: "idx_activities_severity_createdAt" },
        { key: { createdAt: -1 }, name: "idx_activities_createdAt" },
      ]).catch(() => {}),

      // 7. Notifications
      db.collection("notifications").createIndexes([
        { key: { id: 1 }, unique: true, name: "idx_notifications_id_unique" },
        { key: { targetMemberId: 1, createdAt: -1 }, name: "idx_notifications_target_createdAt" },
        { key: { readBy: 1 }, name: "idx_notifications_readBy" },
        { key: { dismissedBy: 1 }, name: "idx_notifications_dismissedBy" },
      ]).catch(() => {}),

      // 8. Sessions
      db.collection("sessions").createIndexes([
        { key: { id: 1 }, unique: true, name: "idx_sessions_id_unique" },
        { key: { sessionTokenHash: 1 }, unique: true, name: "idx_sessions_tokenHash_unique" },
        { key: { userId: 1, expiresAt: 1 }, name: "idx_sessions_userId_expiresAt" },
        { key: { revokedAt: 1, expiresAt: 1 }, name: "idx_sessions_revoked_expires" },
      ]).catch(() => {}),

      // 9. Profiles
      db.collection("profiles").createIndexes([
        { key: { userId: 1 }, unique: true, sparse: true, name: "idx_profiles_userId_unique" },
      ]).catch(() => {}),
    ]);

    indexesEnsured = true;
  } catch (error) {
    console.warn("[MongoDB] Index build non-fatal error:", error);
  }
}
