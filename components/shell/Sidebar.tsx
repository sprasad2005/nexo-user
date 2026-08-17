"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useNexo } from "@/context/NexoContext";
import {
  SquaresFour,
  TrendUp,
  Files,
  ChartPie,
  Users,
  DotsThree,
  CaretUp,
  ChatCircleDots,
  ShieldCheck,
} from "@phosphor-icons/react";
import { MoreDrawer } from "./MoreDrawer";
import { ProfileAvatar } from "../profile/ProfileAvatar";
import { ProfilePopover } from "../profile/ProfilePopover";
import { KeyboardShortcutsModal } from "../profile/KeyboardShortcutsModal";

export function Sidebar() {
  const { activeTab, setActiveTab, members, ipos, currentUser: sessionUser, unreadMessageCount, isSidebarCollapsed } = useNexo();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(230);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(230);

  const MIN_WIDTH = 180;
  const MAX_WIDTH = 480;

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - dragStartX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [sidebarWidth]);

  const activeUser = sessionUser || members[0];

  const workspaceNav: { id: string; label: string; icon: any; badge?: number }[] = [
    { id: "dashboard", label: "Home", icon: SquaresFour },
    { id: "ipos", label: "IPO Workspace", icon: TrendUp },
    { id: "applications", label: "Applications", icon: Files },
    { id: "portfolio", label: "Portfolio", icon: ChartPie },
    { id: "messages", label: "Messages", icon: ChatCircleDots, badge: unreadMessageCount },
  ];

  const groupNav: { id: string; label: string; icon: any; badge?: number }[] = [
    { id: "members", label: "Group Members", icon: Users, badge: members.length },
  ];

  const mobileNav: { id: string; label: string; icon: any; badge?: number }[] = [
    { id: "dashboard", label: "Home", icon: SquaresFour },
    { id: "ipos", label: "IPOs", icon: TrendUp },
    { id: "applications", label: "Apps", icon: Files },
    { id: "portfolio", label: "Portfolio", icon: ChartPie },
    { id: "more", label: "More", icon: DotsThree },
  ];

  const adminMember = activeUser || members[0];
  return (
    <>
      {/* DESKTOP SIDEBAR (Visible on lg screens >= 1024px) */}
      <aside
        className={`hidden lg:flex bg-surface border-r border-line flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30 font-sans overflow-hidden relative ${
          isSidebarCollapsed ? "w-[60px] items-center" : ""
        }`}
        style={isSidebarCollapsed ? undefined : { width: sidebarWidth, transition: isDragging.current ? "none" : "width 0.3s ease" }}
      >
        {isSidebarCollapsed ? (
          /* ── COLLAPSED: icon-only rail ── */
          <>
            <div className="w-full flex flex-col items-center gap-5 pt-2">
              {/* Logo */}
              <div className="h-14 flex items-center justify-center gap-1 font-black text-ink text-sm">
                N<span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              </div>

              {/* Workspace icons */}
              <div className="space-y-2">
                {workspaceNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      title={item.label}
                      className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isActive ? "bg-accent-soft text-accent" : "text-ink-tertiary hover:bg-surface-hover hover:text-ink"
                      }`}
                    >
                      <Icon size={20} />
                      {item.badge !== undefined && (item.badge as number) > 0 && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="w-8 border-t border-line" />

              {/* Community icons */}
              <div className="space-y-2">
                {groupNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      title={item.label}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isActive ? "bg-accent-soft text-accent" : "text-ink-tertiary hover:bg-surface-hover hover:text-ink"
                      }`}
                    >
                      <Icon size={20} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Avatar */}
            <div className="pb-4">
              <button
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                title={adminMember?.name || "Profile"}
                className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-line hover:ring-accent/40 transition-all cursor-pointer"
              >
                <img
                  src={adminMember?.avatar || "/oggy.png"}
                  alt={adminMember?.name || "Member"}
                  className="w-full h-full object-cover"
                />
              </button>
              <ProfilePopover
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                onOpenShortcuts={() => setIsShortcutsOpen(true)}
              />
            </div>
          </>
        ) : (
          /* ── EXPANDED: full sidebar ── */
          <>
            <div>
              {/* Brand Header */}
              <div className="h-20 px-4 border-b border-line bg-surface/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-ink font-sans">NEXO</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs shadow-blue-500/40" />
                </div>
              </div>

              {/* Navigation Sections */}
              <nav className="p-3 space-y-4">
                {/* WORKSPACE */}
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-medium text-ink-secondary uppercase tracking-wider">
                    WORKSPACE
                  </div>
                  {workspaceNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full h-8.5 flex items-center justify-between px-2.5 rounded-lg text-sm transition-colors group cursor-pointer ${
                          isActive
                            ? "bg-accent-soft text-accent font-semibold"
                            : "text-ink-secondary hover:text-ink hover:bg-surface-hover font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                          <Icon size={16} className={`shrink-0 ${isActive ? "text-accent" : "text-ink-secondary group-hover:text-ink"}`} />
                          <span className="truncate whitespace-nowrap">{item.label}</span>
                        </div>
                        {item.badge !== undefined && (item.badge as number) > 0 && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs ${
                              item.id === "messages"
                                ? "bg-emerald-500 text-white font-extrabold"
                                : isActive
                                ? "bg-accent/15 text-accent font-semibold"
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

                {/* GROUP MANAGEMENT */}
                <div className="space-y-1 pt-2 border-t border-line">
                  <div className="px-2 py-1 text-[11px] font-medium text-ink-secondary uppercase tracking-wider">
                    COMMUNITY
                  </div>
                  {groupNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full h-8.5 flex items-center justify-between px-2.5 rounded-lg text-sm transition-colors group cursor-pointer ${
                          isActive
                            ? "bg-accent-soft text-accent font-semibold"
                            : "text-ink-secondary hover:text-ink hover:bg-surface-hover font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                          <Icon size={16} className={`shrink-0 ${isActive ? "text-accent" : "text-ink-secondary group-hover:text-ink"}`} />
                          <span className="truncate whitespace-nowrap">{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? "bg-accent/15 text-accent" : "bg-surface-alt text-ink-secondary"}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ADMIN MANAGEMENT */}
                {activeUser?.role === "SUPER_ADMIN" && (
                  <div className="space-y-1 pt-2 border-t border-line">
                    <div className="px-2 py-1 text-[11px] font-medium text-ink-secondary uppercase tracking-wider flex items-center justify-between">
                      <span>ADMINISTRATION</span>
                      <span className="text-[9px] font-mono text-purple-600 bg-purple-50 px-1 rounded border border-purple-200 uppercase">
                        SUPER ADMIN
                      </span>
                    </div>
                    <Link
                      href="/admin"
                      className="w-full h-8.5 flex items-center justify-between px-2.5 rounded-lg text-sm transition-colors group cursor-pointer text-ink-secondary hover:text-ink hover:bg-surface-hover font-medium"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                        <ShieldCheck size={16} className="shrink-0 text-purple-600 group-hover:text-purple-700" />
                        <span className="truncate whitespace-nowrap">
                          Super Admin Console
                        </span>
                      </div>
                    </Link>
                  </div>
                )}
              </nav>
            </div>

            {/* User Footer Profile */}
            <div className="p-3 border-t border-line bg-surface relative" ref={popoverRef}>
              <button
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-surface-alt/70 border border-line hover:border-line-strong transition-all cursor-pointer text-left group"
              >
                <ProfileAvatar src={activeUser?.avatar} name={activeUser?.name || "Member"} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-small font-semibold text-ink truncate">{activeUser?.name || "Member"}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-positive shrink-0" />
                  </div>
                  <p className="text-caption text-ink-tertiary font-semibold tracking-wide truncate">
                    {activeUser?.role === "SUPER_ADMIN" ? "Super Admin" : "Member"}
                  </p>
                </div>
                <CaretUp size={14} className="text-ink-tertiary group-hover:text-ink transition-transform shrink-0" />
              </button>

              <ProfilePopover
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                onOpenShortcuts={() => setIsShortcutsOpen(true)}
              />
            </div>

            {/* ── Drag Resize Handle ── */}
            <div
              onMouseDown={startResize}
              className="absolute top-0 right-0 h-full w-1 cursor-col-resize z-50 group/resize"
              title="Drag to resize"
            >
              <div className="absolute right-0 top-0 h-full w-[2px] bg-transparent group-hover/resize:bg-accent/40 transition-colors duration-150" />
            </div>
          </>
        )}
      </aside>

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* TABLET COLLAPSED SIDEBAR (Visible on md screens 768px - 1023px) */}
      <aside className="hidden md:flex lg:hidden w-16 bg-surface border-r border-line flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30 font-sans pb-3 items-center">
        <div className="w-full flex flex-col items-center gap-6">
          {/* Logo Header */}
          <div className="h-16 w-full border-b border-line flex items-center justify-center shrink-0">
            <div className="flex items-center gap-1 font-black text-ink text-sm">
              N<span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            </div>
          </div>

          {/* Icons Nav */}
          <div className="space-y-3">
            {workspaceNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  title={item.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? "bg-accent-soft text-accent font-bold" : "text-ink-tertiary hover:bg-surface-hover"
                  }`}
                >
                  <Icon size={20} />
                </button>
              );
            })}
            <button
              onClick={() => setActiveTab("members" as any)}
              title="Members"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeTab === "members" ? "bg-accent-soft text-accent font-bold" : "text-ink-tertiary hover:bg-surface-hover"
              }`}
            >
              <Users size={20} />
            </button>
          </div>
        </div>

        {/* User Profile Avatar */}
        <img
          src={adminMember?.avatar || "/oggy.png"}
          alt={adminMember?.name || "Member"}
          className="w-8 h-8 rounded-full object-cover ring-2 ring-accent/10"
          title={adminMember?.name || "Member"}
        />
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible on screens < 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line/90 py-1 px-2 flex items-center justify-around shadow-lg pb-safe font-sans">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const isMore = item.id === "more";
          const isActive = isMore
            ? isMoreOpen || ["members", "activity", "settings"].includes(activeTab)
            : activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isMore) {
                  setIsMoreOpen(true);
                } else {
                  setActiveTab(item.id as any);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all cursor-pointer touch-target ${
                isActive ? "text-accent font-bold" : "text-ink-tertiary font-medium"
              }`}
            >
              <div className="relative">
                <Icon size={22} className={isActive ? "text-accent" : "text-ink-tertiary"} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-accent text-white text-[9px] font-bold px-1 py-0.2 rounded-full min-w-[14px] text-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* More Drawer Sheet */}
      <MoreDrawer isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
}

