"use client";

import React, { useState } from "react";
import { X, ArrowUUpLeft, WarningCircle, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { AuditActivity } from "@/src/features/activity/types";
import { formatActivityDescription, formatActivityTime, formatShortTime } from "@/src/features/activity/formatters";

interface UndoConfirmationModalProps {
  activity: AuditActivity | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (activityId: string) => Promise<void>;
}

export function UndoConfirmationModal({
  activity,
  isOpen,
  onClose,
  onConfirm,
}: UndoConfirmationModalProps) {
  const [isUndoing, setIsUndoing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !activity) return null;

  const description = formatActivityDescription(activity);
  const timeLabel = formatShortTime(activity.createdAt || (activity as any).timestamp);
  const relativeTime = formatActivityTime(activity.createdAt || (activity as any).timestamp);
  const actorName = activity.actorName || (activity as any).memberName || "System";
  const actorRole = activity.actorRole || "ADMIN";

  const prev = activity.previousValue || {};
  const current = activity.newValue || {};
  const diffKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(current)]));

  const handleConfirm = async () => {
    setErrorMsg(null);
    setIsUndoing(true);
    try {
      await onConfirm(activity.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reverse action.");
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-[#2A200B] text-amber-600 dark:text-[#E5B544] flex items-center justify-center border border-amber-200 dark:border-[#E5B544]/30 shrink-0">
              <ArrowUUpLeft size={22} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">Undo Activity?</h3>
              <p className="text-xs text-slate-500 dark:text-[#858D99] mt-0.5">
                Safely reverse this operation and restore previous state
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUndoing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F7FA] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Target Action Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider">
              Original Action
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-[#858D99]">
              {timeLabel} ({relativeTime})
            </span>
          </div>
          <p className="font-extrabold text-slate-900 dark:text-[#F5F7FA] text-sm leading-snug">
            {description}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-slate-500 dark:text-[#858D99]">Performed by:</span>
            <span className="font-bold text-slate-800 dark:text-[#D4D9E2]">{actorName}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono bg-blue-50 dark:bg-[#17233D] text-blue-600 dark:text-[#6B93FF]">
              {actorRole}
            </span>
          </div>
        </div>

        {/* Before vs After Diff Preview */}
        {diffKeys.length > 0 && (
          <div className="space-y-2 text-xs">
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider">
              Changes to be Applied (Reversal Preview)
            </p>
            <div className="rounded-2xl border border-slate-200 dark:border-[#252931] overflow-hidden divide-y divide-slate-100 dark:divide-[#1F232B]">
              {diffKeys.map((key) => {
                const currentVal = String(current[key] ?? "—");
                const targetVal = String(prev[key] ?? "—");
                return (
                  <div key={key} className="p-3 bg-slate-50/50 dark:bg-[#101114]/50 flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-500 dark:text-[#858D99] uppercase text-[10px] tracking-wider font-mono">
                      {key}
                    </span>
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-mono text-xs text-rose-600 dark:text-rose-400 line-through bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/30">
                        {currentVal}
                      </span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-[#32C98B] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/30">
                        {targetVal}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Audit Preservation Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-[#241C09]/70 border border-amber-200 dark:border-[#E5B544]/25 flex items-start gap-2.5 text-[11px] text-amber-800 dark:text-[#E5B544] font-medium leading-relaxed">
          <WarningCircle size={17} weight="fill" className="text-amber-600 dark:text-[#E5B544] shrink-0 mt-0.5" />
          <div>
            <strong>Audit Trail Preserved:</strong> The original activity log will NOT be deleted. A new immutable audit record (<span className="font-mono font-bold">ACTION_REVERSED</span>) will be appended to the timeline.
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
            <WarningCircle size={16} weight="fill" className="text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUndoing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isUndoing}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isUndoing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Undoing Action...</span>
              </>
            ) : (
              <>
                <ArrowUUpLeft size={15} weight="bold" />
                <span>Confirm Undo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
