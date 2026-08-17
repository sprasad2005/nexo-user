"use client";

import React from "react";
import {
  TrendUp,
  Coins,
  Users,
  ClockCountdown,
  ClockCounterClockwise,
  Plus,
  SignOut,
  ShieldCheck,
  CheckCircle,
  Files,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { useAdmin } from "../context/AdminContext";
import { AdminDataCache } from "../../lib/nexoDataCache";

interface AdminSidebarProps {
  onAddIpoClick: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOutClick?: () => void;
}

export function AdminSidebar({
  onAddIpoClick,
  activeTab,
  setActiveTab,
  onSignOutClick,
}: AdminSidebarProps) {
  const { currentUser } = useAdmin();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const mainNav = [
    { id: "ipos", label: "IPO Management", icon: TrendUp },
    { id: "history", label: "IPO History", icon: ClockCounterClockwise },
    { id: "applications", label: "Applications", icon: Files },
    { id: "allotment", label: "Allotment", icon: CheckCircle },
    { id: "distribute-profit", label: "Distribute Profit", icon: Coins },
    { id: "members", label: "Members", icon: Users },
    { id: "messages", label: "Messages", icon: ChatCircleDots },
  ];

  const secondaryNav = [
    { id: "activity", label: "Activity & Audit", icon: ClockCountdown },
    { id: "security", label: "Security", icon: ShieldCheck },
  ];

  const handlePrefetch = (id: string) => {
    if (id === "members") {
      AdminDataCache.fetchSWR(
        "admin_members_list",
        async () => {
          const res = await fetch("/api/admin/members");
          const json = await res.json();
          return json.members || [];
        },
        { ttlMs: 30000 }
      );
    } else if (id === "ipos" || id === "history") {
      AdminDataCache.fetchSWR(
        "admin_ipos",
        async () => {
          const res = await fetch("/api/ipos?admin=true");
          const json = await res.json();
          return json.ipos || [];
        },
        { ttlMs: 30000 }
      );
    } else if (id === "applications" || id === "allotment") {
      AdminDataCache.fetchSWR(
        "admin_applications",
        async () => {
          const res = await fetch("/api/applications");
          const json = await res.json();
          return json.applications || [];
        },
        { ttlMs: 30000 }
      );
    } else if (id === "activity") {
      AdminDataCache.fetchSWR(
        "admin_activities_default",
        async () => {
          const res = await fetch("/api/admin/activity?limit=50");
          const json = await res.json();
          return json.activities || [];
        },
        { ttlMs: 15000 }
      );
    } else if (id === "security") {
      AdminDataCache.fetchSWR(
        "admin_security_summary",
        async () => {
          const res = await fetch("/api/admin/security/summary");
          const json = await res.json();
          return json.summary;
        },
        { ttlMs: 30000 }
      );
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/admin/login";
  };

  return (
    <aside className="w-[240px] bg-surface border-r border-line flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none font-sans z-30 overflow-hidden">
      <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-line flex items-center justify-between shrink-0 bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-ink font-sans">NEXO</span>
            <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block shadow-2xs shadow-accent/40" />
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-4 flex-1">
          {/* MAIN MANAGEMENT */}
          <div className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  onMouseEnter={() => handlePrefetch(item.id)}
                  className={`w-full h-9 flex items-center gap-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 dark:bg-[#22262E] text-white dark:text-[#F5F7FA] border border-transparent dark:border-[#6B93FF]/30 shadow-sm"
                      : "text-slate-400 dark:text-[#AEB5C0] hover:text-slate-100 dark:hover:text-[#F5F7FA] hover:bg-slate-800/80 dark:hover:bg-[#1D2026]"
                  }`}
                >
                  <Icon size={17} className={isActive ? "text-white dark:text-[#6B93FF]" : "text-slate-400 dark:text-[#858D99]"} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-800 dark:border-[#252931] pt-3 space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  onMouseEnter={() => handlePrefetch(item.id)}
                  className={`w-full h-9 flex items-center gap-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 dark:bg-[#22262E] text-white dark:text-[#F5F7FA] border border-transparent dark:border-[#6B93FF]/30 shadow-sm"
                      : "text-slate-400 dark:text-[#AEB5C0] hover:text-slate-100 dark:hover:text-[#F5F7FA] hover:bg-slate-800/80 dark:hover:bg-[#1D2026]"
                  }`}
                >
                  <Icon size={17} className={isActive ? "text-white dark:text-[#6B93FF]" : "text-slate-400 dark:text-[#858D99]"} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* ACTION BUTTON */}
          <div className="pt-2">
            <button
              onClick={onAddIpoClick}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-500 dark:hover:bg-[#7BA0FF] text-white dark:text-[#101114] font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
            >
              <Plus size={16} weight="bold" />
              <span>Add IPO</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Admin Profile Footer */}
      <div className="p-3 border-t border-slate-800 dark:border-[#252931] bg-slate-950/50 dark:bg-[#090A0C]/50 shrink-0">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 dark:bg-[#14161A] hover:bg-slate-850 dark:hover:bg-[#1D2026] border border-slate-800 dark:border-[#252931] transition-colors">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700 dark:border-[#343943]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-white dark:text-[#F5F7FA] truncate">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-[#858D99] font-mono font-bold uppercase truncate">
                {currentUser.role === "SUPER_ADMIN" ? "SUPER ADMIN" : "ADMIN"}
              </p>
            </div>
          </div>

          <button
            title="Sign Out of Admin Console"
            onClick={onSignOutClick || handleLogout}
            className="p-1.5 rounded-lg text-slate-400 dark:text-[#858D99] hover:text-rose-400 dark:hover:text-[#FF6B6B] hover:bg-slate-800 dark:hover:bg-[#1D2026] transition-colors cursor-pointer shrink-0"
          >
            <SignOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
