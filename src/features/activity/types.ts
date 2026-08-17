import { ObjectId } from "mongodb";

/* =======================================================================
   NEXO ACTIVITY & AUDIT CENTER — CANONICAL TYPES
   Collection: nexo.activities
   All meaningful application events are written here by logActivity().
   NEVER store: passwords, hashes, session tokens, full PAN, raw messages.
======================================================================= */

export type AuditCategory =
  | "SECURITY"
  | "PRODUCT"
  | "APPLICATION"
  | "INVESTMENT"
  | "USER"
  | "COMMUNICATION"
  | "SYSTEM";

export type AuditSeverity =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "CRITICAL";

export type AuditTargetType =
  | "MEMBER"
  | "IPO"
  | "APPLICATION"
  | "CONVERSATION"
  | "TRANSACTION"
  | "HOLDING"
  | "SYSTEM";

export type AuditEventType =
  | "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT"
  | "ADMIN_LOGIN_SUCCESS" | "ADMIN_LOGIN_FAILED" | "ADMIN_LOGOUT"
  | "ADMIN_ACCESS_DENIED" | "ADMIN_ACCESS_GRANTED"
  | "SESSION_CREATED" | "SESSION_REVOKED" | "ALL_SESSIONS_REVOKED"
  | "PASSWORD_CHANGED" | "PASSWORD_RESET"
  | "ACCOUNT_SUSPENDED" | "ACCOUNT_REACTIVATED"
  | "ROLE_CHANGED" | "SUPER_ADMIN_ACTION"
  | "MEMBER_CREATED" | "MEMBER_UPDATED" | "MEMBER_DELETED" | "PROFILE_UPDATED"
  | "USERNAME_CHANGED" | "AVATAR_UPDATED"
  | "IPO_CREATED" | "IPO_UPDATED" | "IPO_ARCHIVED" | "IPO_DELETED"
  | "APPLICATION_CREATED" | "APPLICATION_UPDATED" | "APPLICATION_STATUS_CHANGED"
  | "PARTICIPANT_ADDED" | "PARTICIPANT_REMOVED"
  | "CONTRIBUTION_UPDATED" | "ALLOTMENT_UPDATED" | "ALLOTMENT_FINALIZED" | "ALLOTMENT_REOPENED" | "PROOF_UPLOADED"
  | "HOLDING_CREATED" | "HOLDING_UPDATED"
  | "SELL_EXECUTED" | "LISTING_UPDATED"
  | "TRANSACTION_CREATED" | "TRANSACTION_UPDATED" | "REFUND_UPDATED"
  | "CONVERSATION_CREATED" | "IPO_CHAT_CREATED" | "MESSAGE_SENT"
  | "MEMBER_ADDED_TO_CONVERSATION" | "MEMBER_REMOVED_FROM_CONVERSATION"
  | "SYSTEM_SEEDED" | "ADMIN_ACTION" | "ACTION_REVERSED";

export interface AuditActivity {
  _id?: ObjectId;
  id: string;
  eventType: AuditEventType;
  category: AuditCategory;
  severity: AuditSeverity;
  actorUserId?: string;
  actorMemberId?: string;
  actorName?: string;
  actorUsername?: string;
  actorRole?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  targetName?: string;
  ipoId?: string;
  memberId?: string;
  applicationId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  // Reversal Tracking fields
  isReversed?: boolean;
  reversedAt?: Date | string;
  reversedBy?: {
    userId?: string;
    memberId?: string;
    name?: string;
    username?: string;
    role?: string;
  };
  reversalActivityId?: string;
  originalActivityId?: string;
  isReversible?: boolean;
  // Legacy compat fields from old security.ts shape
  isSecurityEvent?: boolean;
  title?: string;
  subtitle?: string;
  type?: string;
  timestamp?: string;
  memberName?: string;
  memberAvatar?: string;
}

export interface LogActivityInput {
  eventType: AuditEventType;
  category: AuditCategory;
  severity?: AuditSeverity;
  actorUserId?: string;
  actorMemberId?: string;
  actorName?: string;
  actorUsername?: string;
  actorRole?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  targetName?: string;
  ipoId?: string;
  memberId?: string;
  applicationId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isReversed?: boolean;
  reversedAt?: Date | string;
  reversedBy?: {
    userId?: string;
    memberId?: string;
    name?: string;
    username?: string;
    role?: string;
  };
  reversalActivityId?: string;
  originalActivityId?: string;
}

export interface ActivityListResponse {
  activities: AuditActivity[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    total?: number;
  };
}

export interface ActivitySummaryResponse {
  today: number;
  admins: number;
  members: number;
  security: number;
  investment: number;
  application: number;
}

export const DEFAULT_SEVERITY_MAP: Record<AuditEventType, AuditSeverity> = {
  LOGIN_SUCCESS: "SUCCESS",
  ADMIN_LOGIN_SUCCESS: "SUCCESS",
  APPLICATION_CREATED: "SUCCESS",
  ACCOUNT_REACTIVATED: "SUCCESS",
  IPO_CREATED: "INFO",
  HOLDING_CREATED: "INFO",
  TRANSACTION_CREATED: "INFO",
  CONVERSATION_CREATED: "INFO",
  IPO_CHAT_CREATED: "INFO",
  MEMBER_CREATED: "INFO",
  MEMBER_UPDATED: "INFO",
  PROFILE_UPDATED: "INFO",
  USERNAME_CHANGED: "INFO",
  AVATAR_UPDATED: "INFO",
  IPO_UPDATED: "INFO",
  IPO_ARCHIVED: "INFO",
  APPLICATION_UPDATED: "INFO",
  APPLICATION_STATUS_CHANGED: "INFO",
  PARTICIPANT_ADDED: "INFO",
  PARTICIPANT_REMOVED: "INFO",
  CONTRIBUTION_UPDATED: "INFO",
  ALLOTMENT_UPDATED: "INFO",
  ALLOTMENT_FINALIZED: "SUCCESS",
  ALLOTMENT_REOPENED: "WARNING",
  PROOF_UPLOADED: "INFO",
  HOLDING_UPDATED: "INFO",
  SELL_EXECUTED: "INFO",
  LISTING_UPDATED: "INFO",
  TRANSACTION_UPDATED: "INFO",
  REFUND_UPDATED: "INFO",
  MESSAGE_SENT: "INFO",
  MEMBER_ADDED_TO_CONVERSATION: "INFO",
  MEMBER_REMOVED_FROM_CONVERSATION: "INFO",
  SYSTEM_SEEDED: "INFO",
  ADMIN_ACTION: "INFO",
  SESSION_CREATED: "INFO",
  ADMIN_ACCESS_GRANTED: "INFO",
  LOGOUT: "INFO",
  ADMIN_LOGOUT: "INFO",
  LOGIN_FAILED: "WARNING",
  ADMIN_LOGIN_FAILED: "WARNING",
  ACCOUNT_SUSPENDED: "WARNING",
  MEMBER_DELETED: "WARNING",
  PASSWORD_CHANGED: "WARNING",
  PASSWORD_RESET: "WARNING",
  SESSION_REVOKED: "WARNING",
  ADMIN_ACCESS_DENIED: "ERROR",
  ALL_SESSIONS_REVOKED: "CRITICAL",
  ROLE_CHANGED: "CRITICAL",
  SUPER_ADMIN_ACTION: "CRITICAL",
  IPO_DELETED: "CRITICAL",
  ACTION_REVERSED: "WARNING",
};
