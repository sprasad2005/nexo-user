"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNexo } from "@/context/NexoContext";
import { AdminDataCache } from "@/lib/nexoDataCache";
import { IPOOpportunity, AllotmentStatus, IPOLifecycleStage, MemberRole } from "@/types/nexo";
import {
  Plus,
  Trash,
  CheckCircle,
  WarningCircle,
  Buildings,
  ArrowLeft,
  PencilSimple,
  Users,
  TrendUp,
  Files,
  ShieldCheck,
  Globe,
  ChartLineUp,
  X,
  UserPlus,
  UserGear,
  Clock,
  Hourglass,
  Receipt,
  CreditCard,
  Key,
  FloppyDisk,
  ArrowRight,
  CalendarBlank,
} from "@phosphor-icons/react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { GMPBadge } from "@/components/ui/Badge";
import { AddIPODrawer } from "./AddIPODrawer";
import { AdminIPOHistoryView } from "./AdminIPOHistoryView";
import { formatINR, formatApplicantNames, formatDate, formatIpoAddedDateTime } from "@/lib/mockData";

import { AdminTab } from "./AdminSidebar";

interface AdminIPOManagementProps {
  activeTab?: AdminTab;
  onSelectTab?: (tab: AdminTab) => void;
  isDrawerOpen?: boolean;
  setIsDrawerOpen?: (open: boolean) => void;
}

export function AdminIPOManagement({
  activeTab: externalTab,
  onSelectTab: externalOnSelectTab,
  isDrawerOpen: externalIsDrawerOpen,
  setIsDrawerOpen: externalSetIsDrawerOpen,
}: AdminIPOManagementProps) {
  const {
    ipos,
    removeIPO,
    updateIpo,
    updateIpoStatus,
    updateApplicationStatus,
    members,
    addMember,
    updateMember,
    transactions,
    currentMember,
    currentUser,
    currentUserRole,
    refreshIpos,
  } = useNexo();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [internalTab, setInternalTab] = useState<AdminTab>("ipos");
  const activeAdminTab = externalTab || internalTab;

  const setActiveAdminTab = (tab: AdminTab) => {
    if (externalOnSelectTab) {
      externalOnSelectTab(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Add Drawer & Remove State
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const isDrawerOpen = externalIsDrawerOpen !== undefined ? externalIsDrawerOpen : internalDrawerOpen;
  const setIsDrawerOpen = externalSetIsDrawerOpen || setInternalDrawerOpen;
  const [selectedIpoToRemove, setSelectedIpoToRemove] = useState<IPOOpportunity | null>(null);

  // Completed IPO / History State
  const [ipoFilterTab, setIpoFilterTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [selectedIpoToComplete, setSelectedIpoToComplete] = useState<IPOOpportunity | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Edit IPO Modal State
  const [editingIpo, setEditingIpo] = useState<IPOOpportunity | null>(null);
  const [editStep, setEditStep] = useState<1 | 2>(1);
  const [editStatus, setEditStatus] = useState<IPOLifecycleStage>("APPLYING");
  const [editGmp, setEditGmp] = useState<number>(0);
  const [editListingGain, setEditListingGain] = useState<number>(0);
  const [editRegistrarUrl, setEditRegistrarUrl] = useState<string>("");
  const [editThesis, setEditThesis] = useState<string>("");
  const [editRecommendation, setEditRecommendation] = useState<"APPLY" | "WATCH" | "SKIP">("APPLY");
  const [editOpenDate, setEditOpenDate] = useState<string>("18 Aug 2026");
  const [editCloseDate, setEditCloseDate] = useState<string>("28 Aug 2026");
  const [editAllotmentDate, setEditAllotmentDate] = useState<string>("01 Sep 2026");
  const [editListingDate, setEditListingDate] = useState<string>("04 Sep 2026");
  const [editFundUnblockDate, setEditFundUnblockDate] = useState<string>("02 Sep 2026");

  // Add Member Modal State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<MemberRole>("MEMBER");

  // Selected IPO for Allotment Processing Tab
  const [allotmentIpoFilter, setAllotmentIpoFilter] = useState<string>(ipos[0]?.id || "");

  // Feedback Toast
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Lock background scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      editingIpo ||
      selectedIpoToRemove ||
      selectedIpoToComplete ||
      isAddMemberModalOpen ||
      isDrawerOpen
    );
    if (isAnyModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [editingIpo, selectedIpoToRemove, selectedIpoToComplete, isAddMemberModalOpen, isDrawerOpen]);

  const activeRole = currentMember?.role || currentUser?.role || currentUserRole;
  const isAdmin = activeRole === "ADMIN" || activeRole === "SUPER_ADMIN" || activeRole !== "MEMBER";

  // Filter visible IPOs
  const visibleIpos = useMemo(() => ipos.filter((ipo: IPOOpportunity) => !ipo.isHidden), [ipos]);
  const activeIpos = useMemo(
    () => visibleIpos.filter((i: IPOOpportunity) => i.status !== "COMPLETED" && !(i as any).isCompleted),
    [visibleIpos]
  );
  const completedIpos = useMemo(
    () => visibleIpos.filter((i: IPOOpportunity) => i.status === "COMPLETED" || (i as any).isCompleted),
    [visibleIpos]
  );

  // All applications across visible IPOs
  const allApplications = useMemo(
    () =>
      visibleIpos.flatMap((ipo: IPOOpportunity) =>
        ipo.applications.map((app: any) => ({
          ...app,
          ipoName: ipo.name,
          ipoId: ipo.id,
        }))
      ),
    [visibleIpos]
  );

  // Calculated Admin Metrics
  const totalGroupCapital = useMemo(
    () => visibleIpos.reduce((sum: number, ipo: IPOOpportunity) => sum + (ipo.combinedCapital || 0), 0),
    [visibleIpos]
  );
  const totalAllottedApps = useMemo(
    () =>
      allApplications.filter(
        (a: any) => String(a.allotmentStatus || a.status || "").toUpperCase() === "ALLOTTED"
      ).length,
    [allApplications]
  );
  const totalRealizedProfit = useMemo(
    () =>
      visibleIpos.reduce((sum: number, ipo: IPOOpportunity) => {
        if (
          ipo.listingGainPercent &&
          (ipo.status === "ALLOTTED" ||
            ipo.status === "SOLD" ||
            ipo.status === "LISTED" ||
            ipo.status === "COMPLETED")
        ) {
          return sum + Math.round((ipo.combinedCapital * ipo.listingGainPercent) / 100);
        }
        return sum;
      }, 0),
    [visibleIpos]
  );

  const showToast = useCallback((msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 5000);
  }, []);

  const handleConfirmRemove = () => {
    if (!selectedIpoToRemove) return;
    const res = removeIPO(selectedIpoToRemove.id);
    if (res.success) {
      showToast(res.message || `✓ IPO removed. ${selectedIpoToRemove.name} is no longer visible on the user website.`);
    } else {
      showToast(`❌ ${res.message || "Failed to remove IPO."}`);
    }
    setSelectedIpoToRemove(null);
  };

  const handleConfirmComplete = async () => {
    if (!selectedIpoToComplete) return;
    setIsCompleting(true);
    try {
      const res = await fetch("/api/admin/ipos/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipoId: selectedIpoToComplete.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `✓ ${selectedIpoToComplete.name} marked as Completed and moved to History!`);
        AdminDataCache.invalidate("admin_ipos");
        if (typeof refreshIpos === "function") {
          await refreshIpos();
        }
        window.dispatchEvent(new Event("storage"));
      } else {
        showToast(`❌ ${data.error || "Failed to mark IPO as completed."}`);
      }
    } catch (_e) {
      showToast("❌ Network error while completing IPO.");
    } finally {
      setIsCompleting(false);
      setSelectedIpoToComplete(null);
    }
  };

  const handleOpenEdit = (ipo: IPOOpportunity) => {
    setEditingIpo(ipo);
    setEditStep(1);
    setEditStatus(ipo.status);
    setEditGmp(ipo.metrics?.gmp ?? 0);
    setEditListingGain(ipo.listingGainPercent ?? 0);
    setEditRegistrarUrl(ipo.registrarUrl || "");
    setEditThesis(ipo.thesis || "");
    setEditRecommendation(ipo.recommendation || "APPLY");
    setEditOpenDate(ipo.metrics?.openDate || "18 Aug 2026");
    setEditCloseDate(ipo.metrics?.closeDate || "28 Aug 2026");
    setEditAllotmentDate(ipo.metrics?.allotmentDate || "01 Sep 2026");
    setEditListingDate(ipo.metrics?.listingDate || "04 Sep 2026");
    setEditFundUnblockDate(ipo.metrics?.fundUnblockDate || "02 Sep 2026");
  };

  const handleSaveEditIpo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIpo) return;

    updateIpo(editingIpo.id, {
      status: editStatus,
      listingGainPercent: editListingGain,
      recommendation: editRecommendation,
      thesis: editThesis.trim() || editingIpo.thesis,
      registrarUrl: editRegistrarUrl.trim() || editingIpo.registrarUrl,
      metrics: {
        ...editingIpo.metrics,
        gmp: editGmp,
        openDate: editOpenDate.trim() || editingIpo.metrics?.openDate,
        closeDate: editCloseDate.trim() || editingIpo.metrics?.closeDate,
        allotmentDate: editAllotmentDate.trim() || editingIpo.metrics?.allotmentDate,
        listingDate: editListingDate.trim() || editingIpo.metrics?.listingDate,
        fundUnblockDate: editFundUnblockDate.trim() || editingIpo.metrics?.fundUnblockDate,
      },
    });

    showToast(`✓ Saved updates for ${editingIpo.name}. All users will see the updated status & schedule dates.`);
    setEditingIpo(null);
    setEditStep(1);
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberUsername.trim() || !memberPassword.trim()) return;

    await addMember({
      name: memberName.trim(),
      username: memberUsername.trim().toLowerCase(),
      password: memberPassword.trim(),
      email: memberEmail.trim() || `${memberUsername.trim()}@nexo.private`,
      role: memberRole,
    });

    showToast(`✓ Created new member: ${memberName.trim()} (${memberRole})`);
    setIsAddMemberModalOpen(false);
    setMemberName("");
    setMemberUsername("");
    setMemberRole("MEMBER");
  };

  const isOpenStatus = (st?: string) => {
    if (!st) return true;
    const s = String(st).toUpperCase().trim();
    return (
      s === "APPLICATION_OPEN" ||
      s === "APPLYING" ||
      s === "OPEN" ||
      s === "APPLICATION OPEN" ||
      s === "UPCOMING" ||
      s === "RESEARCHING" ||
      s === "WATCHLIST"
    );
  };

  // 1. Current Open IPOs
  const openIpos = useMemo(() => visibleIpos.filter((i) => isOpenStatus(i.status)), [visibleIpos]);

  // 2. Previous & Closed IPOs
  const previousIpos = useMemo(() => visibleIpos.filter((i) => !isOpenStatus(i.status)), [visibleIpos]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const adminDisplayName = currentMember?.name || currentUser?.name || "Admin";

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in pb-12 font-sans select-none">
      {/* Toast Feedback Alert */}
      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" weight="fill" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-extrabold text-sm ml-4 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* GREETING HEADER (SAME AS USER SIDE HOME SECTION) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b border-line font-sans">
        <div className="space-y-2">
          <h1 className="text-[28px] sm:text-[32px] leading-[1.2] font-bold text-ink tracking-tight">
            {getGreeting()},{" "}
            <span className="text-accent">{adminDisplayName}</span>.
          </h1>
          <p className="text-[14px] text-ink-secondary font-normal leading-relaxed">
            Your private IPO investment workspace &amp; administrative controller.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink bg-surface border border-line px-3.5 py-2 rounded-xl shadow-2xs">
            <span className="text-accent">📅</span>
            <span className="num-tabular">{formattedDate}</span>
          </div>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-extrabold text-xs transition-all shadow-md shadow-accent/20 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>Add IPO</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: CURRENT OPEN IPOS (SAME DESIGN AS USER SIDE HOME) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-line/70">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-ink tracking-tight flex items-center gap-2">
              <span>Current Open IPOs</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {openIpos.length} Active
              </span>
            </h2>
          </div>
        </div>

        {openIpos.length === 0 ? (
          <div className="p-10 text-center bg-surface-alt/40 border border-line/70 rounded-2xl text-ink-tertiary text-xs space-y-3">
            <Buildings size={36} className="text-ink-tertiary mx-auto" />
            <p className="text-sm font-bold text-ink">No active open IPO applications right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {openIpos.map((ipo) => {
              const gmpVal = typeof ipo.metrics?.gmpPercent === "number" ? ipo.metrics.gmpPercent : (ipo.metrics?.gmp ? Math.round((ipo.metrics.gmp / (ipo.metrics.priceBand?.max || 100)) * 100) : 18.5);
              const appsCount = ipo.applications?.length || 0;

              return (
                <div
                  key={ipo.id}
                  className="p-5 sm:p-6 transition-all rounded-2xl flex flex-col justify-between space-y-4 font-sans bg-gradient-to-b from-surface via-surface-alt/70 to-surface border-2 border-emerald-500/40 dark:border-emerald-500/35 shadow-xl shadow-emerald-500/5"
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line/70">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-small border shadow-2xs shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          {ipo.logo || ipo.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold text-ink-secondary uppercase tracking-wider bg-surface-alt/90 px-2 py-0.5 rounded-md border border-line/60">
                              {ipo.category || "MAINBOARD"}
                            </span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight leading-snug">
                            {ipo.name}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-ink-muted mt-0.5">
                            <Clock size={12} className="text-accent shrink-0" />
                            <span>
                              Added: <strong className="text-ink font-mono font-bold">{formatIpoAddedDateTime(ipo)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Pill Badge & GMP */}
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-sans font-bold flex items-center gap-1.5 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          APPLICATION OPEN
                        </span>
                        <GMPBadge gmpPercent={gmpVal} size="sm" />
                      </div>
                    </div>

                    {/* Financial Metrics Cluster */}
                    <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                      <div className="p-3 rounded-xl bg-surface-alt/70 border border-line/60 space-y-0.5">
                        <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider block">
                          Min Investment
                        </span>
                        <div className="text-base sm:text-lg font-bold text-ink num-tabular">
                          {formatINR(ipo.metrics.minInvestment)}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-alt/70 border border-line/60 space-y-0.5">
                        <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider block">
                          Issue Size
                        </span>
                        <div className="text-base sm:text-lg font-bold text-ink num-tabular">
                          {ipo.metrics.issueSize || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Group Thesis / Decision Box */}
                    <div className="p-3.5 rounded-xl border space-y-2 font-sans bg-positive-soft/60 border-positive/30">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-positive">
                        <ShieldCheck size={16} />
                        <span>Group Decision</span>
                      </div>

                      <p className="text-xs text-ink font-normal leading-relaxed">
                        {ipo.thesis || "Active group research and valuation approved for participation."}
                      </p>

                      <div className="flex items-center gap-3 pt-1.5 text-[11px] text-ink-tertiary border-t border-line/60 font-medium">
                        <span>
                          Authored by: <strong className="font-semibold text-ink">{ipo.decisionBy || "Super Admin"}</strong>
                        </span>
                        {ipo.decisionDate && (
                          <>
                            <span>•</span>
                            <span>
                              Decision date: <strong className="font-semibold text-ink">{ipo.decisionDate}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer & Admin Controls */}
                  <div className="pt-4 border-t border-line/70 flex flex-wrap items-center justify-between gap-3 font-sans">
                    <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/25 shadow-2xs">
                      <Clock size={14} className="text-amber-400" /> Closes {formatDate(ipo.metrics.closeDate)}
                    </span>

                    {/* Admin Action Buttons */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`/admin/applications?ipoId=${ipo.id}`}
                        className="px-3 py-1.5 rounded-xl bg-surface-alt hover:bg-surface-hover border border-line text-ink-secondary hover:text-ink text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Files size={14} className="text-accent" />
                        <span>Applications ({appsCount})</span>
                      </a>

                      <button
                        onClick={() => handleOpenEdit(ipo)}
                        className="px-3 py-1.5 rounded-xl bg-accent-soft hover:bg-accent/20 border border-accent/30 text-accent text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <PencilSimple size={14} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setSelectedIpoToComplete(ipo)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="Mark Completed and Move to History"
                      >
                        <CheckCircle size={14} />
                        <span>Complete</span>
                      </button>

                      <button
                        onClick={() => setSelectedIpoToRemove(ipo)}
                        className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                        title="Remove IPO"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: PREVIOUS & CLOSED IPOS (SAME DESIGN AS USER SIDE HOME) */}
      {previousIpos.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-line/70">
          <div className="flex items-center justify-between pb-2 border-b border-line/70">
            <div className="flex items-center gap-2">
              <Hourglass size={18} className="text-amber-400" />
              <h2 className="text-base sm:text-lg font-black text-ink tracking-tight flex items-center gap-2">
                <span>Previous &amp; Closed IPOs</span>
                <span className="text-xs font-bold text-ink-secondary bg-surface-alt px-2.5 py-0.5 rounded-full border border-line/70">
                  {previousIpos.length} Previous
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {previousIpos.map((ipo) => {
              const isPending = (["ALLOTMENT_PENDING", "CLOSED"] as string[]).includes(ipo.status);
              const isAllotted = (["ALLOTTED", "NOT_ALLOTTED"] as string[]).includes(ipo.status);
              const isListed = (["HOLDING", "LISTED", "SOLD", "COMPLETED"] as string[]).includes(ipo.status);
              const gmpVal = typeof ipo.metrics?.gmpPercent === "number" ? ipo.metrics.gmpPercent : (ipo.metrics?.gmp ? Math.round((ipo.metrics.gmp / (ipo.metrics.priceBand?.max || 100)) * 100) : 18.5);
              const appsCount = ipo.applications?.length || 0;

              return (
                <div
                  key={ipo.id}
                  className={`p-5 sm:p-6 transition-all rounded-2xl flex flex-col justify-between space-y-4 font-sans ${
                    isPending
                      ? "bg-surface border border-amber-500/30 opacity-95 hover:opacity-100"
                      : isAllotted
                      ? "bg-surface border border-purple-500/30 opacity-95 hover:opacity-100"
                      : "bg-surface border border-line/70 opacity-90 hover:opacity-100"
                  }`}
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line/70">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-small border shadow-2xs shrink-0 ${
                            isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : isAllotted
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                              : "bg-surface-alt text-ink-secondary border-line"
                          }`}
                        >
                          {ipo.logo || ipo.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold text-ink-secondary uppercase tracking-wider bg-surface-alt/90 px-2 py-0.5 rounded-md border border-line/60">
                              {ipo.category || "MAINBOARD"}
                            </span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight leading-snug">
                            {ipo.name}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-ink-muted mt-0.5">
                            <Clock size={12} className="text-accent shrink-0" />
                            <span>
                              Added: <strong className="text-ink font-mono font-bold">{formatIpoAddedDateTime(ipo)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Pill Badge */}
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-sans font-bold flex items-center gap-1.5">
                            <Hourglass size={13} /> ALLOTMENT PENDING
                          </span>
                        )}
                        {isAllotted && (
                          <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[11px] font-sans font-bold flex items-center gap-1.5">
                            <CheckCircle size={13} /> ALLOTMENT OUT
                          </span>
                        )}
                        {isListed && (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/35 text-[11px] font-sans font-bold flex items-center gap-1.5">
                            📈 LISTED &amp; HOLDING
                          </span>
                        )}

                        <GMPBadge gmpPercent={gmpVal} size="sm" />
                      </div>
                    </div>

                    {/* Financial Metrics Cluster */}
                    <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                      <div className="p-3 rounded-xl bg-surface-alt/70 border border-line/60 space-y-0.5">
                        <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider block">
                          Min Investment
                        </span>
                        <div className="text-base sm:text-lg font-bold text-ink num-tabular">
                          {formatINR(ipo.metrics.minInvestment)}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-alt/70 border border-line/60 space-y-0.5">
                        <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider block">
                          Issue Size
                        </span>
                        <div className="text-base sm:text-lg font-bold text-ink num-tabular">
                          {ipo.metrics.issueSize || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Group Thesis / Decision Box */}
                    <div className="p-3.5 rounded-xl border space-y-2 font-sans bg-surface-alt/60 border-line/60">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-ink-secondary">
                        <ShieldCheck size={16} />
                        <span>Group Decision</span>
                      </div>

                      <p className="text-xs text-ink font-normal leading-relaxed">
                        {ipo.thesis || "Historical performance and evaluation completed."}
                      </p>
                    </div>
                  </div>

                  {/* Footer & Admin Controls */}
                  <div className="pt-4 border-t border-line/70 flex flex-wrap items-center justify-between gap-3 font-sans">
                    <span className="text-xs text-ink-tertiary font-semibold flex items-center gap-1.5 bg-surface-alt px-3 py-1.5 rounded-xl border border-line/60">
                      <Clock size={14} /> Closed on {formatDate(ipo.metrics.closeDate)}
                    </span>

                    {/* Admin Action Buttons */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`/admin/allotment?ipoId=${ipo.id}`}
                        className="px-3 py-1.5 rounded-xl bg-surface-alt hover:bg-surface-hover border border-line text-ink-secondary hover:text-ink text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} className="text-purple-400" />
                        <span>Allotment ({appsCount})</span>
                      </a>

                      <button
                        onClick={() => handleOpenEdit(ipo)}
                        className="px-3 py-1.5 rounded-xl bg-accent-soft hover:bg-accent/20 border border-accent/30 text-accent text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <PencilSimple size={14} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setSelectedIpoToRemove(ipo)}
                        className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                        title="Remove IPO"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EDIT IPO MODAL (CENTERED 2-STEP MODAL MATCHING SCREENSHOT) */}
      {editingIpo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
          {/* Backdrop */}
          <div className="fixed inset-0" onClick={() => setEditingIpo(null)} />

          {/* Centered Modal Container with Uniform Height */}
          <div className="relative w-full max-w-lg min-h-[520px] max-h-[90vh] bg-surface border border-line rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden animate-scale-in my-auto">
            {/* Step Progress Line Bar */}
            <div className="w-full h-1 bg-surface-alt shrink-0">
              <div
                className={`h-full bg-blue-600 transition-all duration-300 ${
                  editStep === 1 ? "w-1/2" : "w-full"
                }`}
              />
            </div>

            {/* Modal Header */}
            <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-line bg-surface/95 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <PencilSimple size={20} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
                      {editStep === 1 ? "EDIT IPO • STEP 1 OF 2" : "EDIT IPO • STEP 2 OF 2"}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-ink tracking-tight">
                    {editStep === 1 ? `Edit: ${editingIpo.name}` : "Edit Schedule Dates"}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setEditingIpo(null)}
                className="p-1.5 rounded-xl text-ink-tertiary hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* STEP 1: Core Details & Status - Uniform Sizing */}
            {editStep === 1 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditStep(2);
                }}
                className="flex-1 flex flex-col justify-between p-5 sm:p-6 text-xs font-semibold text-ink overflow-y-auto"
              >
                <div className="space-y-3.5">
                  {/* Status Stage */}
                  <div className="space-y-1">
                    <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Lifecycle Stage</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as IPOLifecycleStage)}
                      className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-bold text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                    >
                      <option value="APPLYING">APPLYING (Open for applications)</option>
                      <option value="ALLOTMENT_PENDING">ALLOTMENT_PENDING (Bidding closed, awaiting result)</option>
                      <option value="ALLOTTED">ALLOTTED (Allotment declared)</option>
                      <option value="LISTED">LISTED (Trading live on NSE/BSE)</option>
                      <option value="SOLD">SOLD (Exit executed)</option>
                    </select>
                  </div>

                  {/* GMP & Listing Gain */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">GMP (₹)</label>
                      <input
                        type="number"
                        value={editGmp}
                        onChange={(e) => setEditGmp(Number(e.target.value))}
                        className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Listing Gain (%)</label>
                      <input
                        type="number"
                        value={editListingGain}
                        onChange={(e) => setEditListingGain(Number(e.target.value))}
                        className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="space-y-1">
                    <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Group Recommendation</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["APPLY", "WATCH", "SKIP"] as const).map((rec) => (
                        <button
                          key={rec}
                          type="button"
                          onClick={() => setEditRecommendation(rec)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            editRecommendation === rec
                              ? rec === "APPLY"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-extrabold"
                                : rec === "WATCH"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/30 font-extrabold"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/30 font-extrabold"
                              : "bg-surface-alt text-ink-secondary border-line"
                          }`}
                        >
                          {rec}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Registrar Link */}
                  <div className="space-y-1">
                    <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Registrar Status URL</label>
                    <input
                      type="url"
                      value={editRegistrarUrl}
                      onChange={(e) => setEditRegistrarUrl(e.target.value)}
                      placeholder="https://ipostatus.kfintech.com"
                      className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Thesis */}
                  <div className="space-y-1">
                    <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Thesis / Analysis Note</label>
                    <textarea
                      rows={3}
                      value={editThesis}
                      onChange={(e) => setEditThesis(e.target.value)}
                      className="w-full bg-surface-alt border border-line rounded-xl p-3 text-xs font-medium text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all leading-relaxed"
                    />
                  </div>
                </div>

                {/* Fixed Footer within Form */}
                <div className="pt-4 mt-4 border-t border-line flex items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingIpo(null)}
                    className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next: Schedule Dates</span>
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveEditIpo} className="flex-1 flex flex-col justify-between p-5 sm:p-6 text-xs font-semibold text-ink overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Open Date */}
                    <div className="space-y-1">
                      <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Open Date</label>
                      <input
                        type="text"
                        placeholder="18 Aug 2026"
                        value={editOpenDate}
                        onChange={(e) => setEditOpenDate(e.target.value)}
                        className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Close Date */}
                    <div className="space-y-1">
                      <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Close Date</label>
                      <input
                        type="text"
                        placeholder="28 Aug 2026"
                        value={editCloseDate}
                        onChange={(e) => setEditCloseDate(e.target.value)}
                        className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Allotment Date */}
                    <div className="space-y-1">
                      <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Allotment Date</label>
                      <input
                        type="text"
                        placeholder="01 Sep 2026"
                        value={editAllotmentDate}
                        onChange={(e) => setEditAllotmentDate(e.target.value)}
                        className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Listing Date */}
                    <div className="space-y-1">
                      <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Listing Date</label>
                      <input
                        type="text"
                        placeholder="04 Sep 2026"
                        value={editListingDate}
                        onChange={(e) => setEditListingDate(e.target.value)}
                        className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Fund Unblock Date */}
                  <div className="space-y-1">
                    <label className="block text-ink font-bold text-[11px] uppercase tracking-wider">Fund Unblock Date</label>
                    <input
                      type="text"
                      placeholder="02 Sep 2026"
                      value={editFundUnblockDate}
                      onChange={(e) => setEditFundUnblockDate(e.target.value)}
                      className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 mt-4 border-t border-line flex items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft size={14} weight="bold" />
                    <span>Back to Details</span>
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                  >
                    <FloppyDisk size={15} weight="bold" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl border border-line shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                <UserPlus size={18} className="text-accent" /> Create Member Account
              </h3>
              <button
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-ink-tertiary hover:text-ink p-1 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-bold text-ink focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={memberUsername}
                  onChange={(e) => setMemberUsername(e.target.value)}
                  placeholder="e.g. rahul"
                  className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-bold text-ink focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Assigned Password</label>
                <input
                  type="password"
                  required
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-bold text-ink focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as MemberRole)}
                  className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-bold text-ink focus:border-accent outline-none"
                >
                  <option value="MEMBER">MEMBER (Standard User)</option>
                  <option value="ADMIN">ADMIN (Full Console Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-secondary hover:bg-surface-alt cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-extrabold shadow-xs cursor-pointer"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE CONFIRMATION MODAL */}
      {selectedIpoToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 max-w-md w-full border border-line shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash size={24} />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-ink">Remove IPO?</h3>
              <p className="text-xs text-ink-secondary font-medium mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-ink">{selectedIpoToRemove.name}</span> from the user website?
              </p>
              <p className="text-[11px] text-ink-tertiary mt-2">
                This will hide the IPO from members while keeping application references safe.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedIpoToRemove(null)}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
              >
                Remove IPO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARK AS COMPLETED MODAL */}
      {selectedIpoToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 max-w-md w-full border border-line shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-[#32C98B] flex items-center justify-center">
              <CheckCircle size={26} weight="bold" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-ink">Mark IPO as Completed?</h3>
              <p className="text-xs text-ink-secondary font-medium mt-1 leading-relaxed">
                You are about to mark <span className="font-bold text-ink">{selectedIpoToComplete.name}</span> as <strong>Completed</strong> and move it to the <strong>History</strong> section.
              </p>
              <p className="text-[11px] text-ink-tertiary mt-2">
                This will archive the IPO lifecycle stage to Completed and display it in the History ledger.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedIpoToComplete(null)}
                disabled={isCompleting}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                disabled={isCompleting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isCompleting ? "Completing..." : "Confirm & Move to History"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD IPO DRAWER */}
      <AddIPODrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={showToast}
      />
    </div>
  );
}

