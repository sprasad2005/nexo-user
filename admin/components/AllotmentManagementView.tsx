"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNexo } from "@/context/NexoContext";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CopyButton } from "@/components/ui/CopyButton";
import { AdminDataCache } from "../../lib/nexoDataCache";
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
  PencilSimple,
  Link,
  ArrowSquareOut,
  Files,
} from "@phosphor-icons/react";
import { formatApplicantNames } from "../../lib/mockData";

export interface ApplicationItem {
  id: string;
  applicantName: string;
  username: string;
  memberAvatar?: string;
  pan: string;
  panNumbers?: string[];
  applicationNumber: string;
  lotsApplied: number;
  allotmentStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED";
  rawStatus?: string;
  totalContribution?: number;
  createdAt?: string;
  allottedIndices?: number[];
}

export interface IPOItem {
  id: string;
  name: string;
  company: string;
  category: string;
  status: string;
  registrarUrl?: string;
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

function mapToApplicationItems(rawApps: any[]): ApplicationItem[] {
  if (!Array.isArray(rawApps)) return [];
  return rawApps.map((app: any) => {
    const cleanApplicant = formatApplicantNames(app);
    let cleanUsername = "";
    if (Array.isArray(app.participants) && app.participants.length > 0 && app.participants[0]?.memberName) {
      cleanUsername = String(app.participants[0].memberName).split(",")[0].replace(/^@+/, "").trim();
    }
    if (!cleanUsername) cleanUsername = cleanApplicant.split(",")[0].replace(/^@+/, "").trim();
    cleanUsername = cleanUsername.toLowerCase().replace(/[^a-z0-9_]/g, "") || "user";

    const pan = app.panNumbers?.[0] || app.panMasked || app.panFull || app.pan || "N/A";
    const lots = Number(app.lotsApplied || app.lotCount || app.numberOfPanCards || 1) || 1;
    const statusRaw = String(app.allotmentStatus || app.status || "AWAITING").toUpperCase();
    let normalizedStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED" = "PENDING";
    if (statusRaw === "ALLOTTED") normalizedStatus = "ALLOTTED";
    else if (statusRaw === "NOT_ALLOTTED" || statusRaw === "REFUNDED") normalizedStatus = "NOT_ALLOTTED";

    return {
      id: app.id || app._id?.toString(),
      applicantName: cleanApplicant,
      username: cleanUsername,
      memberAvatar: app.memberAvatar || undefined,
      pan: pan,
      panNumbers: Array.isArray(app.panNumbers) && app.panNumbers.length > 0 ? app.panNumbers : [pan],
      applicationNumber: app.applicationNumber || app.id || "APP-001",
      lotsApplied: lots,
      allotmentStatus: normalizedStatus,
      rawStatus: statusRaw,
      totalContribution: app.totalContribution || 15000,
      createdAt: app.createdAt || new Date().toISOString(),
      allottedIndices: app.allottedIndices || (normalizedStatus === "ALLOTTED" ? Array.from({ length: lots }, (_, i) => i) : []),
    };
  });
}

export function AllotmentManagementView() {
  const { ipos: nexoIpos, refreshIpos } = useNexo();

  const [storedIpoId, setStoredIpoId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nexo_admin_selected_ipo_id") || "";
    }
    return "";
  });

  // Data states
  const ipos = useMemo<IPOItem[]>(() => {
    if (nexoIpos && nexoIpos.length > 0) {
      return nexoIpos.map((i) => ({
        id: i.id,
        name: i.name,
        company: i.company || i.name,
        category: i.category || "Mainboard",
        status: i.status || "ACTIVE",
        registrarUrl: i.registrarUrl,
        allotmentFinalized: Boolean(i.allotmentFinalized),
        allotmentFinalizedAt: (i as any).allotmentFinalizedAt || null,
        allotmentFinalizedBy: (i as any).allotmentFinalizedBy || null,
        metrics: i.metrics || {},
      }));
    }
    return [];
  }, [nexoIpos]);

  const selectedIpoId = useMemo(() => {
    if (storedIpoId && ipos.some((i) => i.id === storedIpoId)) {
      return storedIpoId;
    }
    return ipos[0]?.id || "";
  }, [storedIpoId, ipos]);

  const selectedIpo = useMemo(() => {
    return ipos.find((i) => i.id === selectedIpoId) || ipos[0] || null;
  }, [ipos, selectedIpoId]);

  const [fetchedApps, setFetchedApps] = useState<ApplicationItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("ADMIN");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ALLOTTED" | "NOT_ALLOTTED">("ALL");
  const [sortBy, setSortBy] = useState<"default" | "name_asc" | "name_desc" | "lots" | "app_no" | "status">("default");

  // Single Source of Selection Truth: IDs of applications/lots checked for allotment
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // Toast & Modals
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState<boolean>(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [editingRegistrarUrl, setEditingRegistrarUrl] = useState<string>("");

  // Header checkbox ref for indeterminate state
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Effective applications prioritizing fresh API fetch with instant in-memory fallback
  const effectiveApplications = useMemo(() => {
    if (fetchedApps.length > 0) {
      return fetchedApps;
    }
    const currentIpo = nexoIpos.find((i) => i.id === selectedIpoId) || nexoIpos[0];
    if (currentIpo && Array.isArray(currentIpo.applications) && currentIpo.applications.length > 0) {
      return mapToApplicationItems(currentIpo.applications);
    }
    return [];
  }, [fetchedApps, nexoIpos, selectedIpoId]);

  // Sync selectedAppIds from applications list
  const syncSelectedAppIds = useCallback((apps: ApplicationItem[]) => {
    const initialSelected: string[] = [];
    apps.forEach((a) => {
      const lotCount = Math.max(1, a.lotsApplied || 1);
      if (Array.isArray(a.allottedIndices) && a.allottedIndices.length > 0) {
        a.allottedIndices.forEach((idx: number) => {
          initialSelected.push(lotCount > 1 ? `${a.id}_lot_${idx}` : a.id);
        });
      } else if (a.allotmentStatus === "ALLOTTED") {
        for (let i = 0; i < lotCount; i++) {
          initialSelected.push(lotCount > 1 ? `${a.id}_lot_${i}` : a.id);
        }
      }
    });
    const unique = Array.from(new Set(initialSelected));
    setSelectedAppIds((prev) => {
      if (prev.length === unique.length && prev.every((id, idx) => id === unique[idx])) {
        return prev;
      }
      return unique;
    });
  }, []);

  // Initial sync of selection IDs when effective applications change
  useEffect(() => {
    if (effectiveApplications.length > 0) {
      syncSelectedAppIds(effectiveApplications);
    }
  }, [effectiveApplications, syncSelectedAppIds]);

  // Dedicated background synchronization with race-condition cancellation
  useEffect(() => {
    if (!selectedIpoId) return;

    let active = true;

    const fetchApps = async () => {
      try {
        let loadedApps: ApplicationItem[] = [];

        try {
          const res = await fetch(`/api/admin/allotment?ipoId=${encodeURIComponent(selectedIpoId)}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.success) {
              if (json.currentUserRole) setCurrentUserRole(json.currentUserRole);
              if (Array.isArray(json.applications) && json.applications.length > 0) {
                loadedApps = json.applications;
              }
            }
          }
        } catch {}

        if (loadedApps.length === 0) {
          try {
            const fallbackRes = await fetch(`/api/applications?ipoId=${encodeURIComponent(selectedIpoId)}`);
            if (fallbackRes.ok) {
              const fallbackJson = await fallbackRes.json();
              if (fallbackJson?.success && Array.isArray(fallbackJson.applications) && fallbackJson.applications.length > 0) {
                loadedApps = mapToApplicationItems(fallbackJson.applications);
              }
            }
          } catch {}
        }

        if (active && loadedApps.length > 0) {
          setFetchedApps(loadedApps);
          syncSelectedAppIds(loadedApps);
        }
      } catch {}
    };

    fetchApps();

    return () => {
      active = false;
    };
  }, [selectedIpoId, syncSelectedAppIds]);

  const handleSelectIpo = useCallback((newId: string) => {
    if (!newId || newId === selectedIpoId) return;
    setStoredIpoId(newId);
    setFetchedApps([]);
    try {
      localStorage.setItem("nexo_admin_selected_ipo_id", newId);
    } catch {}
  }, [selectedIpoId]);


  // Expand applications so every lot has its own row matching user-side sequence
  const expandedApplications = useMemo(() => {
    const result: ApplicationItem[] = [];
    effectiveApplications.forEach((app) => {
      const lotCount = Math.max(1, app.lotsApplied || 1);
      const pansList = app.panNumbers && app.panNumbers.length > 0 ? app.panNumbers : [app.pan];
      const displayName = formatApplicantNames(app.applicantName || app);

      for (let i = 0; i < lotCount; i++) {
        const panForLot = pansList[i] || pansList[0] || app.pan || `ABCDE${2741 + i}D`;
        const lotId = lotCount > 1 ? `${app.id}_lot_${i}` : app.id;
        const isSelected = selectedAppIds.includes(lotId);

        let effectiveStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED" = "PENDING";
        if (isSelected) {
          effectiveStatus = "ALLOTTED";
        } else if (selectedIpo?.allotmentFinalized || selectedAppIds.length > 0) {
          effectiveStatus = "NOT_ALLOTTED";
        } else {
          effectiveStatus = app.allotmentStatus;
        }

        result.push({
          ...app,
          id: lotId,
          applicantName: displayName,
          pan: panForLot,
          lotsApplied: 1,
          allotmentStatus: effectiveStatus,
        });
      }
    });
    return result;
  }, [effectiveApplications, selectedAppIds, selectedIpo]);


  // Real-time filtering & sorting
  const filteredApplications = useMemo(() => {
    let list = [...expandedApplications];

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
      if (sortBy === "name_asc") return a.applicantName.localeCompare(b.applicantName);
      if (sortBy === "name_desc") return b.applicantName.localeCompare(a.applicantName);
      if (sortBy === "lots") return b.lotsApplied - a.lotsApplied;
      if (sortBy === "app_no") return a.applicationNumber.localeCompare(b.applicationNumber);
      if (sortBy === "status") return a.allotmentStatus.localeCompare(b.allotmentStatus);

      // Default: Sort by createdAt ASC (Oldest first) for exact sequence alignment
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    return list;
  }, [expandedApplications, searchQuery, statusFilter, sortBy]);

  // Summary statistics calculated from authoritative dataset for the selected IPO
  const summaryMetrics = useMemo(() => {
    const totalApps = expandedApplications.length;
    const pendingApps = expandedApplications.filter((a) => a.allotmentStatus === "PENDING").length;
    const allottedApps = expandedApplications.filter((a) => a.allotmentStatus === "ALLOTTED").length;
    const notAllottedApps = expandedApplications.filter((a) => a.allotmentStatus === "NOT_ALLOTTED").length;
    const totalLots = expandedApplications.reduce((sum, a) => sum + (a.lotsApplied || 1), 0);

    return {
      totalApplications: totalApps,
      pendingApplications: pendingApps,
      allottedApplications: allottedApps,
      notAllottedApplications: notAllottedApps,
      totalLotsApplied: totalLots,
    };
  }, [expandedApplications]);

  // Filter-aware selection calculation
  const visibleSelectedCount = useMemo(() => {
    return filteredApplications.filter((app) => selectedAppIds.includes(app.id)).length;
  }, [filteredApplications, selectedAppIds]);

  const isAllVisibleSelected =
    filteredApplications.length > 0 && visibleSelectedCount === filteredApplications.length;

  const isIndeterminate =
    visibleSelectedCount > 0 && visibleSelectedCount < filteredApplications.length;

  // Set DOM indeterminate state on header checkbox
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectAllVisible = (e: React.ChangeEvent<HTMLInputElement>) => {
    const visibleIds = filteredApplications.map((a) => a.id);
    if (e.target.checked) {
      const union = Array.from(new Set([...selectedAppIds, ...visibleIds]));
      setSelectedAppIds(union);
    } else {
      const visibleSet = new Set(visibleIds);
      setSelectedAppIds(selectedAppIds.filter((id) => !visibleSet.has(id)));
    }
  };

  const handleToggleRowSelection = (id: string) => {
    if (isMemberRole) return;
    if (selectedAppIds.includes(id)) {
      setSelectedAppIds(selectedAppIds.filter((item) => item !== id));
    } else {
      setSelectedAppIds([...selectedAppIds, id]);
    }
  };

  // Open Update Allotment Confirmation Modal
  const handleOpenFinalizeModal = () => {
    if (selectedAppIds.length === 0) {
      showToast("Select at least one application to continue.", "error");
      return;
    }
    setIsFinalizeModalOpen(true);
  };

  // Confirm and save allotment to database
  const handleConfirmFinalize = async () => {
    if (!selectedIpoId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/allotment/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipoId: selectedIpoId,
          allottedApplicationIds: selectedAppIds,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsFinalizeModalOpen(false);
        showToast(
          data.message || `Allotment updated successfully! ${selectedAppIds.length} allotted.`
        );
        AdminDataCache.invalidate("admin_allotment_bootstrap");
        AdminDataCache.invalidate(`admin_allotment_apps_${selectedIpoId}`);
        AdminDataCache.invalidate("admin_ipos");
        AdminDataCache.invalidate("ipos_apps");
        if (refreshIpos) refreshIpos();
      } else {
        showToast(data.error || "Failed to update allotment in database.", "error");
      }
    } catch {
      showToast("Unable to update allotment. No changes were applied.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reopen Allotment Submit
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
        AdminDataCache.invalidate("admin_allotment_bootstrap");
        AdminDataCache.invalidate(`admin_allotment_apps_${selectedIpoId}`);
        AdminDataCache.invalidate("admin_ipos");
        AdminDataCache.invalidate("ipos_apps");
        if (refreshIpos) refreshIpos();
      } else {
        showToast(data.error || "Failed to reopen allotment.", "error");
      }
    } catch {
      showToast("Network error while reopening allotment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete IPO Submit
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);

  const handleConfirmComplete = async () => {
    if (!selectedIpoId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/ipos/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipoId: selectedIpoId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsCompleteModalOpen(false);
        showToast(data.message || "IPO marked as Completed and moved to History.");
        if (refreshIpos) refreshIpos();
      } else {
        showToast(data.error || "Failed to mark IPO as completed.", "error");
      }
    } catch {
      showToast("Network error while completing IPO.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Check Allotment Link Handler
  const [isSavingRegistrarUrl, setIsSavingRegistrarUrl] = useState<boolean>(false);

  const handleSaveRegistrarUrl = async () => {
    if (!selectedIpoId) return;
    setIsSavingRegistrarUrl(true);
    try {
      const res = await fetch("/api/ipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateRegistrarUrl",
          ipoId: selectedIpoId,
          registrarUrl: editingRegistrarUrl.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("✓ Check Allotment link updated successfully!");
        setIsUrlModalOpen(false);
        if (refreshIpos) refreshIpos();
      } else {
        showToast(data.error || "Failed to update link.", "error");
      }
    } catch {
      showToast("Network error while saving allotment link.", "error");
    } finally {
      setIsSavingRegistrarUrl(false);
    }
  };

  const isMemberRole = currentUserRole === "MEMBER";

  return (
    <div className="space-y-6 font-sans select-none pb-20">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all border animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === "error"
              ? "bg-rose-950/90 border-rose-800 text-rose-200"
              : toast.type === "info"
              ? "bg-blue-950/90 border-blue-800 text-blue-200"
              : "bg-emerald-950/90 border-emerald-800 text-emerald-200"
          }`}
        >
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
            <CustomSelect
              value={selectedIpoId}
              onChange={(val) => handleSelectIpo(val)}
              disabled={isSubmitting}
              placeholder="Select IPO"
              options={ipos.map((ipo) => ({
                value: ipo.id,
                label: ipo.name,
                badge: ipo.allotmentFinalized ? "Finalized ✓" : undefined,
              }))}
            />
          </div>
        </div>
      </div>

      {/* NO IPO SELECTED STATE */}
      {!selectedIpoId && (
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
          {/* FINALIZATION BANNER */}
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
                      : "Recently"}{" "}
                    by <strong>{selectedIpo.allotmentFinalizedBy || "Admin"}</strong>
                  </p>
                </div>
              </div>

              {!isMemberRole && (
                <div className="flex items-center gap-2">
                  {selectedIpo.status !== "COMPLETED" && (
                    <button
                      onClick={() => setIsCompleteModalOpen(true)}
                      disabled={isSubmitting}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                    >
                      <CheckCircle size={16} weight="bold" />
                      <span>Mark as Completed</span>
                    </button>
                  )}
                  {selectedIpo.status === "COMPLETED" && (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-[#32C98B] font-extrabold text-xs flex items-center gap-1.5">
                      <Check size={14} weight="bold" /> Completed &amp; Stored in History
                    </span>
                  )}
                  <button
                    onClick={() => setIsReopenModalOpen(true)}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#1A1D24] dark:hover:bg-[#252931] border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <LockOpen size={15} />
                    <span>Reopen / Edit Allotment</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMPACT IPO SUMMARY COUNTER CARDS */}
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#252931]/60 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-[#F5F7FA]">
                  {selectedIpo?.name || "Selected IPO Summary"}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A1D24] text-slate-600 dark:text-[#AEB5C0] font-bold border border-slate-200 dark:border-[#252931]">
                  {selectedIpo?.category || "Mainboard"}
                </span>
              </div>

              {/* Allotment Link Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={selectedIpo?.registrarUrl || "https://ipostatus.kfintech.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-700 text-white dark:text-[#101114] font-extrabold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <span>Check Allotment</span>
                  <ArrowSquareOut size={14} weight="bold" />
                </a>

                {!isMemberRole && (
                  <button
                    onClick={() => {
                      setEditingRegistrarUrl(selectedIpo?.registrarUrl || "");
                      setIsUrlModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-[#1A1D24] hover:bg-slate-200 dark:hover:bg-[#252931] border border-slate-200 dark:border-[#252931] text-slate-600 dark:text-[#AEB5C0] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    title="Edit Allotment Check Link"
                  >
                    <PencilSimple size={15} />
                    <span className="hidden sm:inline">Edit Link</span>
                  </button>
                )}
              </div>
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
                className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-xs text-slate-900 dark:text-[#F5F7FA] focus:outline-none focus:border-blue-500 transition-all"
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
                  <option value="default">Default (Application Order)</option>
                  <option value="name_asc">Applicant Name A → Z</option>
                  <option value="name_desc">Applicant Name Z → A</option>
                  <option value="lots">Lots Applied</option>
                  <option value="app_no">Application No.</option>
                  <option value="status">Status</option>
                </select>
              </div>

              {/* Primary Update Allotment Action Button */}
              <button
                onClick={handleOpenFinalizeModal}
                disabled={isMemberRole || isSubmitting || selectedAppIds.length === 0}
                title={
                  selectedAppIds.length === 0
                    ? "Select at least one application to continue"
                    : "Update Allotment for this IPO"
                }
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-[#6B93FF] dark:hover:bg-[#527DFF] text-white dark:text-[#101114] font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <CheckCircle size={17} weight="bold" />
                <span>Update Allotment</span>
              </button>
            </div>
          </div>

          {/* BULK ACTION BAR */}
          {selectedAppIds.length > 0 && !isMemberRole && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 dark:bg-[#142340] dark:border-[#2C4880] rounded-xl flex items-center justify-between text-xs font-semibold select-none animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-[#6B93FF]">
                <Info size={16} />
                <span>
                  <strong>{selectedAppIds.length}</strong> application(s) selected for allotment
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedAppIds([])}
                  className="px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* APPLICATIONS TABLE */}
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl overflow-hidden shadow-2xs">
            {filteredApplications.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <WarningCircle size={36} className="mx-auto text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {searchQuery
                    ? "No applications match your search."
                    : "No applications found for this IPO."}
                </h3>
                <p className="text-xs text-slate-400">
                  {searchQuery
                    ? "Try adjusting your search criteria or clearing status filters."
                    : "No user applications have been submitted for this IPO yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-[#14161A]/80 border-b border-slate-200 dark:border-[#252931] text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
                      <th className="py-3 px-3 w-8 text-center">
                        <input
                          ref={headerCheckboxRef}
                          type="checkbox"
                          checked={isAllVisibleSelected}
                          onChange={handleSelectAllVisible}
                          className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                          title="Select All Visible"
                        />
                      </th>
                      <th className="py-3 px-2 w-10 text-center">#</th>
                      <th className="py-3 px-4">Applicant</th>
                      <th className="py-3 px-4">PAN</th>
                      <th className="py-3 px-4 text-center">Lots Applied</th>
                      <th className="py-3 px-4 text-center">Selection</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#252931]/60">
                    {filteredApplications.map((app, index) => {
                      const isSelected = selectedAppIds.includes(app.id);
                      const srNo = String(index + 1).padStart(2, "0");

                      return (
                        <tr
                          key={app.id}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-[#16181F] ${
                            isSelected ? "bg-blue-50/40 dark:bg-[#142340]/40" : ""
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isMemberRole}
                              onChange={() => handleToggleRowSelection(app.id)}
                              className="rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                          </td>

                          {/* Sr No */}
                          <td className="py-3 px-2 text-center font-mono font-extrabold text-slate-400 dark:text-[#858D99] text-[11px]">
                            {srNo}
                          </td>

                          {/* Applicant Name & Username */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-[#6B93FF] font-extrabold text-[11px] flex items-center justify-center uppercase shrink-0 border border-blue-200 dark:border-blue-800 overflow-hidden">
                                {app.memberAvatar ? (
                                  <img
                                    src={app.memberAvatar}
                                    alt={app.applicantName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  (app.applicantName.replace(/^[^a-zA-Z0-9]+/, "").charAt(0) || "A").toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-800 dark:text-[#F5F7FA] truncate">
                                  {formatApplicantNames(app.applicantName)}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-[#858D99] font-mono">
                                  @{app.username.replace(/^@+/, "")}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* PAN */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-[#AEB5C0]">
                            <CopyButton
                              text={app.pan}
                              label={app.pan}
                              className="font-mono text-xs font-bold"
                            />
                          </td>

                          {/* Lots Applied */}
                          <td className="py-3 px-4 text-center font-black text-slate-800 dark:text-[#F5F7FA]">
                            {app.lotsApplied}
                          </td>

                          {/* SELECTION COLUMN */}
                          <td className="py-3 px-4 text-center">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-[#32C98B]">
                                <Check size={12} weight="bold" />
                                Selected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-[#1A1D24] border border-slate-200 dark:border-[#252931] text-slate-400">
                                Not Selected
                              </span>
                            )}
                          </td>

                          {/* PERSISTED / DRAFT STATUS BADGE */}
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
            <div className="flex items-center gap-3 text-blue-600 dark:text-[#6B93FF]">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                <CheckCircle size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Update Allotment?
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#858D99]">
                  {selectedIpo?.name}
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-[#14161A] p-4 rounded-xl border border-slate-200 dark:border-[#252931] text-xs text-slate-700 dark:text-[#AEB5C0]">
              <p className="font-semibold text-slate-900 dark:text-slate-200">
                You are about to mark:
              </p>
              <div className="space-y-2 pt-1 font-medium">
                <p className="flex items-center gap-2 text-emerald-600 dark:text-[#32C98B]">
                  <span className="font-bold">•</span>
                  <span>
                    <strong>{selectedAppIds.length}</strong> application(s) as <strong>Allotted</strong>
                  </span>
                </p>
                <p className="flex items-center gap-2 text-rose-600 dark:text-[#FF6B6B]">
                  <span className="font-bold">•</span>
                  <span>
                    <strong>{expandedApplications.length - selectedAppIds.length}</strong> remaining application(s) as <strong>Not Allotted</strong>
                  </span>
                </p>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-[#252931]">
                This action will update the allotment status for this IPO and persist changes to the database.
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
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-[#6B93FF] dark:hover:bg-[#527DFF] text-white dark:text-[#101114] text-xs font-extrabold shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    <CheckCircle size={16} weight="bold" />
                    <span>Confirm Allotment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. REOPEN CONFIRMATION MODAL ── */}
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
              This will allow the allotment declarations for <strong>{selectedIpo?.name}</strong> to be edited and re-saved.
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
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Reopening..." : "Reopen Allotment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. COMPLETE IPO CONFIRMATION MODAL ── */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-emerald-500">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle size={22} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Mark IPO as Completed?
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#858D99]">
                  {selectedIpo?.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#AEB5C0] leading-relaxed">
              This will transition <strong>{selectedIpo?.name}</strong> to <strong>COMPLETED</strong> status and store it in the <strong>History</strong> section.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1A1D24] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComplete}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Completing..." : "Confirm & Move to History"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. EDIT ALLOTMENT LINK MODAL ── */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#252931]/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                  <Link size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Edit Allotment Check Link
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedIpo?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Registrar Allotment Check URL
              </label>
              <input
                type="url"
                placeholder="https://ipostatus.kfintech.com or https://linkintime.co.in"
                value={editingRegistrarUrl}
                onChange={(e) => setEditingRegistrarUrl(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
              <p className="text-[11px] text-slate-400">
                Users clicking the "Check Allotment" button on this IPO will be directed to this URL.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsUrlModalOpen(false)}
                disabled={isSavingRegistrarUrl}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1A1D24] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRegistrarUrl}
                disabled={isSavingRegistrarUrl}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isSavingRegistrarUrl ? "Saving Link..." : "Save Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
