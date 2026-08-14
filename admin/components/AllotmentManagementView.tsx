"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle,
  MagnifyingGlass,
  Funnel,
  CaretDown,
  ArrowClockwise,
  ShieldCheck,
  WarningCircle,
  Info,
  Lock,
  LockOpen,
  Check,
  X,
  Files,
} from "@phosphor-icons/react";

export interface ApplicationItem {
  id: string;
  applicantName: string;
  username: string;
  pan: string;
  applicationNumber: string;
  lotsApplied: number;
  allotmentStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED";
  rawStatus?: string;
  totalContribution?: number;
  createdAt?: string;
}

export interface IPOItem {
  id: string;
  name: string;
  company: string;
  category: string;
  status: string;
  allotmentFinalized: boolean;
  allotmentFinalizedAt: string | null;
  allotmentFinalizedBy: string | null;
  metrics: {
    issueSize?: string;
    allotmentDate?: string;
    lotSize?: number;
    minInvestment?: number;
  };
}

export function AllotmentManagementView() {
  // Data states
  const [ipos, setIpos] = useState<IPOItem[]>([]);
  const [selectedIpoId, setSelectedIpoId] = useState<string>("");
  const [selectedIpo, setSelectedIpo] = useState<IPOItem | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("ADMIN");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAppsLoading, setIsAppsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ALLOTTED" | "NOT_ALLOTTED">("ALL");
  const [sortBy, setSortBy] = useState<"name" | "lots" | "app_no" | "status">("name");

  // Selection states (working draft of selected applicant IDs intended for allotment)
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [workingAllottedIds, setWorkingAllottedIds] = useState<Set<string>>(new Set());

  // Toast & Modals
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState<boolean>(false);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch initial IPO list
  const fetchIpos = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/allotment");
      const data = await res.json();
      if (res.ok && data.success) {
        setIpos(data.ipos || []);
        if (data.currentUserRole) {
          setCurrentUserRole(data.currentUserRole);
        }
        if (data.ipos?.length > 0 && !selectedIpoId) {
          setSelectedIpoId(data.ipos[0].id);
        }
      } else {
        showToast(data.error || "Failed to load IPO catalog.", "error");
      }
    } catch {
      showToast("Unable to connect to administrative server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch applications for selected IPO
  const fetchApplicationsForIpo = async (ipoId: string) => {
    if (!ipoId) return;
    try {
      setIsAppsLoading(true);
      const res = await fetch(`/api/admin/allotment?ipoId=${encodeURIComponent(ipoId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedIpo(data.selectedIpo || null);
        const apps: ApplicationItem[] = data.applications || [];
        setApplications(apps);

        // Pre-populate workingAllottedIds with currently allotted applications
        const allottedSet = new Set<string>();
        apps.forEach((a) => {
          if (a.allotmentStatus === "ALLOTTED") {
            allottedSet.add(a.id);
          }
        });
        setWorkingAllottedIds(allottedSet);
        setSelectedAppIds([]);
      } else {
        showToast(data.error || "Failed to load applications for selected IPO.", "error");
      }
    } catch {
      showToast("Error loading application records.", "error");
    } finally {
      setIsAppsLoading(false);
    }
  };

  useEffect(() => {
    fetchIpos();
  }, []);

  useEffect(() => {
    if (selectedIpoId) {
      fetchApplicationsForIpo(selectedIpoId);
    }
  }, [selectedIpoId]);

  // Real-time filtering
  const filteredApplications = useMemo(() => {
    let list = [...applications];

    // Search across Applicant name/username, PAN, Application Number
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (app) =>
          app.applicantName.toLowerCase().includes(q) ||
          app.username.toLowerCase().includes(q) ||
          app.pan.toLowerCase().includes(q) ||
          app.applicationNumber.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      list = list.filter((app) => {
        if (statusFilter === "PENDING") return app.allotmentStatus === "PENDING";
        if (statusFilter === "ALLOTTED") return app.allotmentStatus === "ALLOTTED";
        if (statusFilter === "NOT_ALLOTTED") return app.allotmentStatus === "NOT_ALLOTTED";
        return true;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "lots") return b.lotsApplied - a.lotsApplied;
      if (sortBy === "app_no") return a.applicationNumber.localeCompare(b.applicationNumber);
      if (sortBy === "status") return a.allotmentStatus.localeCompare(b.allotmentStatus);
      return a.applicantName.localeCompare(b.applicantName);
    });

    return list;
  }, [applications, searchQuery, statusFilter, sortBy]);

  // Dynamic summary metrics calculation
  const summaryMetrics = useMemo(() => {
    const totalApps = applications.length;
    const pendingApps = applications.filter((a) => a.allotmentStatus === "PENDING").length;
    const allottedApps = applications.filter((a) => a.allotmentStatus === "ALLOTTED").length;
    const notAllottedApps = applications.filter((a) => a.allotmentStatus === "NOT_ALLOTTED").length;
    const totalLots = applications.reduce((sum, a) => sum + (a.lotsApplied || 1), 0);

    return {
      totalApplications: totalApps,
      pendingApplications: pendingApps,
      allottedApplications: allottedApps,
      notAllottedApplications: notAllottedApps,
      totalLotsApplied: totalLots,
    };
  }, [applications]);

  // Bulk Selection Handlers (operates on visible/filtered applications)
  const isAllVisibleSelected =
    filteredApplications.length > 0 &&
    filteredApplications.every((app) => selectedAppIds.includes(app.id));

  const handleSelectAllVisible = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const visibleIds = filteredApplications.map((a) => a.id);
      const union = Array.from(new Set([...selectedAppIds, ...visibleIds]));
      setSelectedAppIds(union);
    } else {
      const visibleIds = new Set(filteredApplications.map((a) => a.id));
      setSelectedAppIds(selectedAppIds.filter((id) => !visibleIds.has(id)));
    }
  };

  const handleToggleRowSelection = (id: string) => {
    if (selectedAppIds.includes(id)) {
      setSelectedAppIds(selectedAppIds.filter((item) => item !== id));
    } else {
      setSelectedAppIds([...selectedAppIds, id]);
    }
  };

  // Toggle intended allotment working state for individual or selected apps
  const handleMarkSelectedAsAllotted = () => {
    if (selectedAppIds.length === 0) return;
    const nextSet = new Set(workingAllottedIds);
    selectedAppIds.forEach((id) => nextSet.add(id));
    setWorkingAllottedIds(nextSet);
    showToast(`Marked ${selectedAppIds.length} application(s) for allotment.`);
  };

  const handleUnmarkSelected = () => {
    if (selectedAppIds.length === 0) return;
    const nextSet = new Set(workingAllottedIds);
    selectedAppIds.forEach((id) => nextSet.delete(id));
    setWorkingAllottedIds(nextSet);
    showToast(`Removed ${selectedAppIds.length} application(s) from allotment selection.`);
  };

  const handleToggleWorkingAllotment = (appId: string) => {
    if (isMemberRole) return;
    const nextSet = new Set(workingAllottedIds);
    if (nextSet.has(appId)) {
      nextSet.delete(appId);
    } else {
      nextSet.add(appId);
    }
    setWorkingAllottedIds(nextSet);
  };

  // Finalize Allotment Submit
  const handleOpenFinalizeModal = () => {
    if (applications.length > 0 && workingAllottedIds.size === 0) {
      showToast("Select at least one applicant before finalizing allotment.", "error");
      return;
    }
    setIsFinalizeModalOpen(true);
  };

  const handleConfirmFinalize = async () => {
    if (!selectedIpoId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/allotment/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipoId: selectedIpoId,
          allottedApplicationIds: Array.from(workingAllottedIds),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsFinalizeModalOpen(false);
        showToast(data.message || "Allotment finalized successfully!");
        fetchApplicationsForIpo(selectedIpoId);
        fetchIpos();
      } else {
        showToast(data.error || "Failed to finalize allotment.", "error");
      }
    } catch {
      showToast("Network error while finalizing allotment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reopen Allotment Submit (Super Admin Only)
  const handleConfirmReopen = async () => {
    if (!selectedIpoId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/allotment/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipoId: selectedIpoId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsReopenModalOpen(false);
        showToast(data.message || "Allotment reopened successfully.");
        fetchApplicationsForIpo(selectedIpoId);
        fetchIpos();
      } else {
        showToast(data.error || "Failed to reopen allotment.", "error");
      }
    } catch {
      showToast("Network error while reopening allotment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMemberRole = currentUserRole === "MEMBER";
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  return (
    <div className="space-y-6 font-sans select-none pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all border animate-in fade-in slide-in-from-top-4 duration-300 ${
          toast.type === "error"
            ? "bg-rose-950/90 border-rose-800 text-rose-200"
            : toast.type === "info"
            ? "bg-blue-950/90 border-blue-800 text-blue-200"
            : "bg-emerald-950/90 border-emerald-800 text-emerald-200"
        }`}>
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#252931] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle size={26} className="text-blue-600 dark:text-[#6B93FF]" weight="fill" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F5F7FA]">
              Allotment
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#858D99] mt-1 font-medium">
            Manage IPO application allotment results
          </p>
        </div>

        {/* IPO SELECTOR */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-extrabold text-slate-500 dark:text-[#858D99] uppercase tracking-wider hidden sm:inline">
            Select IPO:
          </label>
          <div className="relative min-w-[240px]">
            <select
              value={selectedIpoId}
              onChange={(e) => setSelectedIpoId(e.target.value)}
              disabled={isLoading}
              className="w-full h-10 px-3.5 pr-8 rounded-xl bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-800 dark:text-[#F5F7FA] focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs transition-all"
            >
              <option value="" disabled>
                Select IPO ▼
              </option>
              {ipos.map((ipo) => (
                <option key={ipo.id} value={ipo.id}>
                  {ipo.name} {ipo.allotmentFinalized ? "✓ (Finalized)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* NO IPO SELECTED EDGE STATE */}
      {!selectedIpoId && !isLoading && (
        <div className="p-12 text-center bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl shadow-2xs space-y-3">
          <Files size={40} className="mx-auto text-slate-400 dark:text-slate-600" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Select an IPO to view its applications.
          </h3>
          <p className="text-xs text-slate-400">
            Choose an active IPO from the dropdown selector above to manage allotment declarations.
          </p>
        </div>
      )}

      {selectedIpoId && (
        <>
          {/* FINALIZATION BANNER / STATUS */}
          {selectedIpo?.allotmentFinalized && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold select-none">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-[#32C98B]">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <Check size={18} weight="bold" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm flex items-center gap-2">
                    ✓ Allotment Finalized
                  </h4>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Finalized on{" "}
                    {selectedIpo.allotmentFinalizedAt
                      ? new Date(selectedIpo.allotmentFinalizedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "14 Aug 2026"}{" "}
                    by <strong>{selectedIpo.allotmentFinalizedBy || "Admin"}</strong>
                  </p>
                </div>
              </div>

              {!isMemberRole && (
                <button
                  onClick={() => setIsReopenModalOpen(true)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#1A1D24] dark:hover:bg-[#252931] border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LockOpen size={15} />
                  <span>Reopen / Edit Allotment</span>
                </button>
              )}
            </div>
          )}

          {/* COMPACT IPO SUMMARY CARDS */}
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#252931]/60 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-[#F5F7FA]">
                {selectedIpo?.name || "Selected IPO Summary"}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A1D24] text-slate-600 dark:text-[#AEB5C0] font-bold border border-slate-200 dark:border-[#252931]">
                {selectedIpo?.category || "Mainboard"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 select-none">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">
                  Total Applications
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {summaryMetrics.totalApplications}
                </p>
              </div>

              <div className="space-y-1 border-l border-slate-100 dark:border-[#252931]/60 pl-4">
                <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider block">
                  Pending
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {summaryMetrics.pendingApplications}
                </p>
              </div>

              <div className="space-y-1 border-l border-slate-100 dark:border-[#252931]/60 pl-4">
                <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider block">
                  Allotted
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {summaryMetrics.allottedApplications}
                </p>
              </div>

              <div className="space-y-1 border-l border-slate-100 dark:border-[#252931]/60 pl-4">
                <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider block">
                  Not Allotted
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {summaryMetrics.notAllottedApplications}
                </p>
              </div>

              <div className="space-y-1 border-l border-slate-100 dark:border-[#252931]/60 pl-4 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-extrabold text-blue-500 dark:text-[#6B93FF] uppercase tracking-wider block">
                  Total Lots Applied
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {summaryMetrics.totalLotsApplied}
                </p>
              </div>
            </div>
          </div>

          {/* SEARCH & FILTERS CONTROLS BAR */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch justify-between select-none">
            {/* Search Input */}
            <div className="flex-1 max-w-md relative flex items-center">
              <input
                type="text"
                placeholder="Search by name, PAN or application number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs text-slate-900 dark:text-[#F5F7FA] focus:outline-none focus:border-blue-500 transition-all"
              />
              <MagnifyingGlass className="absolute left-3.5 text-slate-400 dark:text-[#858D99] w-4 h-4" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs & Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter Tabs */}
              <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-xl p-1 flex items-center gap-1 text-xs">
                {(["ALL", "PENDING", "ALLOTTED", "NOT_ALLOTTED"] as const).map((filter) => {
                  const isActive = statusFilter === filter;
                  const labelMap = {
                    ALL: "All",
                    PENDING: "Pending",
                    ALLOTTED: "Allotted",
                    NOT_ALLOTTED: "Not Allotted",
                  };
                  return (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-blue-600 text-white dark:bg-[#6B93FF] dark:text-[#101114] shadow-2xs"
                          : "text-slate-500 dark:text-[#858D99] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {labelMap[filter]}
                    </button>
                  );
                })}
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-xl px-3 py-2 text-xs">
                <span className="text-slate-400 dark:text-[#858D99] font-medium">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="name">Applicant Name</option>
                  <option value="lots">Lots Applied</option>
                  <option value="app_no">Application No.</option>
                  <option value="status">Status</option>
                </select>
              </div>

              {/* Primary Finalize / Update Allotment Action */}
              <button
                onClick={handleOpenFinalizeModal}
                disabled={isMemberRole || isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-[#6B93FF] dark:hover:bg-[#527DFF] text-white dark:text-[#101114] font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50 shrink-0"
              >
                <CheckCircle size={17} weight="bold" />
                <span>{selectedIpo?.allotmentFinalized ? "Update Allotment" : "Finalize Allotment"}</span>
              </button>
            </div>
          </div>

          {/* BULK ACTION SELECTION BAR */}
          {selectedAppIds.length > 0 && !isMemberRole && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 dark:bg-[#142340] dark:border-[#2C4880] rounded-xl flex items-center justify-between text-xs font-semibold select-none animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-[#6B93FF]">
                <Info size={16} />
                <span>
                  <strong>{selectedAppIds.length}</strong> applications selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkSelectedAsAllotted}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Check size={14} weight="bold" />
                  <span>Mark as Allotted</span>
                </button>
                <button
                  onClick={handleUnmarkSelected}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs cursor-pointer"
                >
                  Unmark
                </button>
                <button
                  onClick={() => setSelectedAppIds([])}
                  className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* APPLICATIONS TABLE */}
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl overflow-hidden shadow-2xs">
            {isAppsLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-3 animate-pulse">
                <ArrowClockwise size={30} className="mx-auto text-blue-500 animate-spin" />
                <p className="font-semibold">Loading applications...</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <WarningCircle size={36} className="mx-auto text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {searchQuery ? "No applications match your search." : "No applications found for this IPO."}
                </h3>
                <p className="text-xs text-slate-400">
                  {searchQuery
                    ? "Try adjusting your search criteria or clearing filters."
                    : "No user applications have been submitted for this IPO yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-[#14161A]/80 border-b border-slate-200 dark:border-[#252931] text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllVisibleSelected}
                          onChange={handleSelectAllVisible}
                          className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                          title="Select All Visible"
                        />
                      </th>
                      <th className="py-3 px-4">Applicant</th>
                      <th className="py-3 px-4">PAN</th>
                      <th className="py-3 px-4 text-center">Lots Applied</th>
                      <th className="py-3 px-4 text-center">Intended</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252931]/60">
                    {filteredApplications.map((app) => {
                      const isSelected = selectedAppIds.includes(app.id);
                      const isWorkingAllotted = workingAllottedIds.has(app.id);

                      return (
                        <tr
                          key={app.id}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-[#16181F] ${
                            isSelected ? "bg-blue-50/40 dark:bg-[#142340]/40" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRowSelection(app.id)}
                              className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                          </td>

                          {/* Applicant Name & Username */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-[#6B93FF] font-extrabold text-[11px] flex items-center justify-center uppercase shrink-0 border border-blue-200 dark:border-blue-800">
                                {(app.applicantName.replace(/^[^a-zA-Z0-9]+/, "").charAt(0) || "A").toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-800 dark:text-[#F5F7FA] truncate">
                                  {app.applicantName.replace(/^@+/, "").replace(/,\s*@+/g, ", ")}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-[#858D99] font-mono">
                                  @{app.username.replace(/^@+/, "")}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* PAN */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-[#AEB5C0]">
                            {app.pan}
                          </td>

                          {/* Lots Applied */}
                          <td className="py-3 px-4 text-center font-black text-slate-800 dark:text-[#F5F7FA]">
                            {app.lotsApplied}
                          </td>

                          {/* Intended Toggle */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleWorkingAllotment(app.id)}
                              disabled={isMemberRole}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                isWorkingAllotted
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-[#32C98B]"
                                  : "bg-slate-100 dark:bg-[#1A1D24] border-slate-200 dark:border-[#252931] text-slate-400"
                              }`}
                            >
                              {isWorkingAllotted ? "✓ Marked Allotted" : "Not Marked"}
                            </button>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 text-right">
                            {app.allotmentStatus === "ALLOTTED" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-[#32C98B] border border-emerald-500/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Allotted
                              </span>
                            )}
                            {app.allotmentStatus === "NOT_ALLOTTED" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-[#FF6B6B] border border-rose-500/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Not Allotted
                              </span>
                            )}
                            {app.allotmentStatus === "PENDING" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 1. FINALIZE CONFIRMATION MODAL ── */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <WarningCircle size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Finalize Allotment?
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#858D99]">
                  {selectedIpo?.name}
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-[#14161A] p-4 rounded-xl border border-slate-200 dark:border-[#252931] text-xs text-slate-700 dark:text-[#AEB5C0]">
              <p className="font-semibold">
                You have selected <strong>{workingAllottedIds.size}</strong> applications for allotment.
              </p>
              <div className="space-y-1.5 pt-1 font-medium">
                <p className="flex items-center gap-2 text-emerald-600 dark:text-[#32C98B]">
                  <span>•</span>
                  <span>
                    <strong>{workingAllottedIds.size}</strong> applications will be marked as{" "}
                    <strong>Allotted</strong>.
                  </span>
                </p>
                <p className="flex items-center gap-2 text-rose-600 dark:text-[#FF6B6B]">
                  <span>•</span>
                  <span>
                    <strong>{applications.length - workingAllottedIds.size}</strong> remaining
                    applications will be marked as <strong>Not Allotted</strong>.
                  </span>
                </p>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-[#252931]">
                This action will update the allotment status for this IPO and persist the results.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsFinalizeModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1A1D24] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFinalize}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-[#6B93FF] dark:hover:bg-[#527DFF] text-white dark:text-[#101114] text-xs font-extrabold shadow-md cursor-pointer transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <CheckCircle size={16} weight="bold" />
                    <span>Confirm & Finalize</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. REOPEN CONFIRMATION MODAL (Super Admin) ── */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <LockOpen size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Reopen Allotment?
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#858D99]">
                  {selectedIpo?.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#AEB5C0] leading-relaxed">
              This will allow the allotment results for <strong>{selectedIpo?.name}</strong> to be
              modified and re-finalized again.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsReopenModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1A1D24] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReopen}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all"
              >
                {isSubmitting ? "Reopening..." : "Reopen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
