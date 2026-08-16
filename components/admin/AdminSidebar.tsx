"use client";

import React from "react";
import { useNexo } from "@/context/NexoContext";
import { useRouter } from "next/navigation";
import {
  ChatCircleDots,
  ShieldCheck,
  Buildings,
  Files,
  Users,
  Receipt,
  ArrowLeft,
  SignOut,
  Plus,
  Database,
  CheckCircle,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
} from "@phosphor-icons/react";

export type AdminTab = "ipos" | "history" | "applications" | "allotments" | "members" | "transactions" | "messages";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onOpenAddIpo: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  onOpenAddIpo,
  isCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const { ipos, members, transactions, currentMember, currentUser, logout } = useNexo();
  const router = useRouter();

  const activeUser = currentUser || currentMember;
  const visibleIpos = ipos.filter((i) => !i.isHidden);
  const totalAppsCount = visibleIpos.reduce((sum, ipo) => sum + (ipo.applications?.length || 0), 0);

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  const navItems = [
    {
      group: "OPERATIONS",
      items: [
        {
          id: "ipos" as AdminTab,
          label: "IPO Catalog & Status",
          icon: Buildings,
          badge: visibleIpos.length,
        },
        {
          id: "history" as AdminTab,
          label: "IPO History Ledger",
          icon: ClockCounterClockwise,
        },
        {
          id: "applications" as AdminTab,
          label: "Applications List",
          icon: Files,
          badge: totalAppsCount,
        },
        {
          id: "allotments" as AdminTab,
          label: "Allotment Processor",
          icon: Files,
          badge: totalAppsCount,
        },
      ],
    },
    {
      group: "COMMUNITY & CAPITAL",
      items: [
        {
          id: "members" as AdminTab,
          label: "Members & Permissions",
          icon: Users,
          badge: members.length,
        },
        {
          id: "messages" as AdminTab,
          label: "Messages",
          icon: ChatCircleDots,
        },
        {
          id: "transactions" as AdminTab,
          label: "Transactions Ledger",
          icon: Receipt,
          badge: transactions.length,
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-surface border-r border-line flex flex-col justify-between transition-all duration-300 z-30 select-none shrink-0 h-screen sticky top-0 overflow-hidden ${
        isCollapsed ? "w-16 sm:w-20" : "w-64"
      }`}
    >
      {/* ── TOP HEADER / BRAND ── */}
      <div className="h-14 px-4 border-b border-line flex items-center justify-between shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-ink font-sans">NEXO</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs shadow-blue-500/40" />
          </div>
        ) : (
          <div className="w-9 h-9 mx-auto rounded-xl bg-accent-soft border border-accent/20 text-accent flex items-center justify-center font-bold">
            <ShieldCheck size={22} weight="fill" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden sm:flex p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
        </button>
      </div>

      {/* ── QUICK ADD IPO BUTTON ── */}
      <div className="p-3">
        <button
          onClick={onOpenAddIpo}
          className={`w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-extrabold text-xs transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
            isCollapsed ? "px-0" : "px-4"
          }`}
          title="Add New IPO Opportunity"
        >
          <Plus size={16} weight="bold" />
          {!isCollapsed && <span>+ Add New IPO</span>}
        </button>
      </div>

      {/* ── NAVIGATION GROUPS ── */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.group} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 text-[10px] font-extrabold text-ink-tertiary uppercase tracking-wider">
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group relative ${
                    isActive
                      ? "bg-accent-soft text-accent border border-accent/20 shadow-xs"
                      : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={item.label}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-accent rounded-r-full" />
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={18}
                      className={`shrink-0 transition-transform group-hover:scale-110 ${
                        isActive
                          ? "text-accent"
                          : "text-ink-tertiary group-hover:text-ink"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                        isActive
                          ? "bg-accent/15 text-accent"
                          : "bg-surface-alt text-ink-secondary"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── FOOTER ACTIONS & ADMIN PROFILE ── */}
      <div className="p-3 border-t border-line space-y-2 bg-surface-alt/40">
        {/* Return to User Site Button */}
        <a
          href="/"
          className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
          title="Return to User Website"
        >
          <ArrowLeft size={16} className="shrink-0" />
          {!isCollapsed && <span>User Dashboard</span>}
        </a>

        {/* Logged in Admin Info Card */}
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-surface border border-line flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={activeUser?.avatar || "/oggy.png"}
                alt={activeUser?.name || "Admin"}
                className="w-7 h-7 rounded-full object-cover border border-line shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold text-ink truncate">
                  {activeUser?.name || "Ankit"}
                </h4>
                <span className="text-[9px] font-mono text-purple-600 dark:text-[#A78BFA] bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded uppercase border border-purple-200 dark:border-purple-800 font-extrabold">
                  SUPER ADMIN
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Sign Out of Admin Console"
            >
              <SignOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <SignOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
