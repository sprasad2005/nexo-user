"use client";

import React from "react";
import { useNexo } from "@/context/NexoContext";
import {
  Users,
  Gear,
  X,
  ShieldCheck,
  Moon,
  Sun,
  ChatCircleDots,
  User,
  LockKey,
  SignOut,
  Sliders,
  CheckCircle,
} from "@phosphor-icons/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { formatINR } from "@/lib/mockData";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface MoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoreDrawer({ isOpen, onClose }: MoreDrawerProps) {
  const {
    activeTab,
    setActiveTab,
    members,
    portfolioSummary,
    unreadMessageCount,
    currentUser: sessionUser,
    logout,
  } = useNexo();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  if (!isOpen) return null;

  const activeUser = sessionUser || members[0];
  const role = String(activeUser?.role || "MEMBER").toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const handleNavClick = (tabId: string) => {
    if (["dashboard", "ipos", "applications", "portfolio", "messages", "members", "profile", "admin"].includes(tabId)) {
      setActiveTab(tabId as any);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-xs animate-fade-in font-sans lg:hidden">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="relative z-10 w-full max-h-[88vh] overflow-y-auto bg-surface rounded-t-3xl border-t border-line shadow-2xl animate-slide-up flex flex-col p-5 space-y-4 pb-safe-nav">
        {/* Handle / Drag Pill */}
        <div className="w-12 h-1.5 bg-surface-alt rounded-full mx-auto shrink-0" />

        {/* Header: User Profile Card (Clickable to open profile) */}
        <div
          onClick={() => handleNavClick("profile")}
          className="flex items-center justify-between p-3.5 bg-surface-alt/70 hover:bg-surface-hover rounded-2xl border border-line cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={activeUser?.avatar || "/oggy.png"}
              alt={activeUser?.name || "Member"}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-accent/20 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-ink tracking-tight truncate">
                  {activeUser?.name || "Member"}
                </h3>
                <CheckCircle size={14} weight="fill" className="text-positive shrink-0" />
              </div>
              <p className="text-xs text-ink-tertiary font-medium truncate">
                {role === "SUPER_ADMIN" ? "Super Admin" : role === "ADMIN" ? "Admin" : "Member"} • @{activeUser?.username || "user"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-xl text-ink-muted hover:text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Capital Summary Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-surface-alt border border-line/80">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase text-ink-muted block tracking-wider">
              Available Capital
            </span>
            <span className="text-sm font-mono font-bold text-ink">
              {formatINR(portfolioSummary.availableCapital)}
            </span>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[11px] font-bold uppercase text-ink-muted block tracking-wider">
              Capital Deployed
            </span>
            <span className="text-sm font-mono font-bold text-accent">
              {formatINR(portfolioSummary.capitalDeployed)}
            </span>
          </div>
        </div>

        {/* Extended Navigation Options */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider px-2 block mb-1">
            Account & Preferences
          </span>

          {/* View Profile */}
          <button
            onClick={() => handleNavClick("profile")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-accent-soft text-accent border border-accent/30"
                : "text-ink hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                <User size={18} />
              </div>
              <span>Profile & Identity</span>
            </div>
            <span className="text-xs text-ink-tertiary">View →</span>
          </button>

          {/* Security & Password */}
          <Link
            href="/settings/security"
            onClick={onClose}
            className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold text-ink hover:bg-surface-hover transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center text-ink-secondary">
                <LockKey size={18} />
              </div>
              <span>Security & Password</span>
            </div>
            <span className="text-xs text-ink-tertiary">Manage →</span>
          </Link>

          {/* Admin Panel Button (if Admin) */}
          {isAdmin && (
            <button
              onClick={() => {
                router.push("/admin");
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold text-accent hover:bg-accent-soft/40 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                  <Sliders size={18} />
                </div>
                <span>Admin Management Panel</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-accent text-white">
                ADMIN
              </span>
            </button>
          )}

          {/* Messages */}
          <button
            onClick={() => handleNavClick("messages")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "messages"
                ? "bg-accent-soft text-accent border border-accent/30"
                : "text-ink hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                <ChatCircleDots size={18} />
              </div>
              <span>Messages</span>
            </div>
            {unreadMessageCount > 0 && (
              <span className="text-xs font-mono font-extrabold bg-accent text-white px-2 py-0.5 rounded-full">
                {unreadMessageCount}
              </span>
            )}
          </button>

          {/* Group Members */}
          <button
            onClick={() => handleNavClick("members")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "members"
                ? "bg-accent-soft text-accent border border-accent/30"
                : "text-ink hover:bg-surface-hover"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center text-ink-secondary">
                <Users size={18} />
              </div>
              <span>Group Members</span>
            </div>
            <span className="text-xs font-mono font-bold bg-surface-alt text-ink-secondary px-2 py-0.5 rounded-full">
              {members.length}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              toggleTheme();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold text-ink hover:bg-surface-hover transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center text-ink-secondary">
                {theme === "dark" ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-400" />}
              </div>
              <span>Theme Appearance</span>
            </div>
            <span className="text-caption font-semibold text-ink-tertiary uppercase">
              {theme}
            </span>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer mt-1"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <SignOut size={18} />
              </div>
              <span>Log Out</span>
            </div>
          </button>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-ink-muted font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-positive" />
            <span>NEXO Encrypted Vault</span>
          </div>
          <span>v2.4.0</span>
        </div>
      </div>
    </div>
  );
}
