"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { Member } from "@/types/nexo";

interface LoginSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Member | null;
  isAdminConsole?: boolean;
}

export function LoginSuccessModal({ isOpen, onClose, user, isAdminConsole = false }: LoginSuccessModalProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(100);

  const handleEnterWorkspace = useCallback(() => {
    onClose();
    if (typeof window !== "undefined") {
      const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
      const target = (isAdminConsole || isAdmin) ? "/admin" : "/";
      if (window.location.pathname !== target && !window.location.pathname.startsWith("/admin")) {
        router.push(target);
      }
    }
  }, [onClose, isAdminConsole, router]);

  useEffect(() => {
    if (!isOpen) return;

    setProgress(100);
    const duration = 1500; // 1.5 seconds snappy auto-redirect
    const intervalTime = 15;
    const decrement = (intervalTime / duration) * 100;

    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - decrement));
    }, intervalTime);

    const redirectTimer = setTimeout(() => {
      handleEnterWorkspace();
    }, duration);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        handleEnterWorkspace();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(redirectTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleEnterWorkspace]);

  if (!isOpen || !user) return null;

  const displayName = user.name || user.username || "Member";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none font-sans">
      <div
        className="w-full max-w-sm bg-[#090C15] border border-[#1C253B] rounded-3xl p-6 shadow-2xl shadow-blue-500/20 text-white relative animate-in zoom-in-95 overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rapid 1.5s Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#141A2E]">
          <div
            className="h-full bg-gradient-to-r from-[#4F75FF] via-[#32C98B] to-[#4F75FF] transition-all duration-15 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Ambient Top Glow */}
        <div className="w-32 h-32 rounded-full bg-[#4F75FF]/10 blur-2xl absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Center Avatar & Verified Badge */}
        <div className="relative inline-block mb-3.5 mt-2">
          <img
            src={user.avatar || "/oggy.png"}
            alt={displayName}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-[#4F75FF]/30 border-2 border-[#4F75FF] shadow-xl shadow-blue-500/25"
          />
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-lg ring-2 ring-[#090C15]">
            <CheckCircle size={16} weight="fill" />
          </div>
        </div>

        {/* User Identity Info */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-xl font-black text-white tracking-tight">{displayName}</h3>
            <span className="px-2 py-0.5 rounded-md bg-[#4F75FF]/20 text-[#6B93FF] border border-[#4F75FF]/30 font-mono text-[9px] font-bold uppercase">
              {user.role || "MEMBER"}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono font-medium">
            @{(user.username || displayName).toLowerCase()}
          </p>
        </div>

        {/* Status Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono font-extrabold tracking-widest uppercase mb-5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>AUTHENTICATED · REDIRECTING...</span>
        </div>

        {/* Direct Action Button */}
        <button
          type="button"
          onClick={handleEnterWorkspace}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#4F75FF] via-[#436AF5] to-[#3B5FE0] hover:from-[#3E64F0] hover:to-[#3254D0] text-white text-xs font-extrabold shadow-lg shadow-blue-500/30 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] ring-1 ring-white/10"
        >
          <span>Launching Workspace</span>
          <ArrowRight size={15} weight="bold" className="animate-pulse" />
        </button>
      </div>
    </div>
  );
}
