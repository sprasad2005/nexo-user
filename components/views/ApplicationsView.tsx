"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { formatINR } from "@/lib/mockData";
import { AllotmentStatus } from "@/types/nexo";
import {
  LockKey,
  ArrowSquareOut,
  User,
  Users,
  PencilSimple,
  Trash,
  X,
  CheckCircle,
  FloppyDisk,
  ShieldCheck,
} from "@phosphor-icons/react";

function formatAppDateTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${day} ${month} ${year}, ${time}`;
  } catch {
    return dateStr;
  }
}

export function ApplicationsView() {
  const {
    ipos,
    updateRegistrarUrl,
    selectedIpo,
    activeApplicationIpo,
    deleteApplication,
    updateApplication,
    currentMember,
    currentUser,
  } = useNexo();

  // Local Filter for selecting single IPO / Company
  const [ipoFilter, setIpoFilter] = useState<string>("");
  const [viewScope, setViewScope] = useState<"ALL" | "MY">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ALLOTTED" | "AWAITING" | "NOT_ALLOTTED">("ALL");
  
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [customRegistrarUrl, setCustomRegistrarUrl] = useState("");

  // Edit Application Modal State
  const [editingApp, setEditingApp] = useState<{
    ipoId: string;
    appId: string;
    applicantName: string;
    lotCount: number | "";
    panNumbers: string[];
  } | null>(null);

  // Delete Application Confirmation Modal State
  const [deleteConfirmApp, setDeleteConfirmApp] = useState<{
    ipoId: string;
    appId: string;
    name: string;
  } | null>(null);

  // Sync filter when navigating or default to first available IPO
  useEffect(() => {
    if (activeApplicationIpo) {
      setIpoFilter(activeApplicationIpo.id);
    } else if (!ipoFilter && ipos.length > 0) {
      setIpoFilter(ipos[0].id);
    }
  }, [ipos, activeApplicationIpo, ipoFilter]);

  // Dynamically select single active IPO to display based on ipoFilter
  const selectedIpoList = useMemo(() => {
    if (!ipos || ipos.length === 0) return [];
    const found = ipos.find((i) => i.id === ipoFilter);
    return found ? [found] : [ipos[0]];
  }, [ipos, ipoFilter]);

  // Selected active IPO object
  const activeIpo = selectedIpoList[0];

  // Calculate summary metrics for the selected active IPOs
  const activeIpoMetrics = useMemo(() => {
    if (!selectedIpoList || selectedIpoList.length === 0) return null;
    let totalApps = 0;
    let totalAmount = 0;
    let allottedAmount = 0;
    let awaitingAmount = 0;
    let notAllottedAmount = 0;

    selectedIpoList.forEach((ipo) => {
      if (Array.isArray(ipo.applications)) {
        ipo.applications.forEach((app) => {
          totalApps += 1;
          const amt = app.totalContribution || 0;
          totalAmount += amt;

          const st = app.allotmentStatus || app.status || "AWAITING";
          if (st === "ALLOTTED") allottedAmount += amt;
          else if (st === "AWAITING") awaitingAmount += amt;
          else if (st === "NOT_ALLOTTED") notAllottedAmount += amt;
        });
      }
    });

    return {
      totalApps,
      totalAmount,
      allottedAmount,
      awaitingAmount,
      notAllottedAmount,
    };
  }, [selectedIpoList]);

  // Helper renderer for read-only status pill
  const renderStatusControl = (currentStatus: AllotmentStatus) => {
    const status = currentStatus || "AWAITING";

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-caption font-semibold border ${
          status === "ALLOTTED"
            ? "bg-positive-soft border-positive/30 text-positive"
            : status === "NOT_ALLOTTED"
            ? "bg-negative-soft border-negative/30 text-negative"
            : "bg-caution-soft border-caution/30 text-caution"
        }`}
      >
        {status === "ALLOTTED"
          ? "Allotted"
          : status === "NOT_ALLOTTED"
          ? "Not Allotted"
          : "Awaiting"}
      </span>
    );
  };

  const handleSaveRegistrarUrl = () => {
    if (activeIpo && customRegistrarUrl.trim()) {
      updateRegistrarUrl(activeIpo.id, customRegistrarUrl.trim());
      setIsUrlModalOpen(false);
    }
  };

  const handleLotCountChange = (valStr: string) => {
    if (!editingApp) return;
    if (valStr === "") {
      setEditingApp({
        ...editingApp,
        lotCount: "",
      });
      return;
    }

    const num = parseInt(valStr, 10);
    if (isNaN(num)) return;
    const count = Math.max(1, Math.min(50, num));

    const updatedPans = [...editingApp.panNumbers];
    while (updatedPans.length < count) {
      updatedPans.push("");
    }

    setEditingApp({
      ...editingApp,
      lotCount: count,
      panNumbers: updatedPans,
    });
  };

  const [editPanError, setEditPanError] = useState<string | null>(null);

  const handlePanNumberChange = (index: number, val: string) => {
    if (!editingApp) return;
    setEditPanError(null);
    const updated = [...editingApp.panNumbers];
    updated[index] = val.toUpperCase().slice(0, 10);
    setEditingApp({ ...editingApp, panNumbers: updated });
  };

  const handleSaveEditApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingApp) {
      setEditPanError(null);
      const effectiveCount = Math.max(1, typeof editingApp.lotCount === "number" ? editingApp.lotCount : 1);
      const cleanPans = editingApp.panNumbers.map((p, idx) =>
        p && !p.includes("X") && p.length === 10 ? p.trim().toUpperCase() : `ABCDE274${idx + 1}D`
      );

      // 1. Intra-form duplicate check
      const seenPans = new Set<string>();
      for (const pan of cleanPans) {
        if (seenPans.has(pan)) {
          setEditPanError(`Duplicate PAN card "${pan}" in form. Each PAN must be unique.`);
          return;
        }
        seenPans.add(pan);
      }

      // 2. Check against other applications for this IPO
      const targetIpo = ipos.find((i) => i.id === editingApp.ipoId);
      if (targetIpo && targetIpo.applications) {
        const otherAppsPans = new Set<string>();
        targetIpo.applications
          .filter((a) => a.id !== editingApp.appId)
          .forEach((a) => {
            if (a.panMasked) otherAppsPans.add(a.panMasked.trim().toUpperCase());
            if (Array.isArray(a.panNumbers)) {
              a.panNumbers.forEach((p) => p && otherAppsPans.add(p.trim().toUpperCase()));
            }
          });

        for (const pan of cleanPans) {
          if (otherAppsPans.has(pan)) {
            setEditPanError(`PAN card "${pan}" is already used in another application for this IPO.`);
            return;
          }
        }
      }

      const primaryPan = cleanPans[0] || "ABCDE2741D";

      updateApplication(
        editingApp.ipoId,
        editingApp.appId,
        {
          applicantName: editingApp.applicantName.trim() || "Member",
          lotCount: effectiveCount,
          panMasked: primaryPan,
          panNumbers: cleanPans,
        }
      );
      setEditingApp(null);
    }
  };

  const handleDeleteApp = (ipoId: string, appId: string, name: string) => {
    setDeleteConfirmApp({ ipoId, appId, name });
  };

  const confirmDelete = () => {
    if (deleteConfirmApp) {
      deleteApplication(deleteConfirmApp.ipoId, deleteConfirmApp.appId);
      setDeleteConfirmApp(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmApp(null);
  };

  // Sequential numbering counter
  let sequentialCounter = 0;

  return (
    <div className="space-y-5 pb-12 animate-fade-in max-w-6xl mx-auto font-sans">
      {/* TOP BAR: SELECT IPO, SCOPE TOGGLE (ALL VS MY), METRICS & CHECK ALLOTMENT */}
      <div className="p-4 sm:p-5 bg-surface rounded-2xl border border-line shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Left: Select IPO / Company */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-small font-semibold text-ink-secondary">Select IPO:</span>
            <select
              value={ipoFilter}
              onChange={(e) => setIpoFilter(e.target.value)}
              className="bg-surface-alt border border-line-strong rounded-xl px-3.5 py-2 text-small font-semibold text-ink focus:border-accent focus:bg-surface outline-none cursor-pointer min-w-[200px] shadow-2xs transition-all"
            >
              {ipos.map((ipo) => (
                <option key={ipo.id} value={ipo.id}>
                  {ipo.name} {ipo.isHidden ? "(History)" : ""} {ipo.metrics?.issueSize ? `(${ipo.metrics.issueSize})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-line-subtle" />

          {/* SCOPE FILTER: ALL FRIENDS VS MY APPLICATIONS */}
          <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-xl border border-line shrink-0">
            <button
              onClick={() => setViewScope("ALL")}
              className={`px-3 py-1.5 rounded-lg text-small font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewScope === "ALL"
                  ? "bg-surface text-accent shadow-2xs border border-line"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              <Users size={15} weight="bold" />
              <span>All Friends&apos; Applications</span>
            </button>

            <button
              onClick={() => setViewScope("MY")}
              className={`px-3 py-1.5 rounded-lg text-small font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewScope === "MY"
                  ? "bg-accent text-white shadow-2xs"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              <User size={15} weight="bold" />
              <span>My Applications</span>
            </button>
          </div>
        </div>

        {/* Right Action Group: Inline Summary Metrics & Check Allotment Button */}
        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-line-subtle">
          {activeIpoMetrics && (
            <div className="flex items-center gap-4 text-small">
              <div>
                <span className="text-caption font-medium text-ink-tertiary block">Total Apps</span>
                <span className="text-body-md font-extrabold text-ink num-tabular">{activeIpoMetrics.totalApps}</span>
              </div>
              <div>
                <span className="text-caption font-medium text-ink-tertiary block">Total Amount</span>
                <span className="text-body-md font-extrabold text-ink num-tabular">{formatINR(activeIpoMetrics.totalAmount)}</span>
              </div>
            </div>
          )}

          {activeIpo && (
            <a
              href={activeIpo.registrarUrl || "https://ipostatus.kfintech.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4F75FF] via-[#436AF5] to-[#3B5FE0] hover:from-[#3E64F0] hover:to-[#3254D0] text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0 active:scale-[0.98] ring-1 ring-white/10"
            >
              <span>Check Allotment</span>
              <ArrowSquareOut size={15} weight="bold" />
            </a>
          )}
        </div>
      </div>

      {/* EDIT APPLICATION MODAL */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full border border-line shadow-2xl space-y-4 animate-modal-pop-in">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-accent" />
                <h3 className="text-h4 font-semibold text-ink tracking-tight">
                  Edit Application
                </h3>
              </div>
              <button
                onClick={() => setEditingApp(null)}
                className="w-7 h-7 rounded-full text-ink-muted hover:text-ink-secondary hover:bg-surface-alt flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditApp} className="space-y-4 text-small">
              {editPanError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
                  {editPanError}
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-caption font-semibold text-ink">
                  Applicant Name
                </label>
                <input
                  type="text"
                  required
                  value={editingApp.applicantName}
                  onChange={(e) =>
                    setEditingApp({ ...editingApp, applicantName: e.target.value })
                  }
                  placeholder="Enter applicant name"
                  className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2.5 text-body font-normal text-ink focus:bg-surface focus:border-accent outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-caption font-semibold text-ink">
                  Number of PAN Cards / Lots
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={editingApp.lotCount}
                  onChange={(e) => handleLotCountChange(e.target.value)}
                  onBlur={() => {
                    if (editingApp.lotCount === "" || editingApp.lotCount < 1) {
                      handleLotCountChange("1");
                    }
                  }}
                  placeholder="Enter number of lots (e.g. 5)"
                  className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2.5 text-body font-normal text-ink num-tabular focus:bg-surface focus:border-accent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-caption font-semibold text-ink flex items-center justify-between">
                  <span>PAN Card Numbers ({editingApp.panNumbers.length} Required)</span>
                  <span className="text-[11px] text-ink-muted font-normal">Auto-Uppercase</span>
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editingApp.panNumbers.map((pan, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-ink-tertiary w-16 shrink-0 font-mono text-center bg-surface-alt py-2 px-2 rounded-xl border border-line shadow-2xs">
                        PAN #{idx + 1}
                      </span>
                      <input
                        type="text"
                        maxLength={10}
                        required
                        placeholder={`e.g. ABCDE274${(idx % 9) + 1}D`}
                        value={pan}
                        onChange={(e) => handlePanNumberChange(idx, e.target.value)}
                        className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-ink uppercase focus:bg-surface focus:border-accent outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 rounded-xl border border-line text-small font-medium text-ink-secondary hover:bg-surface-alt cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-small shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FloppyDisk size={15} weight="bold" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN REGISTRAR URL EDIT MODAL */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full border border-line shadow-xl space-y-4 animate-fade-in">
            <div>
              <h3 className="text-h4 font-semibold text-ink">
                Configure Registrar URL ({activeIpo?.name})
              </h3>
              <p className="text-small text-ink-tertiary mt-1">
                Enter the official IPO allotment status URL for this company&apos;s registrar.
              </p>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink-secondary mb-1">
                Registrar Webpage URL
              </label>
              <input
                type="url"
                value={customRegistrarUrl}
                onChange={(e) => setCustomRegistrarUrl(e.target.value)}
                placeholder="https://linkintime.co.in/initial_offer/public-issues.html"
                className="w-full bg-surface-alt border border-line-strong rounded-xl px-3 py-2 text-body font-normal text-ink focus:border-accent focus:bg-surface outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-line text-small font-medium text-ink-secondary hover:bg-surface-alt cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRegistrarUrl}
                className="px-4 py-1.5 rounded-lg bg-accent text-white text-small font-semibold hover:bg-accent-hover shadow-xs cursor-pointer transition-colors"
              >
                Save URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE CLEAN FINTECH INVESTMENT LEDGER CONTAINER */}
      {selectedIpoList.map((ipo) => {
        const filteredApps = ipo.applications.filter((app) => {
          // Status filter
          if (statusFilter !== "ALL") {
            const st = app.allotmentStatus || app.status || "AWAITING";
            if (st !== statusFilter) return false;
          }

          // View scope filter (All vs My)
          if (viewScope === "MY") {
            const currentUserName = (currentUser?.name || currentMember?.name || "ankit").toLowerCase();
            const currentUserId = currentUser?.id || currentMember?.id || "mem_1";
            const appName = (app.applicantName || "").toLowerCase();

            const isMy =
              app.memberId === currentUserId ||
              (appName && currentUserName && appName.includes(currentUserName)) ||
              (app.participants && app.participants.some(p => p.memberId === currentUserId || (p.memberName && p.memberName.toLowerCase().includes(currentUserName))));

            if (!isMy) return false;
          }

          return true;
        });

        const totalExpandedCount = filteredApps.reduce(
          (sum, app) => sum + Math.max(1, app.lotCount || 1),
          0
        );

        return (
          <div
            key={ipo.id}
            className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden"
          >
            {/* IPO HEADER WITH STATUS FILTER BUTTONS */}
            <div className="p-5 bg-surface border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-alt border border-line text-ink font-bold text-small flex items-center justify-center shrink-0 shadow-2xs">
                  {ipo.logo || ipo.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-h4 font-semibold text-ink tracking-tight">
                      {ipo.name} IPO
                    </h2>
                    <span className="text-caption font-semibold text-accent bg-accent-soft border border-accent/20 px-2 py-0.5 rounded-md">
                      {viewScope === "MY" ? "My Submissions" : "Group Ledger"}
                    </span>
                  </div>
                  <div className="text-small text-ink-tertiary font-medium mt-0.5">
                    Lot Price: {formatINR(ipo.metrics.minInvestment)} • {ipo.category || "Mainboard"}
                  </div>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-xl border border-line shrink-0">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-small font-semibold transition-all cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-surface text-ink shadow-2xs border border-line"
                      : "text-ink-tertiary hover:text-ink"
                  }`}
                >
                  All ({totalExpandedCount})
                </button>
                <button
                  onClick={() => setStatusFilter("ALLOTTED")}
                  className={`px-3 py-1 rounded-lg text-small font-semibold transition-all cursor-pointer ${
                    statusFilter === "ALLOTTED"
                      ? "bg-positive-soft text-positive border border-positive/30 shadow-2xs"
                      : "text-ink-secondary hover:text-positive"
                  }`}
                >
                  Allotted
                </button>
                <button
                  onClick={() => setStatusFilter("AWAITING")}
                  className={`px-3 py-1 rounded-lg text-small font-semibold transition-all cursor-pointer ${
                    statusFilter === "AWAITING"
                      ? "bg-caution-soft text-caution border border-caution/30 shadow-2xs"
                      : "text-ink-secondary hover:text-caution"
                  }`}
                >
                  Awaiting
                </button>
                <button
                  onClick={() => setStatusFilter("NOT_ALLOTTED")}
                  className={`px-3 py-1 rounded-lg text-small font-semibold transition-all cursor-pointer ${
                    statusFilter === "NOT_ALLOTTED"
                      ? "bg-negative-soft text-negative border border-negative/30 shadow-2xs"
                      : "text-ink-secondary hover:text-negative"
                  }`}
                >
                  Not Allotted
                </button>
              </div>
            </div>

            {/* TABLE HEADER */}
            <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-surface-alt/60 border-b border-line text-caption font-semibold text-ink-tertiary uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Applicant / Contributors</div>
              <div className="col-span-3">PAN Card</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* APPLICATION LEDGER ROWS */}
            <div className="divide-y divide-line-subtle">
              {filteredApps.length === 0 ? (
                <div className="p-12 text-center text-small text-ink-tertiary font-medium space-y-1">
                  <div className="text-body-md font-semibold text-ink">No applications found</div>
                  <div>No applications match your scope or filter criteria.</div>
                </div>
              ) : (() => {
                const formatApplicantHandles = (nameStr: string) => {
                  if (!nameStr) return "Member";
                  return nameStr
                    .split(",")
                    .map((part) => {
                      const trimmed = part.trim();
                      if (!trimmed) return "";
                      return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
                    })
                    .filter(Boolean)
                    .join(", ");
                };

                const nameTotalCounts: Record<string, number> = {};
                filteredApps.forEach((app) => {
                  const rawName =
                    app.applicantName ||
                    (app.participants && app.participants.length > 0
                      ? app.participants.map((p) => p.memberName).join(", ")
                      : "Member");
                  const name = formatApplicantHandles(rawName);
                  const count = Math.max(1, app.lotCount || 1);
                  nameTotalCounts[name] = (nameTotalCounts[name] || 0) + count;
                });

                const nameRunningIndex: Record<string, number> = {};

                return filteredApps.flatMap((app) => {
                  const currentStatus =
                    (app.allotmentStatus as AllotmentStatus) ||
                    (app.status as AllotmentStatus) ||
                    "AWAITING";

                  const applicantName = app.applicantName || "Ashay";
                  const lotCount = Math.max(1, app.lotCount || 1);
                  const minInvest = ipo.metrics?.minInvestment || 14964;
                  const perLotAmount = Math.round(app.totalContribution / lotCount) || minInvest;

                  const rawDisplayNames =
                    app.applicantName ||
                    (app.participants && app.participants.length > 0
                      ? app.participants.map((p) => p.memberName).join(", ")
                      : "Member");
                  const displayNames = formatApplicantHandles(rawDisplayNames);

                  const currentUserName = (currentUser?.name || currentMember?.name || "").toLowerCase();
                  const currentUserId = currentUser?.id || currentMember?.id || "mem_1";
                  const isAdmin = (currentUser?.role || currentMember?.role) === "ADMIN";

                  const isMine = Boolean(
                    isAdmin ||
                    (app.memberId && app.memberId === currentUserId) ||
                    (app.applicantName && currentUserName && app.applicantName.toLowerCase().includes(currentUserName)) ||
                    (displayNames && currentUserName && displayNames.toLowerCase().includes(currentUserName)) ||
                    (Array.isArray(app.participants) &&
                      app.participants.some(
                        (p) =>
                          p.memberId === currentUserId ||
                          (p.memberName && currentUserName && p.memberName.toLowerCase().includes(currentUserName))
                      ))
                  );

                  return Array.from({ length: lotCount }).map((_, lotIdx) => {
                    sequentialCounter += 1;
                    const formattedSeq = String(sequentialCounter).padStart(2, "0");

                    const panFromApp = (app.panNumbers && app.panNumbers[lotIdx] && app.panNumbers[lotIdx].trim())
                      ? app.panNumbers[lotIdx].trim()
                      : (app.participants && app.participants[lotIdx] && app.participants[lotIdx].panMasked && !app.participants[lotIdx].panMasked.includes("X"))
                      ? app.participants[lotIdx].panMasked
                      : (app.panMasked && !app.panMasked.includes("X"))
                      ? app.panMasked
                      : `ABCDE${String(2741 + lotIdx).padStart(4, "0")}D`;
                    const panDisplay = panFromApp.toUpperCase();

                    const baseName = displayNames;
                    nameRunningIndex[baseName] = (nameRunningIndex[baseName] || 0) + 1;

                    const lotDisplayName = (nameTotalCounts[baseName] || 0) > 1
                      ? `${baseName} ${nameRunningIndex[baseName]}`
                      : baseName;

                    return (
                      <React.Fragment key={`${app.id}_lot_${lotIdx}`}>
                        {/* DESKTOP ROW (md and larger) */}
                        <div className="hidden md:grid md:grid-cols-12 px-6 py-4 items-center hover:bg-surface-alt/60 transition-colors text-small">
                          {/* # SR No */}
                          <div className="col-span-1 num-tabular font-semibold text-ink">
                            {formattedSeq}
                          </div>

                          {/* Contributors List / Name */}
                          <div className="col-span-4">
                            <div className="text-body-md font-semibold text-ink tracking-tight">
                              {lotDisplayName}
                            </div>
                            {app.createdAt && (
                              <div className="text-[11px] font-mono text-ink-tertiary mt-0.5">
                                {formatAppDateTime(app.createdAt)}
                              </div>
                            )}
                          </div>

                          {/* PAN Card Column */}
                          <div className="col-span-3 self-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-surface-alt border border-line-strong font-mono text-[12px] font-bold text-ink tracking-wider shadow-2xs">
                              {panDisplay}
                            </span>
                          </div>

                          {/* Amount */}
                          <div className="col-span-2 text-right self-center num-table text-ink font-semibold">
                            {formatINR(perLotAmount)}
                          </div>

                          {/* ACTIONS: EDIT & DELETE */}
                          <div className="col-span-2 flex items-center justify-end gap-1.5">
                            {isMine ? (
                              <>
                                  <button
                                    onClick={() => {
                                      const initialCount = lotCount || 1;
                                      const existingPans = app.panNumbers && app.panNumbers.length > 0 ? app.panNumbers : [app.panMasked || "ABCDE2741D"];
                                      const initialPans = Array.from({ length: initialCount }).map((_, idx) => {
                                        const raw = existingPans[idx] || existingPans[0] || "";
                                        return raw && !raw.includes("X") && raw.length === 10
                                          ? raw
                                          : `ABCDE274${idx + 1}D`;
                                      });
                                      setEditingApp({
                                        ipoId: ipo.id,
                                        appId: app.id,
                                        applicantName: applicantName,
                                        lotCount: initialCount,
                                        panNumbers: initialPans,
                                      });
                                    }}
                                  className="p-1.5 rounded-lg text-ink-tertiary hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer"
                                  title="Edit Application"
                                >
                                  <PencilSimple size={16} weight="bold" />
                                </button>
                                <button
                                  onClick={() => handleDeleteApp(ipo.id, app.id, applicantName)}
                                  className="p-1.5 rounded-lg text-ink-muted hover:text-negative hover:bg-negative-soft transition-colors cursor-pointer"
                                  title="Delete Application"
                                >
                                  <Trash size={16} weight="bold" />
                                </button>
                              </>
                            ) : (
                              <span className="text-caption font-medium text-ink-muted flex items-center gap-1">
                                <LockKey size={13} />
                                View Only
                              </span>
                            )}
                          </div>
                        </div>

                        {/* MOBILE CARD VIEW (< md screens) */}
                        <div className="md:hidden p-4 border-b border-line-subtle flex flex-col gap-3 hover:bg-surface-alt/50 transition-colors">
                          {/* Top: # SR + Names + Edit/Delete */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="num-tabular text-caption font-semibold text-ink-secondary bg-surface-alt px-2 py-0.5 rounded-md shrink-0 border border-line-subtle">
                                #{formattedSeq}
                              </span>
                              <div className="min-w-0">
                                <span className="text-body-md font-semibold text-ink tracking-tight truncate block">
                                  {lotDisplayName}
                                </span>
                                {app.createdAt && (
                                  <span className="text-[10px] font-mono text-ink-tertiary block mt-0.5">
                                    {formatAppDateTime(app.createdAt)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isMine ? (
                                <>
                                  <button
                                    onClick={() => {
                                      const initialCount = lotCount || 1;
                                      const existingPans = app.panNumbers && app.panNumbers.length > 0 ? app.panNumbers : [app.panMasked || "ABCDE2741D"];
                                      const initialPans = Array.from({ length: initialCount }).map((_, idx) => {
                                        const raw = existingPans[idx] || existingPans[0] || "";
                                        return raw && !raw.includes("X") && raw.length === 10
                                          ? raw
                                          : `ABCDE274${idx + 1}D`;
                                      });
                                      setEditingApp({
                                        ipoId: ipo.id,
                                        appId: app.id,
                                        applicantName: applicantName,
                                        lotCount: initialCount,
                                        panNumbers: initialPans,
                                      });
                                    }}
                                    className="p-1.5 rounded-lg text-ink-tertiary hover:text-accent hover:bg-accent-soft transition-colors"
                                    title="Edit Application"
                                  >
                                    <PencilSimple size={16} weight="bold" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteApp(ipo.id, app.id, applicantName)}
                                    className="p-1.5 rounded-lg text-ink-muted hover:text-negative hover:bg-negative-soft transition-colors"
                                    title="Delete Application"
                                  >
                                    <Trash size={16} weight="bold" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-caption font-medium text-ink-muted flex items-center gap-1">
                                  <LockKey size={13} />
                                  View Only
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Middle: PAN + Amount */}
                          <div className="flex items-center justify-between bg-surface-alt/70 p-2.5 rounded-xl border border-line-subtle text-small">
                            <div>
                              <span className="text-caption text-ink-tertiary block uppercase font-medium">PAN</span>
                              <span className="font-mono font-bold text-ink text-[12px] tracking-wider">{panDisplay}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-caption text-ink-tertiary block uppercase font-medium">Total Amount</span>
                              <span className="num-table font-semibold text-ink">{formatINR(perLotAmount)}</span>
                            </div>
                          </div>

                          {/* Bottom: Status */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-small font-medium text-ink-tertiary">Status</span>
                            <div>{renderStatusControl(currentStatus)}</div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                });
              })()}
            </div>

            {/* FOOTER NOTE */}
            <div className="px-6 py-3 bg-surface-alt/40 border-t border-line-subtle flex items-center justify-between text-caption font-medium text-ink-tertiary">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-positive" />
                <span>Showing {totalExpandedCount} application(s) for {ipo.name}</span>
              </div>
              <div className="flex items-center gap-1 text-ink-muted">
                <LockKey size={13} />
                <span>Encrypted Group Ledger</span>
              </div>
            </div>
          </div>
        );
      })}
      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-5 shadow-2xl space-y-4 animate-modal-pop-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-negative-soft border border-negative/30 flex items-center justify-center text-negative shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-h4 font-semibold text-ink tracking-tight">Delete Application</h3>
                <p className="text-caption text-ink-tertiary font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-small text-ink-secondary font-medium leading-relaxed">
              Are you sure you want to delete the IPO application for <strong className="text-ink font-semibold">{deleteConfirmApp.name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={cancelDelete}
                className="px-3.5 py-2 rounded-xl border border-line text-small font-medium text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-negative hover:bg-rose-700 text-white font-semibold text-small shadow-xs transition-all active:scale-[0.98] cursor-pointer select-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
