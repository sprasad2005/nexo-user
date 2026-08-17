"use client";

import React, { useState } from "react";
import { useNexo } from "@/context/NexoContext";
import { AdminTab, AdminPriorityItem, SecurityEvent } from "../types/admin";
import { formatINR } from "@/lib/mockData";
import {
  Buildings,
  Files,
  Users,
  CheckCircle,
  Briefcase,
  Receipt,
  ChatCircleText,
  Pulse as ActivityIcon,
  ShieldCheck,
  TrendUp,
  Clock,
  ArrowUpRight,
  WarningCircle,
  Plus,
  UserPlus,
  ArrowsClockwise,
  MagnifyingGlass,
  ArrowSquareOut,
} from "@phosphor-icons/react";

interface AdminDashboardProps {
  onSelectTab: (tab: AdminTab) => void;
  onOpenAddIpo: () => void;
  onOpenAddMember: () => void;
}

export function AdminDashboard({
  onSelectTab,
  onOpenAddIpo,
  onOpenAddMember,
}: AdminDashboardProps) {
  const nexoContext = useNexo() as any;
  const {
    ipos,
    members,
    transactions,
    portfolioSummary,
    activities,
    conversations,
    currentMember,
    currentUser,
  } = nexoContext;

  const [timeframe, setTimeframe] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("1M");
  const [lastRefreshed, setLastRefreshed] = useState<string>("Just now");

  const activeUser = currentUser || currentMember;
  const adminName = activeUser?.name || "Niranjan";

  // Financial metrics from backend or calculated fallback
  const totalCapital = portfolioSummary?.totalCapital || 284500;
  const capitalDeployed = portfolioSummary?.capitalDeployed || 184500;
  const currentlyBlocked = portfolioSummary?.currentlyBlocked || 72000;
  const availableCapital = portfolioSummary?.availableCapital || 100000;
  const committedCapital = currentlyBlocked + capitalDeployed;
  const realizedPnL = portfolioSummary?.realizedPnL || 18400;
  const unrealizedPnL = portfolioSummary?.unrealizedPnL || 7250;
  const totalReturn = portfolioSummary?.totalReturn || 25650;
  const totalReturnPercent = portfolioSummary?.totalReturnPercent || 8.91;

  // Operational Counts
  const visibleIpos = (ipos || []).filter((i: any) => !i.isHidden);
  const activeIposCount = visibleIpos.filter((i: any) =>
    ["APPLYING", "APPLICATION_OPEN", "APPLIED", "ALLOTMENT_PENDING"].includes(i.status)
  ).length || 6;
  
  const allApplications = visibleIpos.flatMap((i: any) => i.applications || []);
  const applicationsCount = allApplications.length || 12;
  const pendingAllotmentsCount = visibleIpos.filter((i: any) => i.status === "ALLOTMENT_PENDING").length || 2;
  const holdingsCount = visibleIpos.filter((i: any) => i.status === "HOLDING").length || 7;
  const unreadMessagesCount = (conversations as any[])?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) || 0;

  // Admin Priorities Data
  const adminPriorities: AdminPriorityItem[] = [
    {
      id: "prio_1",
      level: "URGENT",
      title: "Application proof missing",
      subtitle: "Dhoot Transmission • Niranjan",
      ipoName: "Dhoot Transmission",
      memberName: "Niranjan",
      ctaLabel: "Review →",
      targetTab: "applications",
      actionType: "PROOF",
    },
    {
      id: "prio_2",
      level: "URGENT",
      title: "Allotment update required",
      subtitle: "Arclight Manufacturing • 3 participants",
      ipoName: "Arclight Manufacturing",
      ctaLabel: "Update →",
      targetTab: "allotments",
      actionType: "ALLOTMENT",
    },
    {
      id: "prio_3",
      level: "PENDING",
      title: "Member verification pending",
      subtitle: "Aditya • KYC & PAN review",
      memberName: "Aditya",
      ctaLabel: "Review →",
      targetTab: "members",
      actionType: "VERIFICATION",
    },
    {
      id: "prio_4",
      level: "INFO",
      title: "Current price not updated",
      subtitle: "Nova Consumer • Holding position",
      ipoName: "Nova Consumer",
      ctaLabel: "Update →",
      targetTab: "holdings",
      actionType: "PRICE",
    },
  ];

  // Security Feed Data
  const securityEvents: SecurityEvent[] = [
    {
      id: "sec_1",
      type: "LOGIN",
      title: "Admin login",
      actor: adminName,
      timestamp: "2m ago",
      status: "SUCCESS",
    },
    {
      id: "sec_2",
      type: "SESSION_REVOKED",
      title: "Session revoked",
      actor: "Chrome • Windows",
      timestamp: "1h ago",
      status: "WARNING",
    },
    {
      id: "sec_3",
      type: "PASSWORD_CHANGE",
      title: "Password changed",
      actor: "Ashay",
      timestamp: "Yesterday",
      status: "SUCCESS",
    },
  ];

  const handleRefresh = () => {
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setLastRefreshed(`Today at ${time}`);
  };

  return (
    <div className="space-y-6 font-sans text-ink pb-12 select-none">
      {/* ── ROW 1: GREETING & QUICK ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Good afternoon, {adminName}.
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-mono font-bold border border-accent/20">
              ADMIN
            </span>
          </div>
          <p className="text-xs text-ink-secondary mt-0.5">
            Your NEXO operations at a glance.
          </p>
        </div>

        {/* Quick Actions Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenAddIpo}
            className="h-8.5 px-3 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Plus size={14} weight="bold" />
            <span>Add IPO</span>
          </button>
          <button
            onClick={onOpenAddMember}
            className="h-8.5 px-3 rounded-lg bg-surface hover:bg-surface-hover border border-line text-ink text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Add Member</span>
          </button>
          <button
            onClick={() => onSelectTab("applications")}
            className="h-8.5 px-3 rounded-lg bg-surface hover:bg-surface-hover border border-line text-ink-secondary hover:text-ink text-xs font-medium transition-all cursor-pointer"
          >
            Review Applications
          </button>
          <button
            onClick={() => onSelectTab("allotments")}
            className="h-8.5 px-3 rounded-lg bg-surface hover:bg-surface-hover border border-line text-ink-secondary hover:text-ink text-xs font-medium transition-all cursor-pointer"
          >
            Update Allotment
          </button>
          <button
            onClick={handleRefresh}
            className="h-8.5 p-2 rounded-lg bg-surface hover:bg-surface-hover border border-line text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
            title={`Refresh data (Last updated: ${lastRefreshed})`}
          >
            <ArrowsClockwise size={14} />
          </button>
        </div>
      </div>

      {/* ── ROW 2: PRIMARY ADMIN METRICS (COHESIVE SURFACE) ── */}
      <div className="rounded-2xl bg-surface border border-line p-4 sm:p-5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-line/60">
          <div className="pt-2 sm:pt-0 sm:px-2">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block">
              ACTIVE IPOs
            </span>
            <div className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1 font-mono tabular-nums">
              {activeIposCount}
            </div>
            <span className="text-[10px] text-emerald-500 font-semibold mt-0.5 block">● 3 Open Now</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block">
              APPLICATIONS
            </span>
            <div className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1 font-mono tabular-nums">
              {applicationsCount}
            </div>
            <span className="text-[10px] text-ink-tertiary font-medium mt-0.5 block">10 Verified</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block">
              MEMBERS
            </span>
            <div className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1 font-mono tabular-nums">
              {members?.length || 5}
            </div>
            <span className="text-[10px] text-ink-tertiary font-medium mt-0.5 block">3 Admins • 2 Members</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block">
              COMMITTED
            </span>
            <div className="text-lg sm:text-xl font-bold text-ink tracking-tight mt-1 font-mono tabular-nums">
              {formatINR(committedCapital)}
            </div>
            <span className="text-[10px] text-accent font-medium mt-0.5 block">Group Capital</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block">
              INVESTED
            </span>
            <div className="text-lg sm:text-xl font-bold text-ink tracking-tight mt-1 font-mono tabular-nums">
              {formatINR(capitalDeployed)}
            </div>
            <span className="text-[10px] text-ink-tertiary font-medium mt-0.5 block">Active Holdings</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block">
              ALLOTMENT PENDING
            </span>
            <div className="text-xl sm:text-2xl font-bold text-amber-500 tracking-tight mt-1 font-mono tabular-nums">
              {pendingAllotmentsCount}
            </div>
            <span className="text-[10px] text-amber-500 font-semibold mt-0.5 block">Action Required</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block">
              HOLDINGS
            </span>
            <div className="text-xl sm:text-2xl font-bold text-ink tracking-tight mt-1 font-mono tabular-nums">
              {holdingsCount}
            </div>
            <span className="text-[10px] text-emerald-500 font-semibold mt-0.5 block">+11.42% P&L</span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider block">
              UNREAD
            </span>
            <div className="text-xl sm:text-2xl font-bold text-accent tracking-tight mt-1 font-mono tabular-nums">
              {unreadMessagesCount}
            </div>
            <span className="text-[10px] text-accent font-medium mt-0.5 block">Messages</span>
          </div>
        </div>
      </div>

      {/* ── ROW 3: FINANCIAL OVERVIEW (8 COLS) + ADMIN PRIORITIES (4 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FINANCIAL SUMMARY */}
        <div className="lg:col-span-8 rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">GROUP CAPITAL & P&L</h2>
              <p className="text-xs text-ink-tertiary">Real-time group capital deployment & performance</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              +{totalReturnPercent}% TOTAL RETURN
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="p-3 rounded-xl bg-surface-alt/60 border border-line">
              <span className="text-[10px] font-semibold text-ink-tertiary uppercase block">Total Tracked</span>
              <span className="text-base font-bold text-ink font-mono tabular-nums block mt-1">
                {formatINR(totalCapital)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-alt/60 border border-line">
              <span className="text-[10px] font-semibold text-ink-tertiary uppercase block">Committed</span>
              <span className="text-base font-bold text-ink font-mono tabular-nums block mt-1">
                {formatINR(committedCapital)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-alt/60 border border-line">
              <span className="text-[10px] font-semibold text-ink-tertiary uppercase block">Blocked</span>
              <span className="text-base font-bold text-amber-500 font-mono tabular-nums block mt-1">
                {formatINR(currentlyBlocked)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-alt/60 border border-line">
              <span className="text-[10px] font-semibold text-ink-tertiary uppercase block">Invested</span>
              <span className="text-base font-bold text-ink font-mono tabular-nums block mt-1">
                {formatINR(capitalDeployed)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-line/60">
            <div>
              <span className="text-[11px] font-medium text-ink-tertiary">Realized P&L</span>
              <span className="text-sm font-bold text-emerald-500 font-mono tabular-nums block mt-0.5">
                +{formatINR(realizedPnL)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-ink-tertiary">Unrealized P&L</span>
              <span className="text-sm font-bold text-emerald-500 font-mono tabular-nums block mt-0.5">
                +{formatINR(unrealizedPnL)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-ink-tertiary">Total Net Return</span>
              <span className="text-sm font-bold text-emerald-500 font-mono tabular-nums block mt-0.5">
                +{formatINR(totalReturn)}
              </span>
            </div>
          </div>
        </div>

        {/* ADMIN PRIORITIES */}
        <div className="lg:col-span-4 rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2">
              <WarningCircle size={18} className="text-amber-500" weight="fill" />
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">ADMIN PRIORITIES</h2>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              4 ACTION ITEMS
            </span>
          </div>

          <div className="space-y-2">
            {adminPriorities.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-surface-alt/70 border border-line hover:border-accent/40 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.level === "URGENT"
                          ? "bg-rose-500 animate-pulse"
                          : item.level === "PENDING"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <h4 className="text-xs font-bold text-ink truncate group-hover:text-accent transition-colors">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-ink-tertiary truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>

                <button
                  onClick={() => item.targetTab && onSelectTab(item.targetTab)}
                  className="px-2 py-1 rounded-md bg-surface border border-line text-[11px] font-semibold text-accent hover:bg-accent hover:text-white transition-all shrink-0 cursor-pointer"
                >
                  {item.ctaLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 4: IPO OPERATIONS TABLE (12 COLS) ── */}
      <div className="rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">IPO OPERATIONS</h2>
            <p className="text-xs text-ink-tertiary">Active catalog, lifecycle status & applications summary</p>
          </div>
          <button
            onClick={() => onSelectTab("ipos")}
            className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Manage All IPOs</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-line text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
                <th className="py-2.5 px-3">IPO</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">DECISION</th>
                <th className="py-2.5 px-3 text-right">APPLICATIONS</th>
                <th className="py-2.5 px-3 text-right">CAPITAL</th>
                <th className="py-2.5 px-3">DEADLINE</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {visibleIpos.slice(0, 5).map((ipo: any) => (
                <tr key={ipo.id} className="h-11 hover:bg-surface-hover transition-colors">
                  <td className="py-2 px-3 font-semibold text-ink">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-accent/10 border border-accent/20 text-accent font-bold text-[10px] flex items-center justify-center shrink-0">
                        {ipo.logo || ipo.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-ink block leading-none">{ipo.name}</span>
                        <span className="text-[10px] text-ink-tertiary font-normal">{ipo.category || "Mainboard"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        ipo.status === "APPLYING" || ipo.status === "APPLICATION_OPEN"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : ipo.status === "ALLOTMENT_PENDING"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : ipo.status === "HOLDING" || ipo.status === "LISTED"
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          : "bg-surface-alt text-ink-tertiary border border-line"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {ipo.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        ipo.recommendation === "APPLY"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : ipo.recommendation === "WATCH"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {ipo.recommendation}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-ink">
                    {ipo.applications?.length || 0}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-ink">
                    {formatINR(ipo.combinedCapital || 120000)}
                  </td>
                  <td className="py-2 px-3 text-ink-secondary">
                    {ipo.metrics?.closeDate || "14 Aug"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => onSelectTab("ipos")}
                      className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                    >
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ROW 5: RECENT APPLICATIONS (7 COLS) + ALLOTMENT CENTER (5 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RECENT APPLICATIONS */}
        <div className="lg:col-span-7 rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">RECENT APPLICATIONS</h2>
              <p className="text-xs text-ink-tertiary">Group member IPO submissions ledger</p>
            </div>
            <button
              onClick={() => onSelectTab("applications")}
              className="text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              View Applications →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-line text-[11px] font-bold text-ink-tertiary uppercase">
                  <th className="py-2 px-2">Applicant</th>
                  <th className="py-2 px-2">IPO</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2 text-right">Contribution</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                <tr className="h-10 hover:bg-surface-hover">
                  <td className="py-2 px-2 font-semibold text-ink">Niranjan</td>
                  <td className="py-2 px-2 text-ink-secondary">Dhoot Transmission</td>
                  <td className="py-2 px-2"><span className="text-[10px] font-mono px-1 rounded bg-surface-alt border border-line">Combo</span></td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-ink">{formatINR(40000)}</td>
                  <td className="py-2 px-2 text-emerald-500 font-semibold">Applied</td>
                </tr>
                <tr className="h-10 hover:bg-surface-hover">
                  <td className="py-2 px-2 font-semibold text-ink">Ashay</td>
                  <td className="py-2 px-2 text-ink-secondary">Dhoot Transmission</td>
                  <td className="py-2 px-2"><span className="text-[10px] font-mono px-1 rounded bg-surface-alt border border-line">Combo</span></td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-ink">{formatINR(50000)}</td>
                  <td className="py-2 px-2 text-emerald-500 font-semibold">Applied</td>
                </tr>
                <tr className="h-10 hover:bg-surface-hover">
                  <td className="py-2 px-2 font-semibold text-ink">Priya</td>
                  <td className="py-2 px-2 text-ink-secondary">Hexaware Tech</td>
                  <td className="py-2 px-2"><span className="text-[10px] font-mono px-1 rounded bg-surface-alt border border-line">Combo</span></td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-ink">{formatINR(60000)}</td>
                  <td className="py-2 px-2 text-amber-500 font-semibold">Verification</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* APPLICATION HEALTH VISUALIZATION */}
          <div className="pt-3 border-t border-line/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">APPLICATION HEALTH</span>
              <span className="font-mono text-ink-tertiary">10 Complete • 2 Pending</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-alt overflow-hidden flex">
              <div className="h-full bg-emerald-500 w-[83%]" title="10 Complete" />
              <div className="h-full bg-amber-500 w-[17%]" title="2 Pending" />
            </div>
          </div>
        </div>

        {/* ALLOTMENT CENTER */}
        <div className="lg:col-span-5 rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">ALLOTMENT CENTER</h2>
              <p className="text-xs text-ink-tertiary">Registrar updates & allotment declarations</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              2 AWAITING
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-surface-alt/70 border border-line flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-ink">Dhoot Transmission</h4>
                <p className="text-[10px] text-amber-500 font-semibold mt-0.5">Result available on registrar portal</p>
              </div>
              <button
                onClick={() => onSelectTab("allotments")}
                className="px-2.5 py-1 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 cursor-pointer"
              >
                Update →
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt/70 border border-line flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-ink">Hexaware Tech</h4>
                <p className="text-[10px] text-ink-tertiary mt-0.5">Allotment expected 13 Aug</p>
              </div>
              <button
                onClick={() => onSelectTab("allotments")}
                className="px-2.5 py-1 rounded-lg bg-surface border border-line text-ink text-xs font-semibold hover:bg-surface-hover cursor-pointer"
              >
                View →
              </button>
            </div>
          </div>

          {/* CAPITAL CONTROL SEGMENTED BAR */}
          <div className="pt-3 border-t border-line/60 space-y-2">
            <span className="text-xs font-bold text-ink block">CAPITAL OVERVIEW</span>
            <div className="w-full h-3 rounded-lg bg-surface-alt overflow-hidden flex">
              <div className="h-full bg-accent w-[45%]" title="Committed ₹2,65,000" />
              <div className="h-full bg-amber-500 w-[25%]" title="Blocked ₹72,000" />
              <div className="h-full bg-emerald-500 w-[30%]" title="Available ₹1,00,000" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-ink-tertiary font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Committed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Blocked</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 6: PORTFOLIO PERFORMANCE CHART (8 COLS) + MEMBERS & RECENT ACTIVITY (4 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PORTFOLIO PERFORMANCE CHART */}
        <div className="lg:col-span-8 rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider">GROUP PORTFOLIO PERFORMANCE</h2>
              <p className="text-xs text-ink-tertiary">Group returns performance trajectory</p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-alt border border-line">
              {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors ${
                    timeframe === t
                      ? "bg-accent text-white"
                      : "text-ink-tertiary hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold text-ink font-mono tracking-tight tabular-nums">
              {formatINR(212400)}
            </div>
            <span className="text-xs font-semibold text-emerald-500 block">
              +₹25,650 (+8.91% Total Return)
            </span>
          </div>

          {/* Clean minimal SVG Chart */}
          <div className="h-44 w-full pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F6BFF" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2F6BFF" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" className="text-line" strokeDasharray="3 3" opacity="0.4" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="currentColor" className="text-line" strokeDasharray="3 3" opacity="0.4" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="currentColor" className="text-line" strokeDasharray="3 3" opacity="0.4" />

              {/* Area */}
              <polygon
                points="0,110 0,90 80,85 160,60 240,65 320,40 400,35 500,15 500,110"
                fill="url(#chartGrad)"
              />
              {/* Line */}
              <polyline
                fill="none"
                stroke="#2F6BFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,90 80,85 160,60 240,65 320,40 400,35 500,15"
              />
              {/* Current Point Dot */}
              <circle cx="500" cy="15" r="4.5" fill="#2F6BFF" className="animate-pulse" />
            </svg>
          </div>
        </div>

        {/* MEMBERS OVERVIEW & RECENT ACTIVITY */}
        <div className="lg:col-span-4 space-y-6">
          {/* MEMBERS OVERVIEW */}
          <div className="rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">MEMBER STATUS</h2>
              <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                5 VERIFIED
              </span>
            </div>

            <div className="space-y-2">
              {(members || []).slice(0, 3).map((mem: any) => (
                <div key={mem.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <img src={mem.avatar || "/oggy.png"} alt={mem.name} className="w-5 h-5 rounded-full object-cover border border-line" />
                    <span className="font-bold text-ink">{mem.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-ink-tertiary">{mem.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div className="rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">RECENT ACTIVITY</h2>
              <button onClick={() => onSelectTab("activity")} className="text-[10px] text-accent hover:underline">
                View All →
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-ink leading-tight">Niranjan updated Dhoot Transmission</p>
                  <span className="text-[10px] text-ink-tertiary">12m ago</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-ink leading-tight">Ashay joined combo application</p>
                  <span className="text-[10px] text-ink-tertiary">27m ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 7: MESSAGES PREVIEW (6 COLS) + SECURITY FEED (6 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MESSAGES PREVIEW */}
        <div className="lg:col-span-6 rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
            <div className="flex items-center gap-2">
              <ChatCircleText size={18} className="text-accent" />
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">MESSAGES PREVIEW</h2>
            </div>
            <button onClick={() => onSelectTab("messages")} className="text-[10px] font-bold text-accent hover:underline">
              Open Messages →
            </button>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-surface-alt/60 border border-line flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-ink">Dhoot Transmission Pool</span>
                <p className="text-[11px] text-ink-secondary truncate">&quot;Application submitted ✓&quot;</p>
              </div>
              <span className="text-[10px] font-mono text-ink-tertiary">2m ago</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-alt/60 border border-line flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-ink">Niranjan</span>
                <p className="text-[11px] text-ink-secondary truncate">&quot;Let&apos;s discuss the lot size.&quot;</p>
              </div>
              <span className="text-[10px] font-mono text-ink-tertiary">14m ago</span>
            </div>
          </div>
        </div>

        {/* SECURITY ACTIVITY */}
        <div className="lg:col-span-6 rounded-2xl bg-surface border border-line p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" weight="fill" />
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">SECURITY & AUDIT</h2>
            </div>
            <button onClick={() => onSelectTab("security")} className="text-[10px] font-bold text-accent hover:underline">
              View Security →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {securityEvents.map((sec) => (
              <div key={sec.id} className="p-2 rounded-xl bg-surface-alt/40 border border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-bold text-ink block leading-none">{sec.title}</span>
                    <span className="text-[10px] text-ink-tertiary mt-0.5 block">{sec.actor}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-ink-tertiary">{sec.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
