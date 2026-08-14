"use client";

import React from "react";
import { 
  ShieldCheck, ShieldWarning, Monitor, 
  SignIn, Warning, Prohibit, Key, Info, ArrowClockwise
} from "@phosphor-icons/react";

interface Alert {
  id: string;
  severity: "WARNING" | "CRITICAL" | "INFO";
  title: string;
  desc: string;
}

interface SummaryData {
  activeSessions: number;
  activeAdmins: number;
  activeMembers: number;
  loginsToday: number;
  failedLogins: number;
  suspendedAccounts: number;
  passwordChangesRequired: number;
  recentSecurityEvents: number;
  alerts: Alert[];
}

interface Props {
  summary: SummaryData | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export function SecuritySummary({ summary, onRefresh, isLoading }: Props) {
  const activeSess = summary?.activeSessions ?? "—";
  const logins = summary?.loginsToday ?? "—";
  const failures = summary?.failedLogins ?? "—";
  const suspended = summary?.suspendedAccounts ?? "—";

  const cards = [
    {
      label: "Active Sessions",
      value: activeSess,
      sub: `${summary?.activeAdmins ?? 0} admins · ${summary?.activeMembers ?? 0} members`,
      icon: Monitor,
      color: "text-blue-600 dark:text-[#6B93FF]",
      bg: "bg-blue-50 dark:bg-[#17233D]",
    },
    {
      label: "Logins Today",
      value: logins,
      sub: "successful sign-ins",
      icon: SignIn,
      color: "text-emerald-600 dark:text-[#32C98B]",
      bg: "bg-emerald-50 dark:bg-[#102C22]",
    },
    {
      label: "Failed Attempts",
      value: failures,
      sub: "requires monitoring",
      icon: Warning,
      color: Number(failures) > 0 ? "text-rose-600 dark:text-[#FF6B6B]" : "text-slate-400 dark:text-[#626A75]",
      bg: Number(failures) > 0 ? "bg-rose-50 dark:bg-[#32191B]" : "bg-slate-50 dark:bg-[#1A1D24]",
    },
    {
      label: "Suspended Accounts",
      value: suspended,
      sub: "restricted access",
      icon: Prohibit,
      color: Number(suspended) > 0 ? "text-amber-500 dark:text-[#F3B85B]" : "text-slate-400 dark:text-[#626A75]",
      bg: Number(suspended) > 0 ? "bg-amber-50 dark:bg-[#302714]" : "bg-slate-50 dark:bg-[#1A1D24]",
    },
  ];

  return (
    <div className="select-none">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider truncate">
                {label}
              </span>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={color} weight="bold" />
              </div>
            </div>

            <div>
              <span className="text-2xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight block">
                {value}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-[#858D99] block mt-0.5 truncate">
                {sub}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecurityHealth({ summary, isLoading }: { summary: SummaryData | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 shadow-sm animate-pulse flex items-center justify-between">
        <div className="w-1/3 h-5 bg-slate-105 dark:bg-[#1C2026] rounded"></div>
        <div className="w-16 h-5 bg-slate-105 dark:bg-[#1C2026] rounded"></div>
      </div>
    );
  }

  const criticalAlerts = summary?.alerts.filter(a => a.severity === "CRITICAL").length ?? 0;
  const warningAlerts = summary?.alerts.filter(a => a.severity === "WARNING").length ?? 0;

  let healthStatus: "HEALTHY" | "ATTENTION" | "WARNING" | "CRITICAL" = "HEALTHY";
  let label = "HEALTHY";
  let colorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  let desc = "Overall authentication and credentials are secure.";
  let HealthIcon = ShieldCheck;

  if (criticalAlerts > 0) {
    healthStatus = "CRITICAL";
    label = "CRITICAL";
    colorClass = "text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse";
    desc = "Critical configuration or administrative actions require immediate check.";
    HealthIcon = ShieldWarning;
  } else if (warningAlerts > 0 || (summary?.failedLogins ?? 0) > 2) {
    healthStatus = "WARNING";
    label = "WARNING";
    colorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    desc = "Elevated failures or system status parameters require oversight.";
    HealthIcon = ShieldWarning;
  } else if ((summary?.passwordChangesRequired ?? 0) > 0) {
    healthStatus = "ATTENTION";
    label = "ATTENTION";
    colorClass = "text-blue-500 bg-blue-500/10 border-blue-500/20";
    desc = "Some accounts require password setup changes.";
    HealthIcon = ShieldCheck;
  }

  return (
    <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 flex items-center justify-between shadow-2xs select-none">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colorClass.split(" ")[0]} bg-slate-50 dark:bg-[#1A1D24] shrink-0`}>
          <HealthIcon size={18} weight="bold" />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-800 dark:text-[#F5F7FA]">Security Health</h3>
          <p className="text-[10px] text-slate-400 dark:text-[#626A75] mt-0.5">{desc}</p>
        </div>
      </div>
      <span className={`px-2.5 py-1 text-[9px] font-mono font-black border rounded-full ${colorClass}`}>
        {label}
      </span>
    </div>
  );
}

export function SecurityAlerts({ summary, onNavigate }: { summary: SummaryData | null; onNavigate: (memberId: string) => void }) {
  const alerts = summary?.alerts || [];

  if (alerts.length === 0) {
    return (
      <div className="p-4 bg-slate-50/50 dark:bg-[#14161A]/40 border border-dashed border-slate-200 dark:border-[#252931] rounded-2xl text-center select-none text-xs text-slate-400 font-medium">
        ✓ All authentication &amp; security parameters are operating normally. No security alerts require attention.
      </div>
    );
  }

  return (
    <div className="space-y-2 select-none">
      <h3 className="text-[10px] font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">
        Requires Attention ({alerts.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors ${
              alert.severity === "CRITICAL"
                ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/25"
                : alert.severity === "WARNING"
                ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/25"
                : "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/25"
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              alert.severity === "CRITICAL"
                ? "text-rose-500 bg-rose-500/15"
                : alert.severity === "WARNING"
                ? "text-amber-500 bg-amber-500/15"
                : "text-blue-500 bg-blue-500/15"
            }`}>
              <Info size={16} weight="bold" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-slate-900 dark:text-[#F5F7FA] leading-tight">{alert.title}</h4>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-[#858D99] mt-1 leading-relaxed">{alert.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
