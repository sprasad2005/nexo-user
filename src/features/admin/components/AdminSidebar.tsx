"use client";

import React from "react";
import { useNexo } from "@/context/NexoContext";
import { useRouter } from "next/navigation";
import { AdminTab } from "../types/admin";
import {
  SquaresFour,
  Buildings,
  Files,
  CheckCircle,
  Briefcase,
  Receipt,
  Users,
  ChatCircleText,
  Pulse as Activity,
  ShieldCheck,
  Gear,
  Plus,
  CaretLeft,
  CaretRight,
  ArrowSquareOut,
  SignOut,
} from "@phosphor-icons/react";

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
  const nexoContext = useNexo() as any;
  const { ipos, members, transactions, currentMember, currentUser, logout } = nexoContext;
  const router = useRouter();

  const activeUser = currentUser || currentMember;
  const visibleIpos = (ipos || []).filter((i: any) => !i.isHidden);
  const totalAppsCount = visibleIpos.reduce((sum: number, ipo: any) => sum + (ipo.applications?.length || 0), 0);

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  const navGroups = [
    {
      label: "OVERVIEW",
      items: [
        {
          id: "dashboard" as AdminTab,
          label: "Dashboard",
          icon: SquaresFour,
        },
      ],
    },
    {
      label: "WORKSPACE",
      items: [
        {
          id: "ipos" as AdminTab,
          label: "IPO Management",
          icon: Buildings,
          badge: visibleIpos.length,
        },
        {
          id: "applications" as AdminTab,
          label: "Applications",
          icon: Files,
          badge: totalAppsCount,
        },
        {
          id: "allotments" as AdminTab,
          label: "Allotments",
          icon: CheckCircle,
          badge: 2,
        },
        {
          id: "holdings" as AdminTab,
          label: "Holdings",
          icon: Briefcase,
          badge: visibleIpos.filter((i: any) => i.status === "HOLDING").length || 7,
        },
        {
          id: "transactions" as AdminTab,
          label: "Transactions",
          icon: Receipt,
          badge: transactions?.length || 0,
        },
      ],
    },
    {
      label: "PEOPLE",
      items: [
        {
          id: "members" as AdminTab,
          label: "Members",
          icon: Users,
          badge: members?.length || 0,
        },
      ],
    },
    {
      label: "COMMUNICATION",
      items: [
        {
          id: "messages" as AdminTab,
          label: "Messages",
          icon: ChatCircleText,
          badge: 3,
        },
        {
          id: "activity" as AdminTab,
          label: "Activity",
          icon: Activity,
        },
      ],
    },
    {
      label: "SYSTEM",
      items: [
        {
          id: "security" as AdminTab,
          label: "Security",
          icon: ShieldCheck,
        },
        {
          id: "settings" as AdminTab,
          label: "Settings",
          icon: Gear,
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-surface border-r border-line flex flex-col justify-between transition-all duration-200 z-30 select-none shrink-0 font-sans h-screen sticky top-0 overflow-hidden ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* BRAND & HEADER */}
      <div className="h-14 px-3.5 border-b border-line flex items-center justify-between shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center font-black text-xs shrink-0">
              NX
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-ink tracking-tight truncate">NEXO</span>
                <span className="text-[10px] font-mono font-bold text-ink-tertiary">OPS</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center font-black text-xs">
            NX
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <CaretRight size={15} /> : <CaretLeft size={15} />}
        </button>
      </div>

      {/* QUICK ADD IPO BUTTON */}
      <div className="p-3 border-b border-line/40">
        <button
          onClick={onOpenAddIpo}
          className={`w-full h-9 rounded-lg bg-accent hover:bg-accent/90 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
            isCollapsed ? "px-0" : "px-3"
          }`}
          title="Add New IPO Opportunity"
        >
          <Plus size={16} weight="bold" />
          {!isCollapsed && <span>Add IPO</span>}
        </button>
      </div>

      {/* NAVIGATION GROUPS */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-2 py-1 text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 h-8.5 rounded-md text-xs font-semibold transition-colors cursor-pointer group relative ${
                    isActive
                      ? "bg-[#EEF4FF] dark:bg-[#22262E] text-[#2457D6] dark:text-[#F5F7FA]"
                      : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={item.label}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={16}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? "text-[#5B8CFF]"
                          : "text-ink-tertiary group-hover:text-ink"
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate text-[13px]">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold transition-colors ${
                        isActive
                          ? "bg-[#5B8CFF]/15 text-[#5B8CFF]"
                          : "bg-surface-alt text-ink-tertiary"
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

      {/* FOOTER ACTIONS & ADMIN PROFILE */}
      <div className="p-2.5 border-t border-line space-y-1.5 bg-surface-alt/30">
        {/* Switch to User Workspace */}
        <a
          href="/"
          className={`w-full flex items-center gap-2 px-2.5 h-8 rounded-md text-xs font-semibold text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
          title="Open User Workspace"
        >
          <ArrowSquareOut size={14} className="shrink-0 text-accent" weight="bold" />
          {!isCollapsed && <span className="truncate text-accent font-bold">User Workspace</span>}
        </a>

        {/* Admin Profile Pill */}
        {!isCollapsed ? (
          <div className="p-2 rounded-lg bg-surface border border-line flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={activeUser?.avatar || "/oggy.png"}
                alt={activeUser?.name || "Admin"}
                className="w-6 h-6 rounded-full object-cover border border-line shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-ink truncate leading-none">
                  {activeUser?.name || "Niranjan"}
                </h4>
                <span className="text-[10px] text-ink-tertiary leading-tight block truncate mt-0.5">
                  {activeUser?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <SignOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <SignOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
