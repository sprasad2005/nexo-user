"use client";

import React, { useState } from "react";
import { useNexo } from "@/context/NexoContext";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { formatINR } from "@/lib/mockData";
import { IPOLifecycleStage, MemberRole } from "@/types/nexo";
import { AddIPODrawer } from "@/components/admin/AddIPODrawer";
import {
  SquaresFour,
  Buildings,
  Files,
  Users,
  Plus,
  SignOut,
  ArrowSquareOut,
  CheckCircle,
  Sun,
  Moon,
  Trash,
  MagnifyingGlass,
  Check,
  List as MenuIcon,
  X,
} from "@phosphor-icons/react";

type ConsoleTab = "overview" | "ipos" | "applications" | "members";

export function AdminConsole() {
  const {
    ipos,
    members,
    portfolioSummary,
    currentMember,
    currentUser,
    logout,
    updateIpoStatus,
    updateApplicationStatus,
    updateMember,
    removeIPO,
    updateIpo,
  } = useNexo();

  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ConsoleTab>("overview");
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingGmpIpoId, setEditingGmpIpoId] = useState<string | null>(null);
  const [gmpInput, setGmpInput] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const activeUser = currentUser || currentMember;
  const isDark = theme === "dark";

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  // Metrics
  const visibleIpos = ipos.filter((i) => !i.isHidden);
  const activeIposCount = visibleIpos.filter((i) =>
    ["APPLYING", "APPLICATION_OPEN", "APPLIED", "ALLOTMENT_PENDING"].includes(i.status)
  ).length;

  const allApplications = visibleIpos.flatMap((i) =>
    (i.applications || []).map((app) => ({
      ...app,
      ipoName: i.name,
      ipoId: i.id,
    }))
  );

  const totalCapital = portfolioSummary?.totalCapital || 284500;

  // Filtered lists
  const filteredIpos = visibleIpos.filter(
    (i) =>
      !searchQuery ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredApps = allApplications.filter(
    (app) =>
      !searchQuery ||
      app.ipoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.applicantName && app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMembers = members.filter(
    (m) =>
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTabTitle = (tab: ConsoleTab) => {
    switch (tab) {
      case "overview":
        return "Dashboard Overview";
      case "ipos":
        return "IPO Catalog Management";
      case "applications":
        return "Applications & Allotments";
      case "members":
        return "Group Members & Roles";
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink font-sans antialiased flex overflow-hidden h-screen select-none">
      {/* ── DESKTOP DEDICATED LEFT SIDEBAR ── */}
      <aside className="hidden md:flex w-60 bg-surface border-r border-line flex-col justify-between shrink-0 font-sans z-30">
        <div className="flex flex-col flex-1 min-h-0">
          {/* BRAND HEADER */}
          <div className="h-16 px-4 border-b border-line flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-accent text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              NX
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-ink tracking-tight truncate">NEXO ADMIN</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase shrink-0">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-ink-tertiary truncate">Operations Control</p>
            </div>
          </div>

          {/* QUICK ADD IPO BUTTON */}
          <div className="p-3 border-b border-line/40">
            <button
              onClick={() => setIsAddDrawerOpen(true)}
              className="w-full h-9 rounded-lg bg-accent hover:bg-accent/90 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Plus size={16} weight="bold" />
              <span>+ Add New IPO</span>
            </button>
          </div>

          {/* NAVIGATION ITEMS */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="px-2 pb-1 text-[10px] font-extrabold text-ink-tertiary uppercase tracking-wider">
              ADMIN MENU
            </div>

            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <SquaresFour size={16} />
                <span>Overview</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("ipos")}
              className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ipos"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Buildings size={16} />
                <span>IPO Catalog</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-alt text-ink-tertiary">
                {visibleIpos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("applications")}
              className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "applications"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Files size={16} />
                <span>Applications</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-alt text-ink-tertiary">
                {allApplications.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("members")}
              className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "members"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={16} />
                <span>Members</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-alt text-ink-tertiary">
                {members.length}
              </span>
            </button>
          </nav>
        </div>

        {/* BOTTOM FOOTER USER & PROFILE */}
        <div className="p-3 border-t border-line space-y-2 bg-surface-alt/30">
          <a
            href="/"
            className="w-full flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-bold text-accent hover:bg-accent/10 transition-colors"
          >
            <ArrowSquareOut size={15} />
            <span>Open User Site</span>
          </a>

          <div className="p-2 rounded-lg bg-surface border border-line flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={activeUser?.avatar || "/oggy.png"}
                alt={activeUser?.name || "Admin"}
                className="w-6 h-6 rounded-full object-cover border border-line shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-ink truncate leading-none">
                  {activeUser?.name || "Admin"}
                </h4>
                <span className="text-[10px] text-ink-tertiary leading-tight block truncate mt-0.5">
                  Administrator
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1 rounded text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE SIDEBAR DRAWER OVERLAY ── */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-60 h-full bg-surface shadow-2xl flex flex-col justify-between">
            <div>
              <div className="h-16 px-4 border-b border-line flex items-center justify-between">
                <span className="text-xs font-black text-ink">NEXO ADMIN</span>
                <button onClick={() => setIsMobileSidebarOpen(false)} className="text-ink-tertiary">
                  <X size={18} />
                </button>
              </div>
              <nav className="p-3 space-y-1">
                {(["overview", "ipos", "applications", "members"] as ConsoleTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setActiveTab(t);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold capitalize ${
                      activeTab === t ? "bg-accent text-white" : "text-ink-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* ── RIGHT MAIN WRAPPER ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-page">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-20 bg-surface border-b border-line px-4 sm:px-6 h-16 flex items-center justify-between shadow-2xs shrink-0 font-sans">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-line text-ink-secondary hover:text-ink cursor-pointer"
            >
              <MenuIcon size={18} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <span>NEXO ADMIN</span>
                <span className="text-ink-tertiary">/</span>
                <span className="text-accent">{getTabTitle(activeTab)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlass size={14} className="absolute left-3 top-2.5 text-ink-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-8.5 pl-8 pr-3 rounded-xl bg-surface-alt border border-line text-xs font-medium text-ink placeholder:text-ink-tertiary focus:outline-hidden"
              />
            </div>

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-line text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* TOAST FEEDBACK */}
        {feedbackMsg && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle size={16} weight="fill" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* SCROLLABLE VIEW CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto w-full space-y-6">
            {/* ── TAB 1: OVERVIEW ── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs">
                    <span className="text-[10px] font-extrabold text-ink-tertiary uppercase tracking-wider block">
                      Active IPOs
                    </span>
                    <div className="text-2xl font-bold text-ink font-mono mt-1">{activeIposCount}</div>
                    <span className="text-[10px] text-emerald-500 font-semibold mt-0.5 block">Catalog Active</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs">
                    <span className="text-[10px] font-extrabold text-ink-tertiary uppercase tracking-wider block">
                      Applications
                    </span>
                    <div className="text-2xl font-bold text-ink font-mono mt-1">{allApplications.length}</div>
                    <span className="text-[10px] text-ink-tertiary font-medium mt-0.5 block">Submissions</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs">
                    <span className="text-[10px] font-extrabold text-ink-tertiary uppercase tracking-wider block">
                      Group Members
                    </span>
                    <div className="text-2xl font-bold text-ink font-mono mt-1">{members.length}</div>
                    <span className="text-[10px] text-ink-tertiary font-medium mt-0.5 block">Participants</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs">
                    <span className="text-[10px] font-extrabold text-ink-tertiary uppercase tracking-wider block">
                      Tracked Capital
                    </span>
                    <div className="text-xl font-bold text-ink font-mono mt-1">{formatINR(totalCapital)}</div>
                    <span className="text-[10px] text-accent font-medium mt-0.5 block">NEXO Treasury</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h2 className="text-xs font-bold text-ink uppercase tracking-wider">ACTIVE IPO OPPORTUNITIES</h2>
                    <button
                      onClick={() => setActiveTab("ipos")}
                      className="text-xs font-bold text-accent hover:underline cursor-pointer"
                    >
                      View All ({visibleIpos.length}) →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="border-b border-line text-[10px] font-extrabold text-ink-tertiary uppercase">
                          <th className="py-2 px-2">IPO Name</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2">Decision</th>
                          <th className="py-2 px-2 text-right">Min Investment</th>
                          <th className="py-2 px-2 text-right">GMP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/40">
                        {visibleIpos.slice(0, 5).map((ipo) => (
                          <tr key={ipo.id} className="h-10 hover:bg-surface-hover">
                            <td className="py-2 px-2 font-bold text-ink">{ipo.name}</td>
                            <td className="py-2 px-2 font-mono text-[10px] text-ink-secondary">{ipo.status}</td>
                            <td className="py-2 px-2">
                              <span className="font-mono text-[10px] font-bold text-emerald-500">{ipo.recommendation}</span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-ink">
                              {formatINR(ipo.metrics.minInvestment)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-emerald-500">
                              +{ipo.metrics.gmp ? `₹${ipo.metrics.gmp}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: IPO CATALOG MANAGEMENT ── */}
            {activeTab === "ipos" && (
              <div className="rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-ink uppercase tracking-wider">IPO CATALOG & STATUS CONTROL</h2>
                    <p className="text-xs text-ink-tertiary">Update lifecycle stage, GMP estimates, and recommendation tags</p>
                  </div>
                  <button
                    onClick={() => setIsAddDrawerOpen(true)}
                    className="h-8 px-3 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90 cursor-pointer shadow-2xs"
                  >
                    + Add New IPO
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-line text-[10px] font-extrabold text-ink-tertiary uppercase">
                        <th className="py-2.5 px-3">IPO Opportunity</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Decision</th>
                        <th className="py-2.5 px-3 text-right">GMP (₹)</th>
                        <th className="py-2.5 px-3 text-right">Min Investment</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {filteredIpos.map((ipo) => (
                        <tr key={ipo.id} className="h-12 hover:bg-surface-hover transition-colors">
                          <td className="py-2 px-3 font-bold text-ink">
                            <div>
                              <span className="block">{ipo.name}</span>
                              <span className="text-[10px] font-normal text-ink-tertiary">{ipo.company}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={ipo.status}
                              onChange={(e) => {
                                updateIpoStatus(ipo.id, e.target.value as IPOLifecycleStage);
                                showToast(`Updated status for ${ipo.name}`);
                              }}
                              className="h-7 px-2 rounded-md bg-surface-alt border border-line text-[11px] font-semibold text-ink cursor-pointer"
                            >
                              <option value="RESEARCHING">RESEARCHING</option>
                              <option value="WATCHLIST">WATCHLIST</option>
                              <option value="APPLYING">APPLYING</option>
                              <option value="APPLICATION_OPEN">APPLICATION_OPEN</option>
                              <option value="ALLOTMENT_PENDING">ALLOTMENT_PENDING</option>
                              <option value="HOLDING">HOLDING</option>
                              <option value="LISTED">LISTED</option>
                              <option value="SOLD">SOLD</option>
                              <option value="CLOSED">CLOSED</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={ipo.recommendation}
                              onChange={(e) => {
                                updateIpo(ipo.id, { recommendation: e.target.value as any });
                                showToast(`Updated decision for ${ipo.name}`);
                              }}
                              className="h-7 px-2 rounded-md bg-surface-alt border border-line text-[11px] font-bold text-emerald-500 cursor-pointer"
                            >
                              <option value="APPLY">APPLY</option>
                              <option value="WATCH">WATCH</option>
                              <option value="SKIP">SKIP</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-500">
                            {editingGmpIpoId === ipo.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  value={gmpInput}
                                  onChange={(e) => setGmpInput(Number(e.target.value))}
                                  className="w-16 h-7 px-1.5 rounded border border-accent bg-surface text-xs text-right font-mono text-ink"
                                />
                                <button
                                  onClick={() => {
                                    updateIpo(ipo.id, {
                                      metrics: { ...ipo.metrics, gmp: gmpInput },
                                    });
                                    setEditingGmpIpoId(null);
                                    showToast(`Updated GMP for ${ipo.name}`);
                                  }}
                                  className="p-1 rounded bg-emerald-500 text-white"
                                >
                                  <Check size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingGmpIpoId(ipo.id);
                                  setGmpInput(ipo.metrics.gmp || 0);
                                }}
                                className="hover:underline cursor-pointer"
                              >
                                +{ipo.metrics.gmp ? `₹${ipo.metrics.gmp}` : "Edit ₹"}
                              </button>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-ink">
                            {formatINR(ipo.metrics.minInvestment)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={async () => {
                                if (confirm(`Permanently delete ${ipo.name} from catalog and user website?`)) {
                                  try {
                                    const res = await removeIPO(ipo.id);
                                    showToast(res.message || `✓ Removed ${ipo.name}`);
                                  } catch (err: any) {
                                    showToast(`❌ Failed to delete ${ipo.name}: ${err.message}`);
                                  }
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete IPO"
                            >
                              <Trash size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 3: APPLICATIONS & ALLOTMENTS ── */}
            {activeTab === "applications" && (
              <div className="rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-ink uppercase tracking-wider">MEMBER APPLICATIONS & ALLOTMENTS</h2>
                    <p className="text-xs text-ink-tertiary">Review submissions and process registrar allotment results</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-line text-[10px] font-extrabold text-ink-tertiary uppercase">
                        <th className="py-2.5 px-3">Applicant Name</th>
                        <th className="py-2.5 px-3">IPO Target</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Contribution</th>
                        <th className="py-2.5 px-3">Allotment Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {filteredApps.map((app) => (
                        <tr key={app.id} className="h-12 hover:bg-surface-hover transition-colors">
                          <td className="py-2 px-3 font-bold text-ink">{app.applicantName || "Combo Group Pool"}</td>
                          <td className="py-2 px-3 text-ink-secondary font-medium">{app.ipoName}</td>
                          <td className="py-2 px-3 font-mono text-[10px]">{app.type}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-ink">
                            {formatINR(app.totalContribution)}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                app.allotmentStatus === "ALLOTTED"
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : app.allotmentStatus === "NOT_ALLOTTED"
                                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              }`}
                            >
                              {app.allotmentStatus || "AWAITING"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  updateApplicationStatus(app.ipoId, app.id, "ALLOTTED");
                                  showToast(`Marked ${app.applicantName || "App"} as ALLOTTED`);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 cursor-pointer shadow-xs"
                              >
                                Allotted
                              </button>
                              <button
                                onClick={() => {
                                  updateApplicationStatus(app.ipoId, app.id, "NOT_ALLOTTED");
                                  showToast(`Marked ${app.applicantName || "App"} as NOT ALLOTTED`);
                                }}
                                className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[11px] font-bold hover:bg-rose-500/20 cursor-pointer"
                              >
                                Not Allotted
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB 4: MEMBERS & PERMISSIONS ── */}
            {activeTab === "members" && (
              <div className="rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-ink uppercase tracking-wider">GROUP MEMBERS & ROLES</h2>
                    <p className="text-xs text-ink-tertiary">Manage participant accounts, roles, and default capital pools</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-line text-[10px] font-extrabold text-ink-tertiary uppercase">
                        <th className="py-2.5 px-3">Member</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">PAN Status</th>
                        <th className="py-2.5 px-3 text-right">Default Pool</th>
                        <th className="py-2.5 px-3 text-right">Role Privilege</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {filteredMembers.map((mem) => (
                        <tr key={mem.id} className="h-12 hover:bg-surface-hover transition-colors">
                          <td className="py-2 px-3 font-bold text-ink">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={mem.avatar || "/oggy.png"}
                                alt={mem.name}
                                className="w-6 h-6 rounded-full object-cover border border-line"
                              />
                              <span>{mem.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-ink-secondary">{mem.email}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                mem.role === "ADMIN" ? "bg-accent/10 text-accent" : "bg-surface-alt text-ink-secondary"
                              }`}
                            >
                              {mem.role}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-emerald-500 font-semibold">
                            ✓ {mem.panMasked || "ABCDE1234F"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-ink">
                            {formatINR(mem.defaultContribution || 50000)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <select
                              value={mem.role}
                              onChange={(e) => {
                                updateMember(mem.id, { role: e.target.value as MemberRole });
                                showToast(`Updated role for ${mem.name} to ${e.target.value}`);
                              }}
                              className="h-7 px-2 rounded-md bg-surface-alt border border-line text-[11px] font-semibold text-ink cursor-pointer"
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── ADD IPO DRAWER ── */}
      <AddIPODrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />
    </div>
  );
}
