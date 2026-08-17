import { AuditActivity, AuditEventType, AuditSeverity, AuditCategory } from "./types";

/* ════════════════════════════════════════════════════════════════
   NEXO Activity Formatters
   Converts structured audit events into human-readable descriptions.
   UI components call these — raw eventType strings are never shown.
════════════════════════════════════════════════════════════════ */

/**
 * Generates a human-readable description of an audit activity.
 * Falls back to legacy title field for old security.ts events.
 */
export function formatActivityDescription(activity: AuditActivity): string {
  const actor = activity.actorName || activity.memberName || "System";
  const target = activity.targetName || "";
  const role = activity.actorRole || "";
  const et = activity.eventType as AuditEventType;

  // Legacy event fallback
  if (!et && activity.title) return activity.title;

  switch (et) {
    // ─── Security ───────────────────────────────────────────────
    case "LOGIN_SUCCESS":
    case "ADMIN_LOGIN_SUCCESS":
      return `${actor} signed in`;
    case "LOGIN_FAILED":
    case "ADMIN_LOGIN_FAILED":
      return `Failed sign-in attempt`;
    case "LOGOUT":
    case "ADMIN_LOGOUT":
      return `${actor} signed out`;
    case "ADMIN_ACCESS_DENIED":
      return `Admin access denied${target ? ` — ${target}` : ""}`;
    case "ADMIN_ACCESS_GRANTED":
      return `Admin access granted to ${actor}`;
    case "SESSION_CREATED":
      return `New session started — ${actor}`;
    case "SESSION_REVOKED":
      return `Session revoked — ${target || actor}`;
    case "ALL_SESSIONS_REVOKED":
      return `All sessions revoked — ${target || actor}`;
    case "PASSWORD_CHANGED":
      return `Password updated — ${actor}`;
    case "PASSWORD_RESET":
      return `Password reset${target ? ` for ${target}` : ""}`;
    case "ACCOUNT_SUSPENDED":
      return `Account suspended — ${target || actor}`;
    case "ACCOUNT_REACTIVATED":
      return `Account reactivated — ${target || actor}`;
    case "ROLE_CHANGED": {
      const prev = (activity.previousValue?.role as string) || "";
      const next = (activity.newValue?.role as string) || "";
      const change = prev && next ? ` (${prev} → ${next})` : "";
      return `${actor} changed ${target ? `${target}'s` : "a"} role${change}`;
    }
    case "SUPER_ADMIN_ACTION":
      return `Super Admin action by ${actor}${target ? ` — ${target}` : ""}`;

    // ─── User / Member ───────────────────────────────────────────
    case "MEMBER_CREATED":
      return `${actor} created user account${target ? ` — ${target}` : ""}`;
    case "MEMBER_UPDATED":
      return `${actor} updated member profile${target ? ` — ${target}` : ""}`;
    case "MEMBER_DELETED":
      return `${actor} deleted member profile${target ? ` — ${target}` : ""}`;
    case "PROFILE_UPDATED":
      return `${actor} updated their profile`;
    case "USERNAME_CHANGED":
      return `${actor} changed username`;
    case "AVATAR_UPDATED":
      return `${actor} updated avatar`;

    // ─── Product / IPO ───────────────────────────────────────────
    case "IPO_CREATED":
      return `${actor} created ${target || "an IPO"}`;
    case "IPO_UPDATED":
      return `${actor} updated ${target || "an IPO"}`;
    case "IPO_ARCHIVED":
      return `${actor} archived ${target || "an IPO"}`;

    // ─── Application ─────────────────────────────────────────────
    case "APPLICATION_CREATED": {
      const appType = (activity.metadata?.type as string) || "";
      const typeLabel = appType?.toLowerCase().includes("combo") ? "combo" : "solo";
      return `${actor} created ${typeLabel} application${target ? ` — ${target}` : ""}`;
    }
    case "APPLICATION_UPDATED":
      return `${actor} updated application${target ? ` — ${target}` : ""}`;
    case "APPLICATION_STATUS_CHANGED":
      return `${actor} changed application status${target ? ` — ${target}` : ""}`;
    case "PARTICIPANT_ADDED":
      return `${target ? target : "Member"} added to ${activity.targetName || "application"}`;
    case "PARTICIPANT_REMOVED":
      return `${target ? target : "Member"} removed from application`;
    case "CONTRIBUTION_UPDATED":
      return `${actor} updated contribution${target ? ` — ${target}` : ""}`;
    case "ALLOTMENT_UPDATED":
      return `${actor} updated allotment${target ? ` — ${target}` : ""}`;
    case "PROOF_UPLOADED":
      return `${actor} uploaded application proof${target ? ` — ${target}` : ""}`;

    // ─── Investment ──────────────────────────────────────────────
    case "HOLDING_CREATED":
      return `Holding created${target ? ` — ${target}` : ""}`;
    case "HOLDING_UPDATED":
      return `Holding updated${target ? ` — ${target}` : ""}`;
    case "SELL_EXECUTED":
      return `${target ? `${target} shares sold` : "Shares sold"}`;
    case "LISTING_UPDATED":
      return `${actor} updated listing${target ? ` — ${target}` : ""}`;
    case "TRANSACTION_CREATED":
      return `Transaction recorded${target ? ` — ${target}` : ""}`;
    case "TRANSACTION_UPDATED":
      return `Transaction updated${target ? ` — ${target}` : ""}`;
    case "REFUND_UPDATED":
      return `Refund updated${target ? ` — ${target}` : ""}`;

    // ─── Communication ───────────────────────────────────────────
    case "CONVERSATION_CREATED":
      return `${actor} started a conversation`;
    case "IPO_CHAT_CREATED":
      return `${actor} created IPO group chat${target ? ` — ${target}` : ""}`;
    case "MESSAGE_SENT":
      return `${actor} sent a message`;
    case "MEMBER_ADDED_TO_CONVERSATION":
      return `${target || "Member"} added to conversation`;
    case "MEMBER_REMOVED_FROM_CONVERSATION":
      return `${target || "Member"} removed from conversation`;

    // ─── System & Reversals ──────────────────────────────────────
    case "ACTION_REVERSED": {
      const origEvent = (activity.metadata?.originalEventType as string) || "action";
      const origTarget = activity.targetName ? ` (${activity.targetName})` : "";
      return `${actor} reversed ${origEvent.toLowerCase().replace(/_/g, " ")}${origTarget}`;
    }
    case "SYSTEM_SEEDED":
      return "System data seeded";
    case "ADMIN_ACTION":
      return `Admin action — ${target || actor}`;

    default:
      // Legacy or unknown events — use stored title
      return (activity as any).title || String(et).replace(/_/g, " ");
  }
}

/**
 * Returns Phosphor icon name for a given eventType.
 * UI imports and renders these from @phosphor-icons/react.
 */
export function getActivityIconName(eventType: AuditEventType | string | undefined): string {
  if (!eventType) return "ClockCountdown";
  switch (eventType as AuditEventType) {
    case "LOGIN_SUCCESS":
    case "ADMIN_LOGIN_SUCCESS":
    case "SESSION_CREATED":
      return "SignIn";
    case "LOGIN_FAILED":
    case "ADMIN_LOGIN_FAILED":
      return "Warning";
    case "LOGOUT":
    case "ADMIN_LOGOUT":
      return "SignOut";
    case "ADMIN_ACCESS_DENIED":
    case "ADMIN_ACCESS_GRANTED":
      return "ShieldCheck";
    case "SESSION_REVOKED":
    case "ALL_SESSIONS_REVOKED":
      return "Monitor";
    case "PASSWORD_CHANGED":
    case "PASSWORD_RESET":
      return "Key";
    case "ACCOUNT_SUSPENDED":
      return "Prohibit";
    case "ACCOUNT_REACTIVATED":
      return "CheckCircle";
    case "ROLE_CHANGED":
    case "SUPER_ADMIN_ACTION":
      return "ShieldStar";
    case "MEMBER_CREATED":
    case "MEMBER_UPDATED":
      return "User";
    case "PROFILE_UPDATED":
    case "USERNAME_CHANGED":
    case "AVATAR_UPDATED":
      return "UserCircle";
    case "IPO_CREATED":
    case "IPO_UPDATED":
    case "IPO_ARCHIVED":
      return "ChartLineUp";
    case "APPLICATION_CREATED":
    case "APPLICATION_UPDATED":
    case "APPLICATION_STATUS_CHANGED":
      return "ClipboardText";
    case "PARTICIPANT_ADDED":
    case "PARTICIPANT_REMOVED":
      return "UsersThree";
    case "CONTRIBUTION_UPDATED":
    case "ALLOTMENT_UPDATED":
    case "PROOF_UPLOADED":
      return "CheckCircle";
    case "HOLDING_CREATED":
    case "HOLDING_UPDATED":
    case "SELL_EXECUTED":
      return "TrendUp";
    case "LISTING_UPDATED":
      return "ChartBar";
    case "TRANSACTION_CREATED":
    case "TRANSACTION_UPDATED":
    case "REFUND_UPDATED":
      return "ArrowsLeftRight";
    case "CONVERSATION_CREATED":
    case "IPO_CHAT_CREATED":
    case "MESSAGE_SENT":
    case "MEMBER_ADDED_TO_CONVERSATION":
    case "MEMBER_REMOVED_FROM_CONVERSATION":
      return "ChatCircle";
    case "SYSTEM_SEEDED":
    case "ADMIN_ACTION":
      return "Gear";
    default:
      return "ClockCountdown";
  }
}

/**
 * Returns Tailwind CSS classes for severity indicator dot + badge.
 */
export function getSeverityClasses(severity: AuditSeverity): {
  dot: string;
  badge: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case "SUCCESS":
      return {
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 dark:bg-[#102C22] text-emerald-700 dark:text-[#32C98B] border-emerald-200 dark:border-[#32C98B]/20",
        text: "text-emerald-600 dark:text-[#32C98B]",
        icon: "bg-emerald-100 dark:bg-[#102C22] text-emerald-600 dark:text-[#32C98B]",
      };
    case "WARNING":
      return {
        dot: "bg-amber-500",
        badge: "bg-amber-50 dark:bg-[#302714] text-amber-700 dark:text-[#F3B85B] border-amber-200 dark:border-[#F3B85B]/20",
        text: "text-amber-600 dark:text-[#F3B85B]",
        icon: "bg-amber-100 dark:bg-[#302714] text-amber-600 dark:text-[#F3B85B]",
      };
    case "ERROR":
      return {
        dot: "bg-rose-500",
        badge: "bg-rose-50 dark:bg-[#32191B] text-rose-700 dark:text-[#FF6B6B] border-rose-200 dark:border-[#FF6B6B]/20",
        text: "text-rose-600 dark:text-[#FF6B6B]",
        icon: "bg-rose-100 dark:bg-[#32191B] text-rose-600 dark:text-[#FF6B6B]",
      };
    case "CRITICAL":
      return {
        dot: "bg-blue-600 animate-pulse",
        badge: "bg-blue-50 dark:bg-[#17233D] text-blue-700 dark:text-[#6B93FF] border-blue-200 dark:border-[#6B93FF]/30",
        text: "text-blue-600 dark:text-[#6B93FF]",
        icon: "bg-blue-100 dark:bg-[#17233D] text-blue-600 dark:text-[#6B93FF]",
      };
    default: // INFO
      return {
        dot: "bg-slate-400 dark:bg-[#626A75]",
        badge: "bg-slate-100 dark:bg-[#1D2026] text-slate-600 dark:text-[#AEB5C0] border-slate-200 dark:border-[#343943]",
        text: "text-slate-500 dark:text-[#858D99]",
        icon: "bg-slate-100 dark:bg-[#1D2026] text-slate-500 dark:text-[#858D99]",
      };
  }
}

/**
 * Returns a compact human-readable category label.
 */
export function formatCategory(category: AuditCategory | string | undefined): string {
  if (!category) return "System";
  const map: Record<string, string> = {
    SECURITY: "Security",
    PRODUCT: "Product",
    APPLICATION: "Application",
    INVESTMENT: "Investment",
    USER: "User",
    COMMUNICATION: "Chat",
    SYSTEM: "System",
  };
  return map[category] || category;
}

/**
 * Formats a timestamp for the activity timeline.
 * Recent: "2m ago", "1h ago"
 * Older: "Yesterday", "12 Aug 2026"
 */
export function formatActivityTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Returns a short time string for table display (e.g. "6:42 PM").
 */
export function formatShortTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Groups activities by date for timeline display.
 * Returns array of { label, items } sorted newest-first.
 */
export function groupActivitiesByDate(
  activities: AuditActivity[]
): { label: string; items: AuditActivity[] }[] {
  const groups: Map<string, AuditActivity[]> = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const activity of activities) {
    const d = activity.createdAt
      ? new Date(activity.createdAt)
      : activity.timestamp
      ? new Date(activity.timestamp)
      : new Date();
    d.setHours(0, 0, 0, 0);

    let label: string;
    if (d.getTime() === today.getTime()) {
      label = "TODAY";
    } else if (d.getTime() === yesterday.getTime()) {
      label = "YESTERDAY";
    } else {
      label = d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).toUpperCase();
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(activity);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}
