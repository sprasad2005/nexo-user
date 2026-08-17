"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Gear,
  SignOut,
  CaretDown,
  ShieldCheck,
  ArrowSquareOut,
  CheckCircle,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { useAdmin } from "@/context/AdminContext";
import { useTheme } from "@/components/providers/ThemeProvider";

interface AdminNavbarProfileMenuProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onSignOutClick: () => void;
}

export function AdminNavbarProfileMenu({
  activeTab,
  onSelectTab,
  onSignOutClick,
}: AdminNavbarProfileMenuProps) {
  const { currentUser } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const rawUsername = currentUser?.username || "ankitgod";
  const formattedUsername = rawUsername.startsWith("@") ? rawUsername : `@${rawUsername}`;
  const isSuperAdmin =
    currentUser?.role === "SUPER_ADMIN" ||
    rawUsername.toLowerCase() === "ankitgod" ||
    (currentUser?.name || "").toLowerCase().includes("ankit");
  const roleLabel = isSuperAdmin
    ? "SUPER ADMIN"
    : currentUser?.role === "ADMIN"
    ? "ADMIN"
    : "MEMBER";
  const popoverRoleLabel = isSuperAdmin
    ? "SUPER ADMINISTRATOR"
    : currentUser?.role === "ADMIN"
    ? "ADMINISTRATOR"
    : "CORE MEMBER";

  return (
    <div className="relative" ref={menuRef}>
      {/* Navbar Profile Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
            isOpen || activeTab === "profile" || activeTab === "settings"
              ? "bg-surface-alt text-ink border-accent/40 ring-2 ring-accent/10"
              : "bg-surface hover:bg-surface-alt border-line text-ink"
          }`}
          title="Admin Profile & Settings"
        >
          <img
            src={currentUser?.avatar || "/oggy.png"}
            alt={currentUser?.name || "Admin"}
            className="w-6 h-6 rounded-full object-cover border border-line-strong shrink-0"
          />
          <span className="font-extrabold text-ink truncate max-w-[120px]">
            {currentUser?.name || "Admin"}
          </span>
          <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-accent text-white uppercase tracking-wider shadow-2xs">
            {roleLabel}
          </span>
          <CaretDown
            size={14}
            className={`text-ink-tertiary transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180 text-accent" : ""
            }`}
          />
        </button>

        {/* Popover Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-3.5 w-72 rounded-2xl bg-surface border border-line shadow-2xl z-50 overflow-hidden font-sans text-ink backdrop-blur-xl animate-fade-in select-none">
            {/* Backdrop overlay for quick click-outside */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative z-50">
              {/* Menu Header */}
              <div className="p-4 border-b border-line bg-surface-alt">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={currentUser?.avatar || "/oggy.png"}
                    alt={currentUser?.name || "Admin"}
                    className="w-10 h-10 rounded-full object-cover border-2 border-accent/40 shrink-0 shadow-md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="text-xs font-extrabold text-ink truncate">
                        {currentUser?.name || "Admin"}
                      </h4>
                      <CheckCircle size={14} className="text-accent shrink-0" weight="fill" />
                    </div>
                    <p className="text-[10px] text-ink-tertiary font-mono truncate">
                      {formattedUsername}
                    </p>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 uppercase">
                        <ShieldCheck size={11} weight="bold" />
                        {popoverRoleLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="p-2 space-y-1 text-xs">
                {/* Admin Profile */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onSelectTab("profile");
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                    activeTab === "profile"
                      ? "bg-accent/15 text-accent font-bold border border-accent/30"
                      : "text-ink hover:bg-surface-alt font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                      <User size={16} weight="bold" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold leading-tight">Admin Profile</p>
                      <p className="text-[10px] text-ink-tertiary font-normal">
                        Account details, credentials &amp; security
                      </p>
                    </div>
                  </div>
                </button>

                {/* System Settings */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onSelectTab("settings");
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-accent/15 text-accent font-bold border border-accent/30"
                      : "text-ink hover:bg-surface-alt font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-surface-alt text-ink-tertiary flex items-center justify-center shrink-0">
                      <Gear size={16} weight="bold" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold leading-tight">System Settings</p>
                      <p className="text-[10px] text-ink-tertiary font-normal">
                        Workspace policies &amp; DB controls
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* User Workspace Link */}
              <div className="p-2 border-t border-line">
                <a
                  href="/"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-ink-secondary hover:text-ink hover:bg-surface-alt transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ArrowSquareOut size={16} className="text-ink-tertiary" />
                    <span>Return to User Workspace</span>
                  </div>
                </a>
              </div>

              {/* Footer Sign Out Option */}
              <div className="p-2 border-t border-line">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onSignOutClick();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <SignOut size={16} weight="bold" />
                  <span>Sign Out of Console</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
