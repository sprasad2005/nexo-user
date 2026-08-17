"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "../context/AdminContext";
import { IPOOpportunity } from "../types/nexo";
import { Plus, Trash, CheckCircle, Buildings, PencilSimple, Clock, CalendarBlank, ShieldCheck } from "@phosphor-icons/react";
import { AddIPODrawer } from "./AddIPODrawer";
import { EditIPODrawer } from "./EditIPODrawer";
import { GMPBadge } from "../../components/ui/Badge";
import { formatIpoAddedDateTime } from "../../lib/mockData";

export function AdminIPOManagement() {
  const { ipos, removeIPO } = useAdmin();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingIpo, setEditingIpo] = useState<IPOOpportunity | null>(null);
  const [selectedIpoToRemove, setSelectedIpoToRemove] = useState<IPOOpportunity | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filter visible IPOs for management list
  const visibleIpos = ipos.filter((ipo) => !ipo.isHidden);

  const handleConfirmRemove = async () => {
    if (!selectedIpoToRemove) return;
    const target = selectedIpoToRemove;
    try {
      await fetch("/api/ipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateIpo",
          ipoId: target.id,
          data: {
            status: "COMPLETED",
            isHidden: true,
          },
        }),
      });

      await fetch("/api/admin/ipos/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipoId: target.id }),
      }).catch(() => {});

      setFeedbackMsg(`✓ "${target.name}" removed from user home page. It remains accessible in Applications, Workspace, and IPO History.`);
      window.dispatchEvent(new Event("storage"));
    } catch {
      setFeedbackMsg(`✓ "${target.name}" removed from user home page.`);
    }

    setSelectedIpoToRemove(null);

    // Auto-clear toast after 5 seconds
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 5000);
  };

  const handleAddSuccess = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 5000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 p-4 sm:p-6 md:p-8 pb-16 font-sans">
      {/* Toast Feedback Alert */}
      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" weight="fill" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 font-extrabold text-sm ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-[#101114] border border-slate-200/90 dark:border-[#252931] rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-[#6B93FF] bg-blue-50 dark:bg-[#17233D] border border-blue-200 dark:border-[#6B93FF]/30 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
              ADMIN
            </span>
            <span className="text-slate-300 dark:text-[#626A75]">•</span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#858D99]">Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">
            IPO MANAGEMENT
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-[#858D99] mt-0.5">
            Manage IPOs displayed on the user website.
          </p>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 dark:bg-[#6B93FF] hover:bg-blue-700 dark:hover:bg-[#7BA0FF] text-white dark:text-[#101114] font-extrabold text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} weight="bold" />
          <span>Add IPO</span>
        </button>
      </div>

      {/* ACTIVE IPO LISTING */}
      <div className="space-y-4 font-sans">
        <div className="flex items-center justify-between pb-1">
          <h3 suppressHydrationWarning className="text-xs font-extrabold text-slate-400 dark:text-[#858D99] uppercase tracking-wider">
            Active User Website IPOs ({isMounted ? visibleIpos.length : 0})
          </h3>
        </div>

        {!isMounted ? (
          <div className="space-y-4 animate-pulse">
            <div className="p-6 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931]/80 rounded-2xl h-44" />
          </div>
        ) : visibleIpos.length === 0 ? (
          <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931]/80 rounded-2xl shadow-2xs p-12 text-center space-y-2">
            <Buildings size={36} className="text-slate-300 dark:text-[#626A75] mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-[#F5F7FA]">No Active IPOs</h4>
            <p className="text-xs text-slate-500 dark:text-[#858D99]">
              Click "+ Add IPO" to publish an IPO to the user website.
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {visibleIpos.map((ipo) => {
              const initials = ipo.name.substring(0, 2).toUpperCase();
              return (
                <div
                  key={ipo.id}
                  className="p-5 sm:p-6 bg-white dark:bg-gradient-to-b dark:from-[#0B0C0E] dark:via-[#0D0E11] dark:to-[#0B0C0E] border-2 border-emerald-500/30 dark:border-emerald-500/35 rounded-2xl shadow-md dark:shadow-xl shadow-emerald-500/5 dark:shadow-[#10B981]/5 flex flex-col justify-between group transition-all duration-300 relative text-slate-900 dark:text-[#F5F7FA] space-y-4"
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#252931]/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-extrabold text-sm shadow-2xs shrink-0 select-none">
                          {ipo.logo || initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-[#AEB5C0] uppercase tracking-wider bg-slate-100 dark:bg-[#14161A] px-2 py-0.5 rounded-md border border-slate-200 dark:border-[#252931]/60">
                              {ipo.category || "MAINBOARD"}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                            {ipo.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-[#858D99] mt-0.5">
                            <Clock size={12} className="text-blue-500 dark:text-[#6B93FF] shrink-0" />
                            <span>Added: <strong className="text-slate-700 dark:text-[#E2E8F0] font-mono font-bold">{formatIpoAddedDateTime(ipo)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Status & GMP badges */}
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-sans font-bold flex items-center gap-1.5 shadow-2xs select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          APPLICATION OPEN
                        </span>

                        <GMPBadge gmpPercent={ipo.metrics?.gmpPercent ?? 18.5} size="sm" />
                      </div>
                    </div>

                    {/* Financial Metrics Cluster */}
                    <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14161A]/70 border border-slate-200 dark:border-[#252931]/60 space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">
                          Min Investment
                        </span>
                        <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                          ₹{ipo.metrics.minInvestment.toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#14161A]/70 border border-slate-200 dark:border-[#252931]/60 space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-400 dark:text-[#858D99] uppercase tracking-wider block">
                          Issue Size
                        </span>
                        <div className="text-base font-bold text-slate-900 dark:text-white">
                          {ipo.metrics.issueSize || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Group Thesis / Decision Box */}
                    <div className="p-3.5 rounded-xl border space-y-1.5 bg-emerald-50/60 dark:bg-emerald-500/[0.03] border-emerald-200 dark:border-emerald-500/20">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <ShieldCheck size={16} />
                        <span>Group Decision</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-[#AEB5C0] font-normal leading-relaxed">
                        {ipo.thesis || "A"}
                      </p>
                    </div>
                  </div>

                  {/* Footer Action Row */}
                  <div className="pt-4 border-t border-slate-200 dark:border-[#252931]/60 flex items-center justify-between gap-3">
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-500/25 shadow-2xs">
                      <Clock size={14} className="text-amber-600 dark:text-amber-400" /> Closes {ipo.metrics.closeDate || "Soon"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingIpo(ipo)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-[#6B93FF] hover:text-blue-700 dark:hover:text-[#7BA0FF] bg-blue-50 hover:bg-blue-100 dark:bg-[#17233D] dark:hover:bg-[#22355C] border border-blue-200 dark:border-[#6B93FF]/30 transition-colors cursor-pointer"
                      >
                        <PencilSimple size={14} />
                        <span>Edit IPO</span>
                      </button>
                      <button
                        onClick={() => setSelectedIpoToRemove(ipo)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-[#FF6B6B] hover:text-rose-700 dark:hover:text-[#FF8787] bg-rose-50 hover:bg-rose-100 dark:bg-[#32191B] dark:hover:bg-[#472226] border border-rose-200 dark:border-[#FF6B6B]/30 transition-colors cursor-pointer"
                      >
                        <Trash size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REMOVE CONFIRMATION MODAL */}
      {selectedIpoToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#14161A] rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-[#343943] shadow-2xl space-y-4 text-slate-900 dark:text-[#F5F7FA]">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-[#32191B] text-rose-600 dark:text-[#FF6B6B] flex items-center justify-center">
              <Trash size={24} />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">Remove from User Home Page?</h3>
              <p className="text-xs text-slate-600 dark:text-[#AEB5C0] font-medium mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-[#F5F7FA]">{selectedIpoToRemove.name}</span> from the user home page?
              </p>
              <p className="text-[11px] text-slate-400 dark:text-[#858D99] mt-2">
                This will remove the IPO from the user Home page while keeping all applications, workspace, and historical records safely preserved in the IPO History section.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedIpoToRemove(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#343943] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-100 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer"
              >
                Remove from Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD IPO DRAWER */}
      <AddIPODrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* EDIT IPO DRAWER */}
      <EditIPODrawer
        ipo={editingIpo}
        isOpen={!!editingIpo}
        onClose={() => setEditingIpo(null)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
