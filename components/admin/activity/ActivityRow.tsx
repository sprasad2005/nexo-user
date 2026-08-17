import React from "react";
import { ArrowUUpLeft, CheckCircle } from "@phosphor-icons/react";
import { AuditActivity } from "@/src/features/activity/types";
import {
  formatActivityDescription,
  formatActivityTime,
  formatShortTime,
  getSeverityClasses,
  formatCategory,
} from "@/src/features/activity/formatters";
import { isActivityReversible } from "@/src/features/activity/undoRules";
import { ActivityIcon } from "./ActivityIcon";

interface ActivityRowProps {
  activity: AuditActivity;
  onClick: (a: AuditActivity) => void;
  onUndo?: (a: AuditActivity) => void;
  canUndo?: boolean;
}

export function ActivityRow({ activity, onClick, onUndo, canUndo = true }: ActivityRowProps) {
  const description = formatActivityDescription(activity);
  const timeLabel = formatShortTime(activity.createdAt || (activity as any).timestamp);
  const relativeTime = formatActivityTime(activity.createdAt || (activity as any).timestamp);
  const severityClasses = getSeverityClasses(activity.severity || "INFO");
  const categoryLabel = formatCategory(activity.category);
  const actorName = activity.actorName || (activity as any).memberName || "System";
  const actorRole = activity.actorRole;
  const isAdminActor = actorRole === "ADMIN" || actorRole === "SUPER_ADMIN";

  const reversible = isActivityReversible(activity);
  const isReversed = activity.isReversed;

  return (
    <button
      onClick={() => onClick(activity)}
      className="w-full flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#14161A] transition-colors cursor-pointer text-left group"
    >
      {/* Icon */}
      <ActivityIcon
        eventType={activity.eventType || (activity as any).type}
        severity={activity.severity || "INFO"}
        size={16}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold text-slate-900 dark:text-[#F5F7FA] truncate">
            {actorName}
          </span>
          {actorRole && (
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono ${
                isAdminActor
                  ? "bg-blue-50 dark:bg-[#17233D] text-blue-600 dark:text-[#6B93FF]"
                  : "bg-slate-100 dark:bg-[#1D2026] text-slate-500 dark:text-[#858D99]"
              }`}
            >
              {actorRole === "SUPER_ADMIN" ? "SUPER ADMIN" : actorRole}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600 dark:text-[#AEB5C0] font-medium mt-0.5 truncate">
          {description}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${severityClasses.badge}`}>
            {activity.severity || "INFO"}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-[#626A75] font-medium">
            {categoryLabel}
          </span>
          {activity.targetName && (
            <>
              <span className="text-[10px] text-slate-300 dark:text-[#343943]">·</span>
              <span className="text-[10px] text-slate-500 dark:text-[#858D99] truncate max-w-[120px]">
                {activity.targetName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Timestamp & Actions */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="text-right">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-[#626A75]">{timeLabel}</p>
          <p className="text-[10px] text-slate-300 dark:text-[#343943] mt-0.5">{relativeTime}</p>
        </div>

        {/* Undo Button or Reversed Badge */}
        {isReversed ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-[#2A200B] text-amber-700 dark:text-[#E5B544] border border-amber-200 dark:border-[#E5B544]/30">
            <CheckCircle size={11} weight="fill" />
            Reversed
          </span>
        ) : reversible && canUndo && onUndo ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUndo(activity);
            }}
            title="Safely reverse this action"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-slate-100 dark:bg-[#1D2026] text-slate-700 dark:text-[#D4D9E2] border border-slate-200 dark:border-[#252931] hover:border-amber-400 dark:hover:border-[#E5B544] hover:text-amber-600 dark:hover:text-[#E5B544] hover:bg-amber-50 dark:hover:bg-[#2A200B]/60 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <ArrowUUpLeft size={12} weight="bold" />
            Undo
          </button>
        ) : null}
      </div>
    </button>
  );
}
