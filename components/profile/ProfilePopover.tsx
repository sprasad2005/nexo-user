"use client";

import React, { useEffect, useRef } from "react";
import { useNexo } from "@/context/NexoContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ProfileAvatar } from "./ProfileAvatar";
import Link from "next/link";
import {
  User,
  Moon,
  Sun,
  Keyboard,
  SignOut,
  CheckCircle,
  ShieldCheck,
  LockKey,
} from "@phosphor-icons/react";

interface ProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
}

export function ProfilePopover({
  isOpen,
  onClose,
  onOpenShortcuts,
}: ProfilePopoverProps) {
  const { setActiveTab, currentUser, members, logout, openUserLogoutModal } = useNexo();
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  const activeUser = currentUser || members[0];
  const name = activeUser?.name || "Member";
  const rawRole = String(activeUser?.role || "MEMBER").toUpperCase();
  const role = rawRole;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-surface border border-line shadow-2xl p-2 z-50 animate-fade-in text-small font-sans select-none"
    >
      {/* ── TOP HEADER SECTION ── */}
      <div className="p-3 bg-surface-alt/60 rounded-xl border border-line-subtle mb-1 flex items-center gap-3">
        <ProfileAvatar src={activeUser?.avatar} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-small font-semibold text-ink truncate">
              {name}
            </h4>
            <span className="inline-flex items-center text-positive">
              <CheckCircle size={13} weight="fill" />
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-[10px] font-semibold px-2 py-0.2 rounded uppercase tracking-wider ${
                role === "SUPER_ADMIN"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                  : "bg-surface-alt text-ink-secondary border border-line-subtle"
              }`}
            >
              {role === "SUPER_ADMIN" ? "Super Admin" : "Member"}
            </span>
            <span className="text-[11px] font-medium text-positive flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
              Verified
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-line my-1" />

      {/* ── MENU ITEMS ── */}
      <div className="space-y-0.5 font-medium text-ink-secondary">
        <button
          onClick={() => {
            setActiveTab("profile" as any);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-small hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <User size={16} className="text-accent" />
          <span>View Profile</span>
        </button>

        <button
          onClick={() => {
            toggleTheme();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-small hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            {theme === "dark" ? (
              <Moon size={16} className="text-indigo-400" />
            ) : (
              <Sun size={16} className="text-amber-500" />
            )}
            <span>Appearance</span>
          </div>
          <span className="text-caption font-semibold text-ink-tertiary uppercase">
            {theme}
          </span>
        </button>

        <Link
          href="/settings/security"
          onClick={onClose}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-small hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <LockKey size={16} className="text-ink-tertiary" />
          <span>Security & Sessions</span>
        </Link>

        {onOpenShortcuts && (
          <button
            onClick={() => {
              onOpenShortcuts();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-small hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Keyboard size={16} className="text-ink-tertiary" />
              <span>Keyboard Shortcuts</span>
            </div>
            <kbd className="text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded bg-surface-alt border border-line text-ink-tertiary">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      <div className="h-px bg-line my-1" />

      {/* ── SIGN OUT ── */}
      <button
        onClick={() => {
          onClose();
          if (openUserLogoutModal) {
            openUserLogoutModal();
          } else if (logout) {
            logout();
          }
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-small font-semibold text-negative hover:bg-negative-soft transition-colors cursor-pointer"
      >
        <SignOut size={16} />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
