import { Db } from "mongodb";
import { AuditActivity } from "./types";
import { UserDocument } from "@/src/models/User";
import { MemberDocument } from "@/src/models/Member";
import { revokeAllUserSessions } from "@/src/lib/auth/session";

export interface AuthContext {
  userId: string;
  memberId: string;
  username: string;
  displayName: string;
  role: string;
}

export interface ValidationResult {
  ok: boolean;
  code?: number;
  reason?: string;
}

export interface UndoExecutionResult {
  success: boolean;
  message: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
}

export interface UndoHandler {
  isReversible: (activity: AuditActivity) => boolean;
  validateUndo: (activity: AuditActivity, db: Db, auth: AuthContext) => Promise<ValidationResult>;
  executeUndo: (activity: AuditActivity, db: Db, auth: AuthContext) => Promise<UndoExecutionResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

const undoHandlers: Partial<Record<string, UndoHandler>> = {
  // ── 1. ROLE_CHANGED ──
  ROLE_CHANGED: {
    isReversible: (act) => Boolean(act.previousValue?.role && act.newValue?.role),
    validateUndo: async (act, db, auth) => {
      const targetMemberId = act.targetId || act.memberId;
      if (!targetMemberId) return { ok: false, code: 400, reason: "Target member ID missing." };

      const member = await db.collection<MemberDocument>("members").findOne({ id: targetMemberId });
      if (!member) return { ok: false, code: 404, reason: "Target member no longer exists." };

      const user = await db.collection<UserDocument>("users").findOne({ memberId: member.id });
      if (!user) return { ok: false, code: 404, reason: "Target user credentials no longer exist." };

      // Concurrency check: Ensure current role matches the newValue of the activity
      const expectedCurrentRole = act.newValue?.role;
      if (user.role !== expectedCurrentRole) {
        return {
          ok: false,
          code: 409,
          reason: `This action can no longer be safely undone because the user's role has since been changed to "${user.role}".`,
        };
      }

      // Self-lockout check
      if (auth.memberId === targetMemberId) {
        return { ok: false, code: 403, reason: "You cannot use Undo to modify your own administrative role." };
      }

      // Protect last Super Admin
      const targetRestoredRole = act.previousValue?.role as string;
      if (user.role === "SUPER_ADMIN" && targetRestoredRole !== "SUPER_ADMIN") {
        const superAdminCount = await db.collection<UserDocument>("users").countDocuments({
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        });
        if (superAdminCount <= 1) {
          return { ok: false, code: 400, reason: "Cannot undo: NEXO requires at least one active Super Admin." };
        }
      }

      return { ok: true };
    },
    executeUndo: async (act, db, _auth) => {
      const targetMemberId = act.targetId || act.memberId!;
      const restoredRole = act.previousValue!.role as string;

      await db.collection<UserDocument>("users").updateOne(
        { memberId: targetMemberId },
        { $set: { role: restoredRole as any, updatedAt: new Date() } }
      );

      await db.collection<MemberDocument>("members").updateOne(
        { id: targetMemberId },
        {
          $set: {
            role: restoredRole as any,
            updatedAt: new Date(),
            permissions: {
              canSubmitApplications: true,
              canDistributeProfit: restoredRole === "SUPER_ADMIN",
              canEditIpos: restoredRole === "SUPER_ADMIN",
              canAccessAdminConsole: restoredRole === "SUPER_ADMIN",
              canManageMembers: restoredRole === "SUPER_ADMIN",
            },
          },
        }
      );

      return {
        success: true,
        message: `Role change reversed. Role restored to ${restoredRole}.`,
        previousState: { role: act.newValue?.role },
        newState: { role: restoredRole },
      };
    },
  },

  // ── 2. ACCOUNT_SUSPENDED ──
  ACCOUNT_SUSPENDED: {
    isReversible: () => true,
    validateUndo: async (act, db) => {
      const targetMemberId = act.targetId || act.memberId;
      if (!targetMemberId) return { ok: false, code: 400, reason: "Target member ID missing." };

      const user = await db.collection<UserDocument>("users").findOne({ memberId: targetMemberId });
      if (!user) return { ok: false, code: 404, reason: "Target user credentials not found." };

      if (user.status !== "SUSPENDED") {
        return {
          ok: false,
          code: 409,
          reason: `This action can no longer be undone because the user's status is already "${user.status}".`,
        };
      }

      return { ok: true };
    },
    executeUndo: async (act, db) => {
      const targetMemberId = act.targetId || act.memberId!;
      await db.collection<UserDocument>("users").updateOne(
        { memberId: targetMemberId },
        { $set: { status: "ACTIVE", updatedAt: new Date() } }
      );

      return {
        success: true,
        message: `Account suspension reversed. User account reactivated.`,
        previousState: { status: "SUSPENDED" },
        newState: { status: "ACTIVE" },
      };
    },
  },

  // ── 3. ACCOUNT_REACTIVATED ──
  ACCOUNT_REACTIVATED: {
    isReversible: () => true,
    validateUndo: async (act, db, auth) => {
      const targetMemberId = act.targetId || act.memberId;
      if (!targetMemberId) return { ok: false, code: 400, reason: "Target member ID missing." };

      if (auth.memberId === targetMemberId) {
        return { ok: false, code: 403, reason: "You cannot suspend your own account via Undo." };
      }

      const user = await db.collection<UserDocument>("users").findOne({ memberId: targetMemberId });
      if (!user) return { ok: false, code: 404, reason: "Target user credentials not found." };

      if (user.status !== "ACTIVE") {
        return {
          ok: false,
          code: 409,
          reason: `This action can no longer be undone because the user's status is "${user.status}".`,
        };
      }

      return { ok: true };
    },
    executeUndo: async (act, db) => {
      const targetMemberId = act.targetId || act.memberId!;
      const user = await db.collection<UserDocument>("users").findOne({ memberId: targetMemberId });

      await db.collection<UserDocument>("users").updateOne(
        { memberId: targetMemberId },
        { $set: { status: "SUSPENDED", updatedAt: new Date() } }
      );

      if (user?.id) {
        await revokeAllUserSessions(user.id);
      }

      return {
        success: true,
        message: `Account reactivation reversed. User account suspended and active sessions revoked.`,
        previousState: { status: "ACTIVE" },
        newState: { status: "SUSPENDED" },
      };
    },
  },

  // ── 4. MEMBER_UPDATED ──
  MEMBER_UPDATED: {
    isReversible: (act) => Boolean(act.previousValue && Object.keys(act.previousValue).length > 0),
    validateUndo: async (act, db) => {
      const targetMemberId = act.targetId || act.memberId;
      if (!targetMemberId) return { ok: false, code: 400, reason: "Target member ID missing." };

      const member = await db.collection<MemberDocument>("members").findOne({ id: targetMemberId });
      if (!member) return { ok: false, code: 404, reason: "Target member not found." };

      // Check if username in previousValue conflicts with someone else
      const restoredUsername = act.previousValue?.username as string | undefined;
      if (restoredUsername && restoredUsername !== member.username) {
        const existingWithUsername = await db.collection<MemberDocument>("members").findOne({
          username: restoredUsername.toLowerCase(),
          id: { $ne: targetMemberId },
        });
        if (existingWithUsername) {
          return {
            ok: false,
            code: 409,
            reason: `Cannot restore username "@${restoredUsername}" because another member now has this username.`,
          };
        }
      }

      return { ok: true };
    },
    executeUndo: async (act, db) => {
      const targetMemberId = act.targetId || act.memberId!;
      const prev = act.previousValue!;

      const updateMemberDoc: Record<string, any> = { updatedAt: new Date() };
      if (prev.name) updateMemberDoc.name = prev.name;
      if (prev.displayName) updateMemberDoc.displayName = prev.displayName;
      if (prev.username) updateMemberDoc.username = (prev.username as string).toLowerCase();
      if (prev.email) updateMemberDoc.email = (prev.email as string).toLowerCase();
      if (prev.phone) updateMemberDoc.phone = prev.phone;
      if (prev.avatar) updateMemberDoc.avatar = prev.avatar;

      await db.collection("members").updateOne({ id: targetMemberId }, { $set: updateMemberDoc });
      await db.collection("profiles").updateOne({ userId: targetMemberId }, { $set: updateMemberDoc });

      return {
        success: true,
        message: `Member profile details restored to previous values.`,
        previousState: act.newValue || {},
        newState: prev,
      };
    },
  },

  // ── 5. MEMBER_CREATED ──
  MEMBER_CREATED: {
    isReversible: () => true,
    validateUndo: async (act, db) => {
      const targetMemberId = act.targetId || act.memberId;
      if (!targetMemberId) return { ok: false, code: 400, reason: "Target member ID missing." };

      // Dependent records check:
      // 1. Applications
      const appCount = await db.collection("applications").countDocuments({
        $or: [{ memberId: targetMemberId }, { "participants.memberId": targetMemberId }],
      });
      if (appCount > 0) {
        return {
          ok: false,
          code: 409,
          reason: `This member creation cannot be undone because the member has ${appCount} active application record(s).`,
        };
      }

      // 2. Transactions
      const txnCount = await db.collection("transactions").countDocuments({ memberId: targetMemberId });
      if (txnCount > 0) {
        return {
          ok: false,
          code: 409,
          reason: `This member creation cannot be undone because the member has ${txnCount} transaction record(s).`,
        };
      }

      return { ok: true };
    },
    executeUndo: async (act, db) => {
      const targetMemberId = act.targetId || act.memberId!;
      const member = await db.collection("members").findOne({ id: targetMemberId });

      await db.collection("members").deleteOne({ id: targetMemberId });
      await db.collection("users").deleteOne({ memberId: targetMemberId });
      await db.collection("profiles").deleteOne({ userId: targetMemberId });
      await db.collection("sessions").deleteMany({ memberId: targetMemberId });

      return {
        success: true,
        message: `Member creation reversed. Member "${member?.name || targetMemberId}" removed.`,
        previousState: { exists: true, memberId: targetMemberId },
        newState: { exists: false },
      };
    },
  },

  // ── 6. IPO_CREATED ──
  IPO_CREATED: {
    isReversible: () => true,
    validateUndo: async (act, db) => {
      const targetIpoId = act.targetId || act.ipoId;
      if (!targetIpoId) return { ok: false, code: 400, reason: "Target IPO ID missing." };

      const ipo = await db.collection("ipos").findOne({
        $or: [{ id: targetIpoId }, { id: targetIpoId.replace(/^pub_/, "") }],
      });
      if (!ipo) return { ok: false, code: 404, reason: "Target IPO not found." };

      // Dependent check: applications or transactions
      const appCount = await db.collection("applications").countDocuments({
        $or: [{ ipoId: targetIpoId }, { ipoName: ipo.name }],
      });
      if (appCount > 0) {
        return {
          ok: false,
          code: 409,
          reason: `This IPO cannot be undone because ${appCount} member application(s) have been submitted.`,
        };
      }

      return { ok: true };
    },
    executeUndo: async (act, db) => {
      const targetIpoId = act.targetId || act.ipoId!;
      const cleanId = targetIpoId.replace(/^pub_/, "");

      const ipo = await db.collection("ipos").findOne({
        $or: [{ id: targetIpoId }, { id: cleanId }],
      });
      const ipoName = ipo?.name || targetIpoId;

      await db.collection("ipos").deleteMany({
        $or: [{ id: targetIpoId }, { id: cleanId }, { name: ipoName }],
      });

      return {
        success: true,
        message: `IPO creation reversed. "${ipoName}" removed from catalogue.`,
        previousState: { exists: true, ipoId: targetIpoId },
        newState: { exists: false },
      };
    },
  },

  // ── 7. IPO_UPDATED ──
  IPO_UPDATED: {
    isReversible: (act) => Boolean(act.previousValue && Object.keys(act.previousValue).length > 0),
    validateUndo: async (act, db) => {
      const targetIpoId = act.targetId || act.ipoId;
      if (!targetIpoId) return { ok: false, code: 400, reason: "Target IPO ID missing." };

      const ipo = await db.collection("ipos").findOne({
        $or: [{ id: targetIpoId }, { id: targetIpoId.replace(/^pub_/, "") }],
      });
      if (!ipo) return { ok: false, code: 404, reason: "Target IPO not found." };

      return { ok: true };
    },
    executeUndo: async (act, db) => {
      const targetIpoId = act.targetId || act.ipoId!;
      const cleanId = targetIpoId.replace(/^pub_/, "");
      const prev = act.previousValue!;

      await db.collection("ipos").updateOne(
        { $or: [{ id: targetIpoId }, { id: cleanId }] },
        { $set: { ...prev, updatedAt: new Date() } }
      );

      return {
        success: true,
        message: `IPO details restored to previous values.`,
        previousState: act.newValue || {},
        newState: prev,
      };
    },
  },

  // ── 8. IPO_ARCHIVED ──
  IPO_ARCHIVED: {
    isReversible: () => true,
    validateUndo: async (act, db) => {
      const targetIpoId = act.targetId || act.ipoId;
      if (!targetIpoId) return { ok: false, code: 400, reason: "Target IPO ID missing." };

      const ipo = await db.collection("ipos").findOne({
        $or: [{ id: targetIpoId }, { id: targetIpoId.replace(/^pub_/, "") }],
      });
      if (!ipo) return { ok: false, code: 404, reason: "Target IPO not found." };

      return { ok: true };
    },
    executeUndo: async (act, db) => {
      const targetIpoId = act.targetId || act.ipoId!;
      const cleanId = targetIpoId.replace(/^pub_/, "");

      await db.collection("ipos").updateOne(
        { $or: [{ id: targetIpoId }, { id: cleanId }] },
        {
          $set: {
            status: "APPLICATION_OPEN",
            isCompleted: false,
            allotmentFinalized: false,
            updatedAt: new Date(),
          },
          $unset: { completedAt: "", completedBy: "" },
        }
      );

      return {
        success: true,
        message: `IPO un-archived and restored to active Applications Open state.`,
        previousState: { status: "COMPLETED" },
        newState: { status: "APPLICATION_OPEN" },
      };
    },
  },
};

/**
 * Checks whether an activity event is reversible.
 */
export function isActivityReversible(activity: AuditActivity): boolean {
  if (!activity || activity.isReversed) return false;
  const eventType = activity.eventType || (activity as any).type;
  if (!eventType) return false;

  const handler = undoHandlers[eventType];
  if (!handler) return false;

  return handler.isReversible(activity);
}

/**
 * Retrieves the undo handler for an activity event.
 */
export function getUndoHandler(eventType: string): UndoHandler | undefined {
  return undoHandlers[eventType];
}
