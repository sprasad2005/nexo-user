"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Key,
  SignOut,
  ArrowSquareOut,
  CheckCircle,
  Command,
  X,
} from "@phosphor-icons/react";

interface AdminProfileMenuProps {
  onOpenShortcutsModal?: () => void;
}

export function AdminProfileMenu({ onOpenShortcutsModal }: AdminProfileMenuProps) {
  const { currentMember, currentUser, logout } = useNexo();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeUser = currentUser || currentMember;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  const handleOpenUserWorkspace = () => {
    router.push("/");
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-line text-xs font-semibold text-ink transition-all cursor-pointer shadow-2xs group"
        title="Admin Profile Menu"
      >
        <img
          src={activeUser?.avatar || "/oggy.png"}
          alt={activeUser?.name || "Admin"}
          className="w-5 h-5 rounded-full object-cover border border-line shrink-0"
        />
        <span className="truncate max-w-[110px] font-bold text-ink group-hover:text-accent">
          {activeUser?.name || "Admin"}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-line shadow-2xl z-50 overflow-hidden font-sans text-ink animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-line bg-surface-alt/50 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={activeUser?.avatar || "/oggy.png"}
                alt={activeUser?.name || "Admin"}
                className="w-9 h-9 rounded-full object-cover border border-line shrink-0 shadow-2xs"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-ink truncate">
                    {activeUser?.name || "Administrator"}
                  </span>
                  <CheckCircle size={14} className="text-accent shrink-0" weight="fill" />
                </div>
                <span className="text-[10px] font-medium text-ink-tertiary block truncate">
                  {activeUser?.email || "ankitgod@nexo.private"}
                </span>
                <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-accent/10 text-accent border border-accent/20">
                  <ShieldCheck size={10} weight="fill" />
                  ADMINISTRATOR
                </span>
              </div>
            </div>
          </div>

          {/* Context Switch Option */}
          <div className="p-1.5 border-b border-line bg-accent/5">
            <button
              onClick={handleOpenUserWorkspace}
              className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-accent hover:bg-accent/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ArrowSquareOut size={16} weight="bold" />
                <span>Open NEXO Workspace</span>
              </div>
              <span className="text-[10px] font-mono text-accent/70">/dashboard</span>
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-1.5 space-y-0.5 text-xs font-medium">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/profile");
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <User size={15} className="text-ink-tertiary" />
              <span>Admin Profile</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenShortcutsModal) onOpenShortcutsModal();
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-ink-secondary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Command size={15} className="text-ink-tertiary" />
                <span>Keyboard Shortcuts</span>
              </div>
              <span className="text-[10px] font-mono text-ink-tertiary px-1.5 py-0.5 rounded bg-surface-alt border border-line">
                ⌘K
              </span>
            </button>
          </div>

          {/* Footer Sign Out */}
          <div className="p-1.5 border-t border-line bg-surface-alt/30">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <SignOut size={15} />
              <span>Sign Out of Console</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
