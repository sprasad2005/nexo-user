"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { Application, AllotmentStatus } from "@/types/nexo";
import { formatINR, formatApplicantNames } from "@/lib/mockData";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  Files,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  XCircle,
  PencilSimple,
  Trash,
  X,
  FloppyDisk,
  ShieldCheck,
  Eye,
  EyeSlash,
  Warning,
  ArrowSquareOut,
} from "@phosphor-icons/react";

export function AdminApplicationsView() {
  const { ipos, activeApplicationIpo, updateApplication, deleteApplication, updateRegistrarUrl } = useNexo();

  // Filter & Search State
  const [selectedIpoId, setSelectedIpoId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nexo_admin_selected_ipo_id");
      if (stored) return stored;
    }
    return "";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AllotmentStatus>("ALL");

  // Registrar URL Modal State
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [customRegistrarUrl, setCustomRegistrarUrl] = useState("");

  // PAN Reveal State per Application
  const [revealedPans, setRevealedPans] = useState<Record<string, boolean>>({});

  // Toast / Feedback message
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Edit Modal State
  const [editingApp, setEditingApp] = useState<{
    ipoId: string;
    id: string;
    applicationNumber: string;
    applicantName: string;
    lotCount: number;
    panMasked: string;
    panNumbers: string[];
    totalContribution: number;
    allotmentStatus: AllotmentStatus;
  } | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  // Delete Modal State
  const [deletingApp, setDeletingApp] = useState<{
    ipoId: string;
    id: string;
    applicationNumber: string;
    applicantName: string;
    ipoName: string;
  } | null>(null);

  // Default to active IPO or first IPO with applications if not set
  useEffect(() => {
    if (!selectedIpoId && ipos.length > 0) {
      const active = activeApplicationIpo || ipos.find((i) => i.applications && i.applications.length > 0) || ipos[0];
      if (active) {
        setSelectedIpoId(active.id);
        try {
          localStorage.setItem("nexo_admin_selected_ipo_id", active.id);
        } catch {}
      }
    }
  }, [ipos, activeApplicationIpo, selectedIpoId]);

  const [fetchedApps, setFetchedApps] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedIpoId = localStorage.getItem("nexo_admin_selected_ipo_id");
        if (storedIpoId) {
          const cached = localStorage.getItem(`nexo_admin_apps_${storedIpoId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
      } catch {}
    }
    return [];
  });

  // Fetch complete merged applications for selected IPO from API
  useEffect(() => {
    if (selectedIpoId) {
      try {
        localStorage.setItem("nexo_admin_selected_ipo_id", selectedIpoId);
        const cached = localStorage.getItem(`nexo_admin_apps_${selectedIpoId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFetchedApps(parsed);
          }
        }
      } catch {}

      let active = true;
      fetch(`/api/admin/allotment?ipoId=${encodeURIComponent(selectedIpoId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (active && data.success && Array.isArray(data.applications)) {
            setFetchedApps(data.applications);
            try {
              localStorage.setItem(`nexo_admin_apps_${selectedIpoId}`, JSON.stringify(data.applications));
            } catch {}
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [selectedIpoId]);

  // Selected Target IPO
  const selectedIpo = useMemo(() => {
    return ipos.find((i) => i.id === selectedIpoId) || ipos[0];
  }, [ipos, selectedIpoId]);

  // Expanded applications list where each PAN Card / lot has its own row and unique serial number
  const expandedApplications = useMemo(() => {
    let rawList: any[] = [];
    if (fetchedApps.length > 0) {
      rawList = [...fetchedApps];
    } else if (selectedIpo?.applications) {
      rawList = [...selectedIpo.applications];
    }

    // Sort by createdAt ASC (Oldest first) for consistent sequence numbering
    rawList.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    const result: any[] = [];
    rawList.forEach((app) => {
      const lotCount = Math.max(1, app.lotsApplied || app.lotCount || (Array.isArray(app.panNumbers) ? app.panNumbers.length : 1) || 1);
      const pansList = Array.isArray(app.panNumbers) && app.panNumbers.length > 0
        ? app.panNumbers
        : [app.pan || app.panMasked || "ABCDE2741D"];
      const displayName = formatApplicantNames(app);

      for (let i = 0; i < lotCount; i++) {
        const panForLot = pansList[i] || pansList[0] || `ABCDE${2741 + i}D`;
        const lotId = lotCount > 1 ? `${app.id}_lot_${i}` : app.id;

        result.push({
          ...app,
          id: lotId,
          rawApp: app,
          applicantName: displayName,
          pan: panForLot,
          panNumbers: [panForLot],
          lotCount: 1,
        });
      }
    });

    return result;
  }, [fetchedApps, selectedIpo]);

  // Filtered Applications by Search & Status
  const filteredApplications = useMemo(() => {
    let list = [...expandedApplications];

    if (statusFilter !== "ALL") {
      list = list.filter((app) => (app.allotmentStatus || app.status) === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((app) => {
        const nameMatch = app.applicantName?.toLowerCase().includes(q);
        const appNoMatch = app.applicationNumber?.toLowerCase().includes(q);
        const panMaskedMatch = app.pan?.toLowerCase().includes(q) || app.panMasked?.toLowerCase().includes(q);
        const panNumbersMatch = app.panNumbers?.some((p: string) => p.toLowerCase().includes(q));
        const participantMatch = app.participants?.some((p: any) =>
          p.memberName?.toLowerCase().includes(q) || p.panMasked?.toLowerCase().includes(q)
        );
        return nameMatch || appNoMatch || panMaskedMatch || panNumbersMatch || participantMatch;
      });
    }

    return list;
  }, [expandedApplications, statusFilter, searchQuery]);

  // Metrics Summary
  const metrics = useMemo(() => {
    const total = expandedApplications.length;
    const awaiting = expandedApplications.filter((a) => (a.allotmentStatus || a.status) === "AWAITING" || (a.allotmentStatus || a.status) === "PENDING").length;
    const allotted = expandedApplications.filter((a) => (a.allotmentStatus || a.status) === "ALLOTTED").length;
    const notAllotted = expandedApplications.filter((a) => (a.allotmentStatus || a.status) === "NOT_ALLOTTED").length;
    const totalCapital = expandedApplications.reduce((sum, a) => sum + (a.totalContribution || 0), 0);
    const totalLots = expandedApplications.reduce((sum, a) => sum + (a.lotCount || a.lotsApplied || 1), 0);

    return { total, awaiting, allotted, notAllotted, totalCapital, totalLots };
  }, [expandedApplications]);

  const togglePanReveal = (appId: string) => {
    setRevealedPans((prev) => ({ ...prev, [appId]: !prev[appId] }));
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Open Edit Application Modal
  const handleOpenEdit = (app: Application) => {
    setEditErrorMsg(null);
    const existingPans = app.panNumbers && app.panNumbers.length > 0
      ? app.panNumbers
      : [app.panMasked || "ABCDE2741D"];

    setEditingApp({
      ipoId: selectedIpo?.id || app.ipoId || "",
      id: app.id,
      applicationNumber: app.applicationNumber || app.id,
      applicantName: app.applicantName || "Member",
      lotCount: app.lotCount || 1,
      panMasked: app.panMasked || existingPans[0],
      panNumbers: [...existingPans],
      totalContribution: app.totalContribution || 0,
      allotmentStatus: app.allotmentStatus || (app.status as AllotmentStatus) || "AWAITING",
    });
  };

  // Handle Save Edit Application
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setEditErrorMsg(null);

    const minInvest = selectedIpo?.metrics?.minInvestment || 14964;
    const lotCount = Math.max(1, editingApp.lotCount);
    const cleanPans = editingApp.panNumbers.map((p, idx) =>
      p && p.trim().length === 10 ? p.trim().toUpperCase() : `ABCDE274${(idx % 9) + 1}D`
    );

    // 1. Intra-form duplicate check
    const seenPans = new Set<string>();
    for (const pan of cleanPans) {
      if (seenPans.has(pan)) {
        setEditErrorMsg(`Duplicate PAN card number "${pan}" found in entries. Each PAN card entry must be unique.`);
        return;
      }
      seenPans.add(pan);
    }

    // 2. Check against other applications for this IPO
    const otherAppsPans = new Set<string>();
    (selectedIpo?.applications || [])
      .filter((a) => a.id !== editingApp.id)
      .forEach((a) => {
        if (a.panMasked) otherAppsPans.add(a.panMasked.trim().toUpperCase());
        if (Array.isArray(a.panNumbers)) {
          a.panNumbers.forEach((p) => p && otherAppsPans.add(p.trim().toUpperCase()));
        }
      });

    for (const pan of cleanPans) {
      if (otherAppsPans.has(pan)) {
        setEditErrorMsg(`PAN card number "${pan}" has already been used in another application for ${selectedIpo?.name || "this IPO"}.`);
        return;
      }
    }

    const newContribution = editingApp.totalContribution > 0
      ? editingApp.totalContribution
      : minInvest * lotCount;

    updateApplication(editingApp.ipoId, editingApp.id, {
      applicantName: editingApp.applicantName.trim() || "Member",
      lotCount,
      panMasked: cleanPans[0],
      panNumbers: cleanPans,
      totalContribution: newContribution,
      allotmentStatus: editingApp.allotmentStatus,
      status: editingApp.allotmentStatus,
    });

    showFeedback(`Application ${editingApp.applicationNumber} updated successfully.`);
    setEditingApp(null);
  };

  // Open Delete Application Modal
  const handleOpenDelete = (app: Application) => {
    setDeletingApp({
      ipoId: selectedIpo?.id || app.ipoId || "",
      id: app.id,
      applicationNumber: app.applicationNumber || app.id,
      applicantName: app.applicantName || "Member",
      ipoName: selectedIpo?.name || "IPO",
    });
  };

  // Confirm Delete Application
  const handleConfirmDelete = () => {
    if (!deletingApp) return;

    deleteApplication(deletingApp.ipoId, deletingApp.id);
    showFeedback(`Application ${deletingApp.applicationNumber} deleted successfully.`);
    setDeletingApp(null);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ALLOTTED":
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle size={13} weight="fill" /> Allotted
          </span>
        );
      case "NOT_ALLOTTED":
      case "REFUNDED":
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle size={13} weight="fill" /> Not Allotted
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock size={13} weight="bold" /> Awaiting
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Top Banner / Feedback */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-500 hover:opacity-75 cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#252931] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">
              Application Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-[#17233D] text-blue-600 dark:text-[#6B93FF] border border-blue-200 dark:border-[#6B93FF]/30 font-mono">
              Admin Console
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#858D99] mt-1 font-medium">
            View, filter, update, or delete member IPO applications for all current opportunities.
          </p>
        </div>

        {/* IPO Selector & Allotment Link Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-[#858D99] whitespace-nowrap">
              Select IPO:
            </label>
            <CustomSelect
              value={selectedIpoId}
              onChange={(val) => setSelectedIpoId(val)}
              options={ipos.map((ipo) => ({
                value: ipo.id,
                label: ipo.name,
                badge: `${ipo.applications?.length || 0} apps`,
              }))}
              className="min-w-[200px]"
            />
          </div>

          {selectedIpo && (
            <div className="flex items-center gap-2">
              <a
                href={selectedIpo.registrarUrl || "https://ipostatus.kfintech.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-700 text-white dark:text-[#101114] font-extrabold text-xs transition-all shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <span>Check Allotment</span>
                <ArrowSquareOut size={14} weight="bold" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setCustomRegistrarUrl(selectedIpo.registrarUrl || "");
                  setIsUrlModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1D2026] hover:bg-slate-200 dark:hover:bg-[#252931] border border-slate-200 dark:border-[#252931] text-slate-700 dark:text-[#AEB5C0] hover:text-blue-600 dark:hover:text-[#6B93FF] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Configure / Add Check Allotment Website URL"
              >
                <PencilSimple size={14} weight="bold" />
                <span className="hidden sm:inline">Set URL</span>
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">
            Total Applications
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-[#F5F7FA] font-mono mt-0.5 block">
            {metrics.total}
          </span>
        </div>

        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
            Awaiting Allotment
          </span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
            {metrics.awaiting}
          </span>
        </div>

        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">
            Allotted Applications
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
            {metrics.allotted}
          </span>
        </div>

        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">
            Total Capital Pooled
          </span>
          <span className="text-xl font-black text-blue-600 dark:text-[#6B93FF] font-mono mt-0.5 block">
            {formatINR(metrics.totalCapital)}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-2xs">
        {/* Search Box */}
        <div className="relative w-full">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Applicant Name, App #, or PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 dark:text-[#F5F7FA] uppercase tracking-wider flex items-center gap-2">
            <Files size={16} className="text-blue-500" />
            Applications for {selectedIpo?.name} ({filteredApplications.length})
          </h3>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-[#858D99] space-y-2">
            <Files size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-semibold">No applications found matching the criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#252931] bg-slate-50/50 dark:bg-[#14161A]/50 text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Applicant / Contributors</th>
                  <th className="py-3.5 px-4">PAN Card</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#252931]/60 font-medium">
                {filteredApplications.map((app, index) => {
                  const srNo = String(index + 1).padStart(2, "0");
                  const panText = app.pan || (app.panNumbers && app.panNumbers[0]) || app.panMasked || "ABCDE2741D";

                  const appDateRaw = app.createdAt || new Date().toISOString();
                  const appDateObj = new Date(appDateRaw);
                  const dateStr = !isNaN(appDateObj.getTime())
                    ? appDateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "14 Aug 2026";
                  const timeStr = !isNaN(appDateObj.getTime())
                    ? appDateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                    : "10:19 PM";

                  const usernameDisplay = formatApplicantNames(app.applicantName || app);

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-[#16181E] transition-colors">
                      {/* 1. SrNo (#) */}
                      <td className="py-4 px-4 text-center font-mono font-extrabold text-slate-400 dark:text-[#858D99] text-xs">
                        {srNo}
                      </td>

                      {/* 2. Applicant & Date/Time (stacked below username) */}
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-[#F5F7FA] block text-sm tracking-tight">
                            {usernameDisplay}
                          </span>
                          <span className="text-xs font-medium text-slate-400 dark:text-[#858D99] block mt-0.5">
                            {dateStr}, {timeStr}
                          </span>
                        </div>
                      </td>

                      {/* 3. PAN Card */}
                      <td className="py-4 px-4">
                        <CopyButton
                          text={panText}
                          label={panText}
                          className="font-mono text-xs font-bold"
                        />
                      </td>

                      {/* 4. Actions (Edit & Delete options for Admin) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(app.rawApp || app)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-[#6B93FF] hover:bg-slate-100 dark:hover:bg-[#1F232B] transition-colors cursor-pointer"
                            title="Edit Application"
                          >
                            <PencilSimple size={17} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(app.rawApp || app)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Application"
                          >
                            <Trash size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT APPLICATION MODAL */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#101114] rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-[#252931] shadow-2xl space-y-4 animate-modal-pop-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-[#F5F7FA]">
                  Edit Application ({editingApp.applicationNumber})
                </h3>
              </div>
              <button
                onClick={() => setEditingApp(null)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1D2026] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {editErrorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
                  {editErrorMsg}
                </div>
              )}

              {/* Applicant Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Applicant Name
                </label>
                <input
                  type="text"
                  required
                  value={editingApp.applicantName}
                  onChange={(e) => setEditingApp({ ...editingApp, applicantName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-[#F5F7FA] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Number of Lots */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Number of Lots / PAN Cards
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={editingApp.lotCount}
                  onChange={(e) => {
                    const count = Math.max(1, parseInt(e.target.value, 10) || 1);
                    const updatedPans = [...editingApp.panNumbers];
                    while (updatedPans.length < count) {
                      updatedPans.push(`ABCDE274${(updatedPans.length % 9) + 1}D`);
                    }
                    setEditingApp({
                      ...editingApp,
                      lotCount: count,
                      panNumbers: updatedPans.slice(0, count),
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-[#F5F7FA] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* PAN Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  PAN Card Numbers
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {editingApp.panNumbers.map((pan, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 w-14 shrink-0">
                        PAN #{idx + 1}
                      </span>
                      <input
                        type="text"
                        maxLength={10}
                        required
                        value={pan}
                        onChange={(e) => {
                          const updated = [...editingApp.panNumbers];
                          updated[idx] = e.target.value.toUpperCase().slice(0, 10);
                          setEditingApp({ ...editingApp, panNumbers: updated });
                        }}
                        className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-[#F5F7FA] uppercase focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Contribution */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total Contribution Amount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editingApp.totalContribution}
                  onChange={(e) => setEditingApp({ ...editingApp, totalContribution: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-[#F5F7FA] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Allotment Status */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Allotment Status
                </label>
                <select
                  value={editingApp.allotmentStatus}
                  onChange={(e) => setEditingApp({ ...editingApp, allotmentStatus: e.target.value as AllotmentStatus })}
                  className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-[#F5F7FA] focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="AWAITING">AWAITING (Pending Allotment)</option>
                  <option value="ALLOTTED">ALLOTTED (Shares Received)</option>
                  <option value="NOT_ALLOTTED">NOT ALLOTTED (Refund Eligible)</option>
                  <option value="REFUNDED">REFUNDED (Money Returned)</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1D2026] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-500 dark:hover:bg-[#7BA0FF] text-white dark:text-[#101114] font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FloppyDisk size={15} weight="bold" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#101114] rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-[#252931] shadow-2xl space-y-4 animate-modal-pop-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Warning size={24} weight="bold" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-[#F5F7FA]">
                Delete Application?
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#858D99] font-medium">
                Are you sure you want to delete application <strong className="text-slate-900 dark:text-[#F5F7FA] font-mono">{deletingApp.applicationNumber}</strong> for <strong className="text-slate-900 dark:text-[#F5F7FA]">{deletingApp.applicantName}</strong>?
              </p>
              <p className="text-[11px] text-rose-500 font-semibold pt-1">
                This will remove the application from {deletingApp.ipoName} and update total pooled capital.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingApp(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1D2026] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 cursor-pointer transition-colors"
              >
                Delete Application
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CONFIGURE REGISTRAR ALLOTMENT URL MODAL */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#14161A] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 dark:border-[#252931] shadow-2xl space-y-5 animate-modal-pop-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">
                  Set Check Allotment URL
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#858D99] mt-1 font-medium">
                  When members click <strong>Check Allotment</strong> for <span className="text-slate-900 dark:text-[#F5F7FA] font-bold">{selectedIpo?.name}</span>, they will be directed to this website URL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUrlModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1D2026] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-[#AEB5C0] uppercase tracking-wider mb-1.5">
                  Registrar Website URL
                </label>
                <input
                  type="url"
                  value={customRegistrarUrl}
                  onChange={(e) => setCustomRegistrarUrl(e.target.value)}
                  placeholder="https://ipostatus.kfintech.com"
                  className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F5F7FA] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:bg-white dark:focus:bg-[#101114] outline-none transition-all"
                />
              </div>

              {/* Presets */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-[#626A75] uppercase tracking-wider block mb-2">
                  Quick Registrar Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "KFintech", url: "https://ipostatus.kfintech.com" },
                    { name: "Link Intime", url: "https://linkintime.co.in/initial_offer/public-issues.html" },
                    { name: "Bigshare", url: "https://www.bigshareonline.com/ipo_Allotment.html" },
                    { name: "Skyline", url: "https://www.skylinerta.com/ipo.php" },
                    { name: "Purva", url: "https://www.purvashare.com/investor-service/ipo-query" },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setCustomRegistrarUrl(preset.url)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        customRegistrarUrl === preset.url
                          ? "bg-blue-600 dark:bg-[#6B93FF] text-white dark:text-[#101114] border-transparent shadow-xs"
                          : "bg-slate-50 dark:bg-[#1D2026] hover:bg-slate-100 dark:hover:bg-[#252931] border-slate-200 dark:border-[#252931] text-slate-600 dark:text-[#AEB5C0]"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#1F232B]">
              {customRegistrarUrl ? (
                <a
                  href={customRegistrarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 dark:text-[#6B93FF] hover:underline flex items-center gap-1"
                >
                  <span>Test Link</span>
                  <ArrowSquareOut size={13} weight="bold" />
                </a>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1D2026] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIpo && customRegistrarUrl.trim()) {
                      updateRegistrarUrl(selectedIpo.id, customRegistrarUrl.trim());
                      showFeedback("✓ Check Allotment link updated successfully!");
                      setIsUrlModalOpen(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-[#6B93FF] dark:hover:bg-[#5280ff] text-white dark:text-[#101114] text-xs font-extrabold shadow-md shadow-blue-600/20 cursor-pointer transition-colors"
                >
                  Save URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

