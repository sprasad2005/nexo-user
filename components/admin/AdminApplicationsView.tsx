"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { Application, AllotmentStatus } from "@/types/nexo";
import { formatINR } from "@/lib/mockData";
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
} from "@phosphor-icons/react";

export function AdminApplicationsView() {
  const { ipos, activeApplicationIpo, updateApplication, deleteApplication } = useNexo();

  // Filter & Search State
  const [selectedIpoId, setSelectedIpoId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AllotmentStatus>("ALL");

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

  // Default to active IPO or first IPO with applications
  useEffect(() => {
    if (!selectedIpoId && ipos.length > 0) {
      const active = activeApplicationIpo || ipos.find((i) => i.applications && i.applications.length > 0) || ipos[0];
      if (active) {
        setSelectedIpoId(active.id);
      }
    }
  }, [ipos, activeApplicationIpo, selectedIpoId]);

  // Selected Target IPO
  const selectedIpo = useMemo(() => {
    return ipos.find((i) => i.id === selectedIpoId) || ipos[0];
  }, [ipos, selectedIpoId]);

  // Applications list for selected IPO
  const ipoApplications = useMemo(() => {
    if (!selectedIpo) return [];
    return selectedIpo.applications || [];
  }, [selectedIpo]);

  // Filtered Applications by Search & Status
  const filteredApplications = useMemo(() => {
    let list = [...ipoApplications];

    if (statusFilter !== "ALL") {
      list = list.filter((app) => (app.allotmentStatus || app.status) === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((app) => {
        const nameMatch = app.applicantName?.toLowerCase().includes(q);
        const appNoMatch = app.applicationNumber?.toLowerCase().includes(q);
        const panMaskedMatch = app.panMasked?.toLowerCase().includes(q);
        const panNumbersMatch = app.panNumbers?.some((p) => p.toLowerCase().includes(q));
        const participantMatch = app.participants?.some((p) =>
          p.memberName?.toLowerCase().includes(q) || p.panMasked?.toLowerCase().includes(q)
        );
        return nameMatch || appNoMatch || panMaskedMatch || panNumbersMatch || participantMatch;
      });
    }

    return list;
  }, [ipoApplications, statusFilter, searchQuery]);

  // Metrics Summary
  const metrics = useMemo(() => {
    const total = ipoApplications.length;
    const awaiting = ipoApplications.filter((a) => (a.allotmentStatus || a.status) === "AWAITING").length;
    const allotted = ipoApplications.filter((a) => (a.allotmentStatus || a.status) === "ALLOTTED").length;
    const notAllotted = ipoApplications.filter((a) => (a.allotmentStatus || a.status) === "NOT_ALLOTTED").length;
    const totalCapital = ipoApplications.reduce((sum, a) => sum + (a.totalContribution || 0), 0);
    const totalLots = ipoApplications.reduce((sum, a) => sum + (a.lotCount || 1), 0);

    return { total, awaiting, allotted, notAllotted, totalCapital, totalLots };
  }, [ipoApplications]);

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

        {/* IPO Selector Dropdown */}
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
            className="min-w-[220px]"
          />
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
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Applicant Name, App #, or PAN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "AWAITING", "ALLOTTED", "NOT_ALLOTTED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? "bg-blue-600 dark:bg-[#6B93FF] text-white dark:text-[#101114] shadow-xs"
                    : "text-slate-500 dark:text-[#858D99] hover:bg-slate-100 dark:hover:bg-[#1D2026]"
                }`}
              >
                {status === "ALL" ? "All Applications" : status.replace("_", " ")}
              </button>
            ))}
          </div>
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
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#14161A]/50 text-[10px] font-black text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Structure</th>
                  <th className="py-3 px-4">Lots / PANs</th>
                  <th className="py-3 px-4">PAN Card(s)</th>
                  <th className="py-3 px-4 text-right">Contribution</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredApplications.map((app) => {
                  const isRevealed = Boolean(revealedPans[app.id]);
                  const pansList = app.panNumbers && app.panNumbers.length > 0
                    ? app.panNumbers
                    : [app.panMasked || "ABCDE2741D"];

                  const appDateRaw = app.createdAt || new Date().toISOString();
                  const appDateObj = new Date(appDateRaw);
                  const dateStr = !isNaN(appDateObj.getTime())
                    ? appDateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "14 Aug 2026";
                  const timeStr = !isNaN(appDateObj.getTime())
                    ? appDateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                    : "02:30 PM";

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-[#16181E] transition-colors">
                      {/* Applicant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/30 text-blue-600 dark:text-[#6B93FF] flex items-center justify-center font-bold text-xs shrink-0">
                            {app.applicantName?.[0]?.toUpperCase() || "M"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-[#F5F7FA] block">
                              {app.applicantName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {app.memberId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] whitespace-nowrap">
                          {dateStr}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-[#858D99]">
                          {timeStr}
                        </div>
                      </td>

                      {/* Structure */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 dark:bg-[#1A1D24] text-slate-600 dark:text-[#AEB5C0] border border-slate-200 dark:border-[#252931]">
                          {app.type === "COMBINED" ? "Multi-Friend" : "Solo"}
                        </span>
                      </td>

                      {/* Lots / PANs */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {app.lotCount || 1} Lot(s)
                      </td>

                      {/* PAN Card(s) */}
                      <td className="py-3.5 px-4">
                        <CopyButton
                          text={pansList.join(", ")}
                          label={pansList.join(", ")}
                          className="font-mono text-xs font-bold"
                        />
                      </td>

                      {/* Contribution */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600 dark:text-[#6B93FF]">
                        {formatINR(app.totalContribution)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(app)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-[#6B93FF] hover:bg-slate-100 dark:hover:bg-[#1F232B] transition-colors cursor-pointer"
                            title="Edit Application"
                          >
                            <PencilSimple size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(app)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Application"
                          >
                            <Trash size={16} />
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
    </div>
  );
}
