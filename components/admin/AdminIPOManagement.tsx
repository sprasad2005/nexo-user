"use client";

import React, { useState, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { AdminDataCache } from "@/lib/adminDataCache";
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
} from "@phosphor-icons/react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { AddIPODrawer } from "./AddIPODrawer";
import { AdminIPOHistoryView } from "./AdminIPOHistoryView";
import { formatINR, formatApplicantNames } from "@/lib/mockData";

import { AdminTab } from "./AdminSidebar";
import { Receipt, CreditCard, Key } from "@phosphor-icons/react";

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
  const [editStatus, setEditStatus] = useState<IPOLifecycleStage>("APPLYING");
  const [editGmp, setEditGmp] = useState<number>(0);
  const [editListingGain, setEditListingGain] = useState<number>(0);
  const [editRegistrarUrl, setEditRegistrarUrl] = useState<string>("");
  const [editThesis, setEditThesis] = useState<string>("");
  const [editRecommendation, setEditRecommendation] = useState<"APPLY" | "WATCH" | "SKIP">("APPLY");

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

  const activeRole = currentMember?.role || currentUser?.role || currentUserRole;
  const isAdmin = activeRole === "ADMIN";

  // Filter visible IPOs
  const visibleIpos = ipos.filter((ipo) => !ipo.isHidden);
  const activeIpos = visibleIpos.filter((i) => i.status !== "COMPLETED" && !(i as any).isCompleted);
  const completedIpos = visibleIpos.filter((i) => i.status === "COMPLETED" || (i as any).isCompleted);

  // All applications across visible IPOs
  const allApplications = visibleIpos.flatMap((ipo) =>
    ipo.applications.map((app) => ({
      ...app,
      ipoName: ipo.name,
      ipoId: ipo.id,
    }))
  );

  // Calculated Admin Metrics
  const totalGroupCapital = visibleIpos.reduce((sum, ipo) => sum + (ipo.combinedCapital || 0), 0);
  const totalAllottedApps = allApplications.filter((a) => a.allotmentStatus === "ALLOTTED").length;
  const totalRealizedProfit = visibleIpos.reduce((sum, ipo) => {
    if (ipo.listingGainPercent && (ipo.status === "ALLOTTED" || ipo.status === "SOLD" || ipo.status === "LISTED" || ipo.status === "COMPLETED")) {
      return sum + Math.round((ipo.combinedCapital * ipo.listingGainPercent) / 100);
    }
    return sum;
  }, 0);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

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
      },
    });

    showToast(`✓ Saved updates for ${editingIpo.name}. All users will see the updated status & metrics.`);
    setEditingIpo(null);
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
    setMemberPassword("");
    setMemberEmail("");
    setMemberRole("MEMBER");
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 font-sans mt-12 bg-surface border border-rose-200 dark:border-rose-900 rounded-3xl shadow-xl">
        <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <WarningCircle size={32} />
        </div>
        <h2 className="text-lg font-extrabold text-ink">Unauthorized Access</h2>
        <p className="text-xs text-ink-secondary font-medium">
          You need Admin privileges to access the Admin Console.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-accent text-white font-bold text-xs hover:bg-accent-hover transition-all shadow-md"
        >
          <ArrowLeft size={16} /> Return to User Dashboard
        </a>
      </div>
    );
  }

  const selectedIpoForApps = visibleIpos.find((i) => i.id === allotmentIpoFilter) || visibleIpos[0];
  const filteredAppsForIpo = selectedIpoForApps ? selectedIpoForApps.applications : [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4 sm:p-6 md:p-8 pb-16 font-sans">
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

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface border border-line rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold text-accent bg-accent-soft border border-accent/20 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
              ADMIN CONSOLE
            </span>
            <span className="text-ink-tertiary">•</span>
            <span className="text-xs font-bold text-ink-secondary">Primary Controller</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight flex items-center gap-2">
            <ShieldCheck size={26} className="text-accent" />
            IPO &amp; MEMBER OPERATING SYSTEM
          </h1>
          <p className="text-xs font-medium text-ink-secondary mt-0.5">
            Manage active IPOs, declare allotment gains, process group applications, and manage member roles.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-extrabold text-xs transition-all shadow-md shadow-accent/20 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>Add IPO</span>
          </button>
        </div>
      </div>

      {/* 4 ADMIN METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4.5 glass-card-premium rounded-2xl space-y-1.5 relative overflow-hidden border-t-2 border-accent">
          <div className="flex items-center justify-between text-ink-tertiary text-xs font-semibold uppercase tracking-wider">
            <span>Managed IPOs</span>
            <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent border border-accent/20 flex items-center justify-center">
              <Buildings size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-ink num-tabular">{visibleIpos.length}</div>
          <p className="text-[11px] font-medium text-ink-secondary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Active on website</span>
          </p>
        </div>

        <div className="p-4.5 glass-card-premium rounded-2xl space-y-1.5 relative overflow-hidden border-t-2 border-indigo-500">
          <div className="flex items-center justify-between text-ink-tertiary text-xs font-semibold uppercase tracking-wider">
            <span>Group Capital</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center">
              <TrendUp size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-ink num-tabular">{formatINR(totalGroupCapital)}</div>
          <p className="text-[11px] font-medium text-ink-secondary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Total group applied</span>
          </p>
        </div>

        <div className="p-4.5 glass-card-premium rounded-2xl space-y-1.5 relative overflow-hidden border-t-2 border-amber-500">
          <div className="flex items-center justify-between text-ink-tertiary text-xs font-semibold uppercase tracking-wider">
            <span>Allotted Apps</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Files size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-ink num-tabular">{totalAllottedApps}</div>
          <p className="text-[11px] font-medium text-ink-secondary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Applications allotted</span>
          </p>
        </div>

        <div className="p-4.5 glass-card-premium rounded-2xl space-y-1.5 relative overflow-hidden border-t-2 border-positive">
          <div className="flex items-center justify-between text-ink-tertiary text-xs font-semibold uppercase tracking-wider">
            <span>Declared PnL</span>
            <div className="w-8 h-8 rounded-xl bg-positive-soft text-positive border border-positive/20 flex items-center justify-center">
              <ChartLineUp size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-positive num-tabular">
            {formatINR(totalRealizedProfit, true)}
          </div>
          <p className="text-[11px] font-medium text-ink-secondary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
            <span>Realized listing gains</span>
          </p>
        </div>
      </div>

      {/* TAB 1: IPO CATALOG & LIFECYCLE MANAGER */}
      {activeAdminTab === "ipos" && (
        <div className="bg-surface border border-line rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-line bg-surface-alt/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
              Published IPO Opportunities ({visibleIpos.length})
            </h3>

            {/* Filter Tabs: Active vs Completed (History) */}
            <div className="flex items-center gap-1 bg-surface border border-line p-1 rounded-xl text-xs">
              <button
                onClick={() => setIpoFilterTab("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  ipoFilterTab === "ACTIVE"
                    ? "bg-accent text-white shadow-xs"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Active IPOs ({activeIpos.length})
              </button>
              <button
                onClick={() => setIpoFilterTab("COMPLETED")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  ipoFilterTab === "COMPLETED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                History / Completed ({completedIpos.length})
              </button>
            </div>
          </div>

          {!isMounted ? (
            <div className="p-8 space-y-4 animate-pulse">
              <div className="h-44 bg-surface-alt rounded-2xl" />
            </div>
          ) : (ipoFilterTab === "ACTIVE" ? activeIpos : completedIpos).length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Buildings size={36} className="text-ink-tertiary mx-auto" />
              <h4 className="text-sm font-bold text-ink">
                {ipoFilterTab === "ACTIVE" ? "No Active IPOs" : "No Completed IPOs in History"}
              </h4>
              <p className="text-xs text-ink-tertiary">
                {ipoFilterTab === "ACTIVE"
                  ? 'Click "+ Add IPO" to publish an IPO to the user website.'
                  : "Mark active IPOs as completed to store them in the History ledger."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {(ipoFilterTab === "ACTIVE" ? activeIpos : completedIpos).map((ipo) => {
                const isAllottedOrListed =
                  ipo.status === "ALLOTTED" || ipo.status === "LISTED" || ipo.status === "SOLD" || ipo.status === "COMPLETED";

                return (
                  <div
                    key={ipo.id}
                    className="p-4.5 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-surface-alt/60 transition-colors"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-h4 font-semibold text-ink truncate tracking-tight">
                          {ipo.name}
                        </h4>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface-alt text-ink-secondary border border-line">
                          {ipo.category || "Mainboard"}
                        </span>

                        {/* Status Stage Badge */}
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            ipo.status === "COMPLETED" || (ipo as any).isCompleted
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-[#32C98B] border-emerald-500/30 font-extrabold"
                              : isAllottedOrListed
                              ? "bg-positive-soft text-positive border-positive/30"
                              : "bg-accent-soft text-accent border-accent/30"
                          }`}
                        >
                          {ipo.status === "COMPLETED" || (ipo as any).isCompleted ? "Completed ✓" : `Stage: ${ipo.status}`}
                        </span>

                        {ipo.recommendation && (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase ${
                              ipo.recommendation === "APPLY"
                                ? "bg-positive-soft text-positive border border-positive/30"
                                : ipo.recommendation === "WATCH"
                                ? "bg-caution-soft text-caution border border-caution/30"
                                : "bg-negative-soft text-negative border border-negative/30"
                            }`}
                          >
                            Rec: {ipo.recommendation}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-small text-ink-secondary font-medium">
                        <div>
                          Min Inv:{" "}
                          <span className="font-semibold text-ink num-tabular">
                            ₹{ipo.metrics?.minInvestment ? ipo.metrics.minInvestment.toLocaleString("en-IN") : "15,000"}
                          </span>
                        </div>
                        {ipo.metrics?.gmp !== undefined && (
                          <div>
                            GMP:{" "}
                            <span className="font-semibold text-positive num-tabular">
                              +₹{ipo.metrics.gmp}
                            </span>
                          </div>
                        )}
                        {ipo.listingGainPercent !== undefined && (
                          <div>
                            Listing Gain:{" "}
                            <span className="font-semibold text-positive num-tabular">
                              +{ipo.listingGainPercent}%
                            </span>
                          </div>
                        )}
                        <div>
                          Combined Capital:{" "}
                          <span className="font-semibold text-ink num-tabular">
                            {formatINR(ipo.combinedCapital || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-auto">
                      {/* Mark as Completed Button */}
                      {ipo.status !== "COMPLETED" && !(ipo as any).isCompleted && (
                        <button
                          onClick={() => setSelectedIpoToComplete(ipo)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-[#32C98B] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all shadow-2xs cursor-pointer active:scale-98"
                        >
                          <CheckCircle size={15} weight="bold" />
                          <span>Mark as Completed</span>
                        </button>
                      )}

                      {/* Edit Details Button */}
                      <button
                        onClick={() => {
                          setEditingIpo(ipo);
                          setEditStatus(ipo.status);
                          setEditGmp(ipo.metrics?.gmp ?? 0);
                          setEditListingGain(ipo.listingGainPercent ?? 0);
                          setEditRegistrarUrl(ipo.registrarUrl || "");
                          setEditThesis(ipo.thesis || "");
                          setEditRecommendation(ipo.recommendation || "APPLY");
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-accent bg-accent-soft hover:bg-accent/15 border border-accent/25 transition-all shadow-2xs cursor-pointer active:scale-98"
                      >
                        <PencilSimple size={14} weight="bold" />
                        <span>Edit Details</span>
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => setSelectedIpoToRemove(ipo)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-negative bg-negative-soft hover:bg-negative-soft/80 border border-negative/25 transition-all cursor-pointer active:scale-98"
                      >
                        <Trash size={14} weight="bold" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: IPO HISTORY & COMPLETED LEDGER */}
      {activeAdminTab === "history" && (
        <AdminIPOHistoryView />
      )}

      {/* TAB 2: ALLOTMENT & APPLICATION PROCESSOR */}
      {activeAdminTab === "allotments" && (
        <div className="bg-surface border border-line rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h3 className="text-base font-extrabold text-ink">Allotment Status Processor</h3>
              <p className="text-xs text-ink-secondary">
                Update member application allotment statuses. Allotted status will automatically calculate user portfolio PnL.
              </p>
            </div>

            {/* IPO Selector Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink-secondary">Select IPO:</span>
              <CustomSelect
                value={allotmentIpoFilter}
                onChange={(val) => setAllotmentIpoFilter(val)}
                options={visibleIpos.map((ipo) => ({
                  value: ipo.id,
                  label: ipo.name,
                }))}
                className="min-w-[180px]"
              />
            </div>
          </div>

          {filteredAppsForIpo.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Files size={32} className="text-ink-tertiary mx-auto" />
              <p className="text-xs font-bold text-ink-secondary">No applications filed for {selectedIpoForApps?.name}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line text-ink-secondary uppercase text-[10px] tracking-wider font-bold bg-surface-alt">
                    <th className="py-2.5 px-3">Applicant Name</th>
                    <th className="py-2.5 px-3">PAN Card</th>
                    <th className="py-2.5 px-3">Contribution</th>
                    <th className="py-2.5 px-3">Current Status</th>
                    <th className="py-2.5 px-3 text-center">Change Allotment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredAppsForIpo.map((app) => (
                    <tr key={app.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 px-3 font-extrabold text-ink">{formatApplicantNames(app)}</td>
                      <td className="py-3 px-3 font-mono text-ink-secondary text-[11px]">
                        {app.panMasked || "ABCDE1234F"}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-ink num-tabular">
                        {formatINR(app.totalContribution)}
                      </td>
                      <td className="py-3 px-3">
                        {(() => {
                          const st = String(app.allotmentStatus || "AWAITING").toUpperCase();
                          return (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                st === "ALLOTTED"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : st === "NOT_ALLOTTED" || st === "REJECTED"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {app.allotmentStatus || "AWAITING"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              updateApplicationStatus(selectedIpoForApps.id, app.id, "ALLOTTED");
                              showToast(`✓ Marked ${app.applicantName}'s application as ALLOTTED!`);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Mark Allotted
                          </button>
                          <button
                            onClick={() => {
                              updateApplicationStatus(selectedIpoForApps.id, app.id, "NOT_ALLOTTED");
                              showToast(`Updated ${app.applicantName}'s application status to NOT ALLOTTED.`);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                          >
                            Not Allotted
                          </button>
                          <button
                            onClick={() => {
                              updateApplicationStatus(selectedIpoForApps.id, app.id, "AWAITING");
                              showToast(`Reset ${app.applicantName}'s application status to AWAITING.`);
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-ink-secondary bg-surface-alt hover:bg-surface-hover border border-line transition-colors cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GROUP MEMBER & ROLE CONTROL */}
      {activeAdminTab === "members" && (
        <div className="bg-surface border border-line rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-base font-extrabold text-ink">Member Roles &amp; Permissions</h3>
              <p className="text-xs text-ink-secondary">
                Manage group member accounts, grant Admin privileges, or edit contribution defaults.
              </p>
            </div>

            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white font-extrabold text-xs hover:bg-accent-hover shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus size={16} />
              <span>+ Add Member Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 bg-surface-alt/70 border border-line rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-line">
                    <img src={member.avatar || "/oggy.png"} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-ink truncate">{member.name}</h4>
                    <p className="text-xs font-mono text-ink-tertiary truncate">
                      {member.username} • {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={member.role}
                    onChange={(e) => {
                      const newRole = e.target.value as MemberRole;
                      updateMember(member.id, { role: newRole });
                      showToast(`Updated ${member.name}'s role to ${newRole}`);
                    }}
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border outline-none cursor-pointer ${
                      member.role === "ADMIN"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-surface text-ink-secondary border-line"
                    }`}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TRANSACTIONS AUDIT LEDGER */}
      {activeAdminTab === "transactions" && (
        <div className="bg-surface border border-line rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                <Receipt size={20} className="text-accent" /> Group Transactions Audit Ledger ({transactions.length})
              </h3>
              <p className="text-xs text-ink-secondary">
                Comprehensive record of all bid contributions, allotted distributions, and refunds.
              </p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Receipt size={32} className="text-ink-tertiary mx-auto" />
              <p className="text-xs font-bold text-ink-secondary">No transactions recorded in system yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line text-ink-secondary uppercase text-[10px] tracking-wider font-bold bg-surface-alt">
                    <th className="py-2.5 px-3">Txn ID / Date</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Target IPO</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-ink-tertiary text-[11px]">
                        <div className="font-extrabold text-ink">{txn.id}</div>
                        <div>{txn.createdAt ? new Date(txn.createdAt).toLocaleDateString("en-IN") : "Today"}</div>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-ink">
                        {(txn as any).memberName || (txn as any).participants?.join(", ") || "Group Member"}
                      </td>
                      <td className="py-3 px-3 font-bold text-ink-secondary">{txn.ipoName || "IPO"}</td>
                      <td className="py-3 px-3 font-black text-ink num-tabular">
                        {formatINR(txn.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-surface-alt border border-line text-[10px] font-mono uppercase font-bold text-ink-secondary">
                          {txn.type || "BID_DEPOSIT"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            txn.status === "ALLOTTED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : txn.status === "REFUNDED" || txn.status === "REJECTED"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}
                        >
                          {txn.status || "SUBMITTED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EDIT IPO MODAL */}
      {editingIpo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl border border-line shadow-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                <PencilSimple size={18} className="text-accent" /> Edit IPO: {editingIpo.name}
              </h3>
              <button
                onClick={() => setEditingIpo(null)}
                className="text-ink-tertiary hover:text-ink p-1 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditIpo} className="space-y-3.5 text-xs">
              {/* Status Stage */}
              <div>
                <label className="block font-bold text-ink mb-1">Lifecycle Stage</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as IPOLifecycleStage)}
                  className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:border-accent outline-none"
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
                <div>
                  <label className="block font-bold text-ink mb-1">Grey Market Premium (GMP ₹)</label>
                  <input
                    type="number"
                    value={editGmp}
                    onChange={(e) => setEditGmp(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-bold text-ink focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Listing Gain (%)</label>
                  <input
                    type="number"
                    value={editListingGain}
                    onChange={(e) => setEditListingGain(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-bold text-ink focus:border-accent outline-none"
                  />
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <label className="block font-bold text-ink mb-1">Group Recommendation</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["APPLY", "WATCH", "SKIP"] as const).map((rec) => (
                    <button
                      key={rec}
                      type="button"
                      onClick={() => setEditRecommendation(rec)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        editRecommendation === rec
                          ? rec === "APPLY"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : rec === "WATCH"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-rose-50 text-rose-800 border-rose-300"
                          : "bg-surface-alt text-ink-secondary border-line"
                      }`}
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Registrar Link */}
              <div>
                <label className="block font-bold text-ink mb-1">Registrar Status URL</label>
                <input
                  type="url"
                  value={editRegistrarUrl}
                  onChange={(e) => setEditRegistrarUrl(e.target.value)}
                  placeholder="https://ipostatus.kfintech.com"
                  className="w-full bg-surface-alt border border-line rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-accent outline-none"
                />
              </div>

              {/* Thesis */}
              <div>
                <label className="block font-bold text-ink mb-1">Thesis / Analysis Note</label>
                <textarea
                  rows={3}
                  value={editThesis}
                  onChange={(e) => setEditThesis(e.target.value)}
                  className="w-full bg-surface-alt border border-line rounded-xl p-3 text-xs font-medium text-ink focus:border-accent outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingIpo(null)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-secondary hover:bg-surface-alt cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-extrabold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
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
                onClick={() => setSelectedIpoToRemove(null)}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
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
                onClick={() => setSelectedIpoToComplete(null)}
                disabled={isCompleting}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
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

