"use client";

import React from "react";
import { useNexo } from "@/context/NexoContext";
import { DashboardHeader } from "../dashboard/DashboardHeader";
import { FeaturedOpportunity } from "../dashboard/FeaturedOpportunity";
import { Sparkle, Hourglass } from "@phosphor-icons/react";

export function DashboardView() {
  const { ipos, openIpoDetail, openApplicationModal } = useNexo();

  // All non-archived, non-isHidden IPOs (admin permanent-hide)
  const allVisibleIpos = ipos.filter((i) => !i.isHidden && !i.isArchived);

  const isOpenStatus = (st?: string) => {
    if (!st) return true;
    const s = String(st).toUpperCase().trim();
    return (
      s === "APPLICATION_OPEN" ||
      s === "APPLYING" ||
      s === "OPEN" ||
      s === "APPLICATION OPEN" ||
      s === "UPCOMING"
    );
  };

  // 1. Current Open IPOs — only truly active, not removed from home by admin
  const openIpos = allVisibleIpos.filter((i) => !i.hideFromHome && isOpenStatus(i.status));

  // 2. Previous & Closed IPOs — completed IPOs AND admin-removed-from-active ones
  const previousIpos = allVisibleIpos.filter(
    (i) => !isOpenStatus(i.status) || i.hideFromHome
  ).filter((i) => !openIpos.includes(i)); // deduplicate

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in pb-8 font-sans select-none">
      {/* GREETING HEADER */}
      <DashboardHeader />

      {/* SECTION 1: CURRENT OPEN IPOS (TOP) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-line/70">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-ink tracking-tight flex items-center gap-2">
              <span>Current Open IPOs</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {openIpos.length} Active
              </span>
            </h2>
          </div>
        </div>

        {openIpos.length === 0 ? (
          <div className="p-8 text-center bg-surface-alt/40 border border-line/70 rounded-2xl text-ink-tertiary text-xs">
            No active open IPO applications right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {openIpos.map((ipo) => (
              <FeaturedOpportunity
                key={ipo.id}
                ipo={ipo}
                onInspect={openIpoDetail}
                onApply={openApplicationModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: PREVIOUS & CLOSED IPOS (BOTTOM - DIFFERENT COLOR) */}
      {previousIpos.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-line/70">
          <div className="flex items-center justify-between pb-2 border-b border-line/70">
            <div className="flex items-center gap-2">
              <Hourglass size={18} className="text-amber-400" />
              <h2 className="text-base sm:text-lg font-black text-ink tracking-tight flex items-center gap-2">
                <span>Previous & Closed IPOs</span>
                <span className="text-xs font-bold text-ink-secondary bg-surface-alt px-2.5 py-0.5 rounded-full border border-line/70">
                  {previousIpos.length} Previous
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {previousIpos.map((ipo) => (
              <FeaturedOpportunity
                key={ipo.id}
                ipo={ipo}
                onInspect={openIpoDetail}
                onApply={openApplicationModal}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
