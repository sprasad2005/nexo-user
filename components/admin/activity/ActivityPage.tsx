"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MagnifyingGlass, Funnel, X, DownloadSimple,
  ArrowClockwise, Table, ListBullets,
} from "@phosphor-icons/react";
import { AuditActivity, AuditCategory, AuditSeverity } from "@/src/features/activity/types";
import { ActivitySummary } from "./ActivitySummary";
import { ActivityTimeline } from "./ActivityTimeline";
import { ActivityTable } from "./ActivityTable";
import { ActivityDetailDrawer } from "./ActivityDetailDrawer";
import { UndoConfirmationModal } from "./UndoConfirmationModal";
import { ActivityTimelineSkeleton, ActivityTableSkeleton } from "./ActivitySkeleton";
import { ActivityEmptyState, ActivityErrorState } from "./ActivityEmptyState";
import { AdminDataCache, nexoDataCache } from "@/lib/nexoDataCache";

type ViewMode = "timeline" | "table";

const CATEGORIES: AuditCategory[] = ["SECURITY", "PRODUCT", "APPLICATION", "INVESTMENT", "USER", "COMMUNICATION", "SYSTEM"];
const SEVERITIES: AuditSeverity[] = ["INFO", "SUCCESS", "WARNING", "ERROR", "CRITICAL"];
const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
];

function buildDateRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  if (preset === "today") {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (preset === "yesterday") {
    const from = new Date(); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
    const to = new Date(); to.setDate(to.getDate() - 1); to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (preset === "7d") {
    const from = new Date(); from.setDate(from.getDate() - 7); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (preset === "30d") {
    const from = new Date(); from.setDate(from.getDate() - 30); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  return {};
}

export function ActivityPage() {
  const [activities, setActivities] = useState<AuditActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Undo state
  const [undoTargetActivity, setUndoTargetActivity] = useState<AuditActivity | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Apply cache on mount
  useEffect(() => {
    const cached = AdminDataCache.get<AuditActivity[]>("admin_activities_default");
    if (cached && cached.length > 0) {
      setActivities(cached);
      setIsLoading(false);
    }
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [selectedActivity, setSelectedActivity] = useState<AuditActivity | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasActiveFilters = category || severity || datePreset || roleFilter || search;

  const buildUrl = useCallback((cursor?: string) => {
    const url = new URL("/api/admin/activity", window.location.origin);
    if (search) url.searchParams.set("search", search);
    if (category) url.searchParams.set("category", category);
    if (severity) url.searchParams.set("severity", severity);
    if (roleFilter) url.searchParams.set("actorRole", roleFilter);
    if (datePreset) {
      const { from, to } = buildDateRange(datePreset);
      if (from) url.searchParams.set("from", from);
      if (to) url.searchParams.set("to", to);
    }
    if (cursor) url.searchParams.set("cursor", cursor);
    url.searchParams.set("limit", "50");
    return url.toString();
  }, [search, category, severity, datePreset, roleFilter]);

  const fetchActivities = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!hasActiveFilters && !AdminDataCache.has("admin_activities_default")) {
      setIsLoading(true);
    }
    setIsError(false);
    setNextCursor(undefined);
    try {
      const res = await fetch(buildUrl(), { signal: controller.signal });
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities || []);
        setHasMore(data.pagination?.hasMore || false);
        setNextCursor(data.pagination?.nextCursor);

        if (!hasActiveFilters) {
          AdminDataCache.set("admin_activities_default", data.activities || [], 15000);
        }
      } else {
        setIsError(true);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setIsError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [buildUrl, hasActiveFilters]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchActivities();
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchActivities]);

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(buildUrl(nextCursor));
      const data = await res.json();
      if (data.success) {
        setActivities((prev) => [...prev, ...(data.activities || [])]);
        setHasMore(data.pagination?.hasMore || false);
        setNextCursor(data.pagination?.nextCursor);
      }
    } catch {}
    setIsLoadingMore(false);
  };

  const handleExport = () => {
    window.open("/api/admin/activity?export=csv", "_blank");
  };

  const handleOpenUndo = (act: AuditActivity) => {
    setUndoTargetActivity(act);
  };

  const handleConfirmUndo = async (activityId: string) => {
    const res = await fetch(`/api/admin/activity/${activityId}/undo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to reverse activity.");
    }

    // Update local activities optimistically
    setActivities((prev) => {
      const updated = prev.map((item) => {
        if (item.id === activityId) {
          return {
            ...item,
            isReversed: true,
            reversedAt: new Date(),
            reversalActivityId: data.reversalActivity?.id,
          };
        }
        return item;
      });

      if (data.reversalActivity) {
        return [data.reversalActivity, ...updated];
      }
      return updated;
    });

    if (selectedActivity?.id === activityId) {
      setSelectedActivity((prev) =>
        prev
          ? {
              ...prev,
              isReversed: true,
              reversedAt: new Date(),
              reversalActivityId: data.reversalActivity?.id,
            }
          : null
      );
    }

    // Invalidate caches
    AdminDataCache.invalidate("admin_activities_default");
    AdminDataCache.invalidate("admin_ipos");
    AdminDataCache.invalidate("admin_dashboard_summary");
    nexoDataCache.invalidate("ipos_apps");
    nexoDataCache.invalidate("members");

    window.dispatchEvent(new Event("storage"));

    setToastMessage(data.message || "✓ Action successfully reversed and audit log recorded.");
    setTimeout(() => setToastMessage(null), 6000);
  };

  const clearFilters = () => {
    setCategory("");
    setSeverity("");
    setDatePreset("");
    setRoleFilter("");
    setSearch("");
  };

  return (
    <div className="space-y-5 font-sans antialiased text-slate-900 dark:text-[#F5F7FA] pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-[#102C22] border border-emerald-200 dark:border-[#32C98B]/30 text-xs font-extrabold text-emerald-800 dark:text-[#32C98B] flex items-center justify-between gap-3 shadow-md animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 dark:text-[#32C98B] cursor-pointer">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">Activity</h1>
          <p className="text-xs text-slate-500 dark:text-[#858D99] mt-0.5 font-medium">
            System-wide activity and audit history · Review important actions across your NEXO workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {/* Timeline/Table toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "timeline"
                  ? "bg-white dark:bg-[#1D2026] text-slate-900 dark:text-[#F5F7FA] shadow-sm"
                  : "text-slate-500 dark:text-[#858D99]"
              }`}
            >
              <ListBullets size={14} />
              Timeline
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-[#1D2026] text-slate-900 dark:text-[#F5F7FA] shadow-sm"
                  : "text-slate-500 dark:text-[#858D99]"
              }`}
            >
              <Table size={14} />
              Table
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-700 dark:text-[#AEB5C0] hover:bg-slate-50 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
          >
            <DownloadSimple size={14} />
            Export
          </button>
        </div>
      </div>

      {/* ── SUMMARY ── */}
      <ActivitySummary />

      {/* ── SEARCH + FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#626A75]" />
          <input
            type="text"
            placeholder="Search activity… (actor, event, IPO, member)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.nativeEvent.isComposing) return;
                e.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                fetchActivities();
              }
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs font-semibold text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#626A75] focus:outline-none focus:border-blue-600 dark:focus:border-[#6B93FF] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            hasActiveFilters
              ? "bg-blue-50 dark:bg-[#17233D] border-blue-200 dark:border-[#6B93FF]/30 text-blue-600 dark:text-[#6B93FF]"
              : "bg-white dark:bg-[#101114] border-slate-200 dark:border-[#252931] text-slate-700 dark:text-[#AEB5C0] hover:bg-slate-50 dark:hover:bg-[#1D2026]"
          }`}
        >
          <Funnel size={14} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-[#6B93FF]" />
          )}
        </button>

        {/* Refresh */}
        <button
          onClick={fetchActivities}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] bg-white dark:bg-[#101114] text-xs font-bold text-slate-700 dark:text-[#AEB5C0] hover:bg-slate-50 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
          title="Refresh activities"
        >
          <ArrowClockwise size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── EXPANDABLE FILTERS PANEL ── */}
      {showFilters && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] shadow-xs space-y-3 animate-fade-in text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Category */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#1D2026] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-800 dark:text-[#D4D9E2] focus:outline-none focus:border-blue-600"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#1D2026] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-800 dark:text-[#D4D9E2] focus:outline-none focus:border-blue-600"
              >
                <option value="">All Severities</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Actor Role */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-1">
                Actor Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#1D2026] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-800 dark:text-[#D4D9E2] focus:outline-none focus:border-blue-600"
              >
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            </div>

            {/* Date Preset */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-[#626A75] uppercase tracking-wider mb-1">
                Date Range
              </label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#1D2026] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-800 dark:text-[#D4D9E2] focus:outline-none focus:border-blue-600"
              >
                <option value="">All Time</option>
                {DATE_PRESETS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-1">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-[#858D99] hover:text-slate-800 dark:hover:text-[#F5F7FA] cursor-pointer"
              >
                <X size={12} />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITY CONTENT ── */}
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl overflow-hidden shadow-2xs">
        {/* Content header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#1B1E23] bg-slate-50/50 dark:bg-[#14161A] flex items-center justify-between">
          <p className="text-[11px] font-extrabold text-slate-500 dark:text-[#858D99] uppercase tracking-wider">
            {isLoading ? "Loading…" : `${activities.length} events${hasMore ? "+" : ""}`}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] font-bold text-blue-600 dark:text-[#6B93FF] hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-4">
            {viewMode === "timeline" ? <ActivityTimelineSkeleton count={8} /> : <ActivityTableSkeleton count={8} />}
          </div>
        )}

        {/* Error */}
        {!isLoading && isError && (
          <ActivityErrorState onRetry={fetchActivities} />
        )}

        {/* Empty */}
        {!isLoading && !isError && activities.length === 0 && (
          <ActivityEmptyState />
        )}

        {/* Timeline */}
        {!isLoading && !isError && activities.length > 0 && viewMode === "timeline" && (
          <div className="p-4">
            <ActivityTimeline
              activities={activities}
              onSelect={setSelectedActivity}
              onUndo={handleOpenUndo}
            />
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && activities.length > 0 && viewMode === "table" && (
          <div className="p-4">
            <ActivityTable
              activities={activities}
              onSelect={setSelectedActivity}
              onUndo={handleOpenUndo}
            />
          </div>
        )}

        {/* Load More */}
        {!isLoading && hasMore && (
          <div className="px-5 py-4 border-t border-slate-100 dark:border-[#1B1E23] flex justify-center">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="px-5 py-2 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-700 dark:text-[#AEB5C0] hover:bg-slate-50 dark:hover:bg-[#1D2026] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <ActivityDetailDrawer
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        onUndo={handleOpenUndo}
      />

      {/* Undo Confirmation Modal */}
      <UndoConfirmationModal
        activity={undoTargetActivity}
        isOpen={Boolean(undoTargetActivity)}
        onClose={() => setUndoTargetActivity(null)}
        onConfirm={handleConfirmUndo}
      />
    </div>
  );
}
