import { AuditActivity } from "./types";

export const REVERSIBLE_ACTION_TYPES = [
  "ROLE_CHANGED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_REACTIVATED",
  "MEMBER_UPDATED",
  "MEMBER_CREATED",
  "IPO_CREATED",
  "IPO_UPDATED",
  "IPO_ARCHIVED",
] as const;

export type ReversibleActionType = typeof REVERSIBLE_ACTION_TYPES[number];

/**
 * Pure client-safe checker to determine if an activity is eligible for Undo.
 * Does not import MongoDB or Node-only libraries.
 */
export function isActivityReversible(activity: AuditActivity | null | undefined): boolean {
  if (!activity) return false;
  if (activity.isReversed) return false;

  const eventType = activity.eventType || (activity as any).type;
  if (!eventType) return false;

  switch (eventType) {
    case "ROLE_CHANGED":
      return Boolean(activity.previousValue?.role && activity.newValue?.role);
    case "ACCOUNT_SUSPENDED":
    case "ACCOUNT_REACTIVATED":
    case "MEMBER_CREATED":
    case "IPO_CREATED":
    case "IPO_ARCHIVED":
      return true;
    case "MEMBER_UPDATED":
    case "IPO_UPDATED":
      return Boolean(activity.previousValue && Object.keys(activity.previousValue).length > 0);
    default:
      return false;
  }
}
