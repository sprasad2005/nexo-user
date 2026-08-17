"use client";

import React, { useEffect } from "react";
import { X, ArrowRight, ArrowUUpLeft } from "@phosphor-icons/react";
import { AuditActivity } from "@/src/features/activity/types";
import {
  formatActivityDescription,
  getSeverityClasses,
  formatCategory,
  formatShortTime,
} from "@/src/features/activity/formatters";
import { isActivityReversible } from "@/src/features/activity/undoRules";
import { ActivityIcon } from "./ActivityIcon";

interface ActivityDetailDrawerProps {
  activity: AuditActivity | null;
  onClose: () => void;
  onUndo?: (a: AuditActivity) => void;
}

export function ActivityDetailDrawer({ activity, onClose, onUndo }: ActivityDetailDrawerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!activity) return null;

  const severity = activity.severity || "INFO";
  const sc = getSeverityClasses(severity);
  const description = formatActivityDescription(activity);
  const actorName = activity.actorName || (activity as any).memberName || "System";
  const actorUsername = activity.actorUsername;
  const actorRole = activity.actorRole;
  const isAdminActor = actorRole === "ADMIN" || actorRole === "SUPER_ADMIN";
  const timeStr = formatShortTime(activity.createdAt || (activity as any).timestamp);
  const dateStr = activity.createdAt
    ? new Date(activity.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const hasDiff = activity.previousValue && activity.newValue;
  const hasMetadata = activity.metadata && Object.keys(activity.metadata).length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[460px] bg-white dark:bg-[#14161A] border-l border-slate-200 dark:border-[#252931] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-200 dark:border-[#252931] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ActivityIcon eventType={activity.eventType || (activity as any).type} severity={severity} size={15} />
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-[#F5F7FA]">Activity Detail</p>
              <p className="text-[10px] font-mono text-slate-400 dark:text-[#626A75]">
                {activity.eventType || (activity as any).type || "UNKNOWN"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F7FA] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Description */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
            <p className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] leading-snug">
              {description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {severity}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#1D2026] text-slate-600 dark:text-[#AEB5C0]">
                {formatCategory(activity.category)}
              </span>
            </div>
          </div>

          {/* Actor */}
          <section>
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-2">Actor</p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
              <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-[#6B93FF] text-white dark:text-[#101114] flex items-center justify-center text-sm font-extrabold shrink-0">
                {actorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-[#F5F7FA]">{actorName}</p>
                {actorUsername && (
                  <p className="text-[11px] font-mono text-slate-500 dark:text-[#858D99]">@{actorUsername}</p>
                )}
              </div>
              {actorRole && (
                <span
                  className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider font-mono ${
                    isAdminActor
                      ? "bg-blue-50 dark:bg-[#17233D] text-blue-600 dark:text-[#6B93FF]"
                      : "bg-slate-100 dark:bg-[#1D2026] text-slate-500 dark:text-[#858D99]"
                  }`}
                >
                  {actorRole === "SUPER_ADMIN" ? "SUPER ADMIN" : actorRole}
                </span>
              )}
            </div>
          </section>

          {/* Target */}
          {activity.targetName && (
            <section>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-2">Target</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                <span className="font-bold text-slate-900 dark:text-[#F5F7FA]">{activity.targetName}</span>
                {activity.targetType && (
                  <span className="ml-auto text-[10px] font-bold text-slate-500 dark:text-[#858D99] px-2 py-0.5 bg-slate-100 dark:bg-[#1D2026] rounded-full">
                    {activity.targetType}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Change Diff */}
          {hasDiff && (
            <section>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-2">Changes</p>
              <div className="space-y-2">
                {Object.keys(activity.previousValue!).map((key) => (
                  <div key={key} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase">{key}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold text-rose-600 dark:text-[#FF6B6B] bg-rose-50 dark:bg-[#32191B] px-2 py-0.5 rounded">
                          {String(activity.previousValue![key])}
                        </span>
                        <ArrowRight size={12} className="text-slate-400 dark:text-[#626A75] shrink-0" />
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-[#32C98B] bg-emerald-50 dark:bg-[#102C22] px-2 py-0.5 rounded">
                          {String(activity.newValue![key])}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Metadata */}
          {hasMetadata && (
            <section>
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-2">Details</p>
              <div className="p-3 rounded-xl bg-slate-900 dark:bg-[#0D0F11] border border-slate-800 dark:border-[#252931] space-y-1.5 font-mono">
                {Object.entries(activity.metadata!).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-slate-400 text-[11px] shrink-0">{k}</span>
                    <span className="text-slate-200 dark:text-[#AEB5C0] text-[11px] text-right truncate max-w-[200px]">{String(v)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Timestamp & Session */}
          <section>
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-2">Timestamp</p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#858D99]">Date</span>
                <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">{dateStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#858D99]">Time</span>
                <span className="font-mono font-bold text-slate-800 dark:text-[#F5F7FA]">{timeStr}</span>
              </div>
              {(activity as any).ipAddress && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#858D99]">IP Address</span>
                  <span className="font-mono text-slate-600 dark:text-[#AEB5C0]">{(activity as any).ipAddress}</span>
                </div>
              )}
              {(activity as any).userAgent && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#858D99]">Client</span>
                  <span className="text-slate-600 dark:text-[#AEB5C0] truncate max-w-[180px]">{(activity as any).userAgent}</span>
                </div>
              )}
            </div>
          </section>

          {/* Reversal History Banner if Already Reversed */}
          {activity.isReversed && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-[#2A200B] border border-amber-200 dark:border-[#E5B544]/30 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-[#E5B544] font-extrabold">
                <ArrowUUpLeft size={16} weight="bold" />
                <span>Action Reversed</span>
              </div>
              <p className="text-amber-700/90 dark:text-[#E5B544]/80 text-[11px] leading-relaxed">
                This operation was safely reversed
                {activity.reversedAt
                  ? ` on ${new Date(activity.reversedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                  : ""}
                {activity.reversedBy?.name ? ` by ${activity.reversedBy.name}` : ""}.
              </p>
              {activity.reversalActivityId && (
                <p className="text-[10px] font-mono text-amber-600/70 dark:text-[#E5B544]/60 pt-0.5">
                  Reversal Log ID: {activity.reversalActivityId}
                </p>
              )}
            </div>
          )}

          {/* Activity ID */}
          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-300 dark:text-[#343943] font-mono">
            <span>Activity ID</span>
            <span className="truncate max-w-[200px]">{activity.id}</span>
          </div>
        </div>

        {/* Footer Action */}
        {!activity.isReversed && isActivityReversible(activity) && onUndo && (
          <div className="p-4 border-t border-slate-200 dark:border-[#252931] bg-slate-50/50 dark:bg-[#101114]/50">
            <button
              type="button"
              onClick={() => onUndo(activity)}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUUpLeft size={16} weight="bold" />
              <span>Undo This Action</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
