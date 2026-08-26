"use client";

import React, { useState } from "react";
import { useNexo } from "@/context/NexoContext";
import { MagnifyingGlass, SidebarSimple } from "@phosphor-icons/react";
import { NotificationPopover } from "./NotificationPopover";
import { CommandPalette } from "../ui/CommandPalette";
import { ProfileAvatar } from "../profile/ProfileAvatar";
import { ProfilePopover } from "../profile/ProfilePopover";
import { KeyboardShortcutsModal } from "../profile/KeyboardShortcutsModal";

export function TopBar() {
  const { activeTab, searchQuery, setSearchQuery, portfolioSummary, members, currentUser: sessionUser, isSidebarCollapsed, toggleSidebar } = useNexo();
  const currentUser = sessionUser || members[0];
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    ipos: "IPO Workspace",
    applications: "Applications",
    portfolio: "Portfolio",
    members: "Group Members",
    premium: "Nexo Premium",
    profile: "Profile & Identity",
  };

  return (
    <>
      <header className="h-20 border-b border-line bg-surface/75 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs shadow-line/20 font-sans">
        {/* Page Title & Sidebar Toggle */}
        <div className="flex items-center gap-2.5 text-sm font-semibold text-ink-tertiary">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-surface-alt/80 hover:bg-surface-hover border border-line text-ink-tertiary hover:text-ink transition-all cursor-pointer hidden lg:flex items-center gap-1"
            title="Toggle Left Sidebar (Ctrl + B)"
          >
            <SidebarSimple size={18} />
          </button>

          <h1 className="text-ink font-extrabold text-base sm:text-lg tracking-tight select-none">
            {titles[activeTab] || "Dashboard"}
          </h1>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Button */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-2.5 sm:hidden rounded-xl bg-surface-alt border border-line/80 text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-all active:scale-[0.98] cursor-pointer"
            title="Search"
          >
            <MagnifyingGlass size={18} />
          </button>

          {/* Desktop Search Trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="h-10 w-56 md:w-72 hidden sm:flex items-center justify-between bg-surface-alt/60 hover:bg-surface border border-line hover:border-accent/40 rounded-full px-4 text-xs transition-all duration-200 hover:shadow-xs cursor-pointer select-none group focus:outline-none"
          >
            <div className="flex items-center gap-2.5">
              <MagnifyingGlass size={15} className="text-ink-muted group-hover:text-accent transition-colors" />
              <span className="text-xs font-semibold text-ink-muted group-hover:text-ink-tertiary transition-colors truncate">Search anything...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] font-sans font-bold rounded-full bg-surface-alt text-ink-muted border border-line shadow-3xs group-hover:bg-accent-soft group-hover:text-accent group-hover:border-accent/30 transition-colors">
              ⌘K
            </kbd>
          </button>

          {/* Activity Bell Popover */}
          <NotificationPopover />

          {/* Profile Circle with Premium Popover */}
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 focus:outline-none cursor-pointer p-0.5 rounded-full hover:bg-surface-alt transition-colors"
            >
              <ProfileAvatar src={currentUser?.avatar} name={currentUser?.name || "Member"} size="md" />
            </button>

            <ProfilePopover
              isOpen={isUserMenuOpen}
              onClose={() => setIsUserMenuOpen(false)}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
            />
          </div>
        </div>
      </header>

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpen={() => setIsCommandPaletteOpen(true)}
      />
    </>
  );
}
