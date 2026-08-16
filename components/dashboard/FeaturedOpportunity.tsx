"use client";

import React, { useState } from "react";
import { Card } from "../ui/Card";
import { GMPBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatINR, formatDate, formatIpoAddedDateTime } from "@/lib/mockData";
import { IPOOpportunity } from "@/types/nexo";
import { ArrowRight, Clock, ShieldCheck, CheckCircle, Hourglass, CalendarBlank } from "@phosphor-icons/react";
import { IPODetailModal } from "../ipo/IPODetailModal";

interface FeaturedOpportunityProps {
  ipo: IPOOpportunity;
  onInspect: (ipo: IPOOpportunity) => void;
  onApply: (ipo: IPOOpportunity) => void;
}

export function FeaturedOpportunity({ ipo, onInspect, onApply }: FeaturedOpportunityProps) {
  const [showDetail, setShowDetail] = useState(false);

  const isOpen = (["APPLICATION_OPEN", "APPLYING", "RESEARCHING", "WATCHLIST"] as string[]).includes(ipo.status);
  const isPending = (["ALLOTMENT_PENDING", "CLOSED"] as string[]).includes(ipo.status);
  const isAllotted = (["ALLOTTED", "NOT_ALLOTTED"] as string[]).includes(ipo.status);
  const isListed = (["HOLDING", "LISTED", "SOLD"] as string[]).includes(ipo.status);

  return (
    <>
      <Card
        className={`p-4 sm:p-5 transition-all rounded-2xl flex flex-col justify-between h-full space-y-4 font-sans ${
          isOpen
            ? "bg-gradient-to-b from-surface via-surface-alt/70 to-surface border-2 border-emerald-500/40 dark:border-emerald-500/35 shadow-xl shadow-emerald-500/5"
            : isPending
            ? "bg-surface border border-amber-500/30 opacity-90 hover:opacity-100"
            : isAllotted
            ? "bg-surface border border-purple-500/30 opacity-90 hover:opacity-100"
            : "bg-surface border border-line/70 opacity-85 hover:opacity-100"
        }`}
      >
        <div>
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line/70">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-small border shadow-2xs shrink-0 ${
                  isOpen
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : isPending
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : isAllotted
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    : "bg-surface-alt text-ink-secondary border-line"
                }`}
              >
                {ipo.logo}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-ink-secondary uppercase tracking-wider bg-surface-alt/90 px-2 py-0.5 rounded-md border border-line/60">
                    {ipo.category || "MAINBOARD"}
                  </span>
                </div>
                {/* Clickable IPO name */}
                <button
                  onClick={() => setShowDetail(true)}
                  className="text-left text-h4 font-bold text-ink hover:text-emerald-400 transition-colors tracking-tight cursor-pointer block leading-snug"
                >
                  {ipo.name}
                </button>
                <div className="flex items-center gap-1 text-[11px] font-medium text-ink-muted mt-0.5">
                  <Clock size={12} className="text-emerald-400 shrink-0" />
                  <span>Added: <strong className="text-ink font-mono font-bold">{formatIpoAddedDateTime(ipo)}</strong></span>
                </div>
              </div>
            </div>

            {/* Status Pill Badge & GMP */}
            <div className="flex items-center gap-2">
              {isOpen && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-sans font-bold flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  APPLICATION OPEN
                </span>
              )}
              {isPending && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-sans font-bold flex items-center gap-1.5">
                  <Hourglass size={13} /> ALLOTMENT PENDING
                </span>
              )}
              {isAllotted && (
                <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[11px] font-sans font-bold flex items-center gap-1.5">
                  <CheckCircle size={13} /> ALLOTMENT OUT
                </span>
              )}
              {isListed && (
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/35 text-[11px] font-sans font-bold flex items-center gap-1.5">
                  📈 LISTED &amp; HOLDING
                </span>
              )}

              <GMPBadge gmpPercent={ipo.metrics?.gmpPercent ?? 18.5} size="sm" />
            </div>
          </div>

          {/* Financial Metrics Cluster */}
          <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
            <div className="p-3 rounded-xl bg-surface-alt/70 border border-line/60 space-y-0.5">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider block">
                Min Investment
              </span>
              <div className="text-h4 font-bold text-ink num-tabular">
                {formatINR(ipo.metrics.minInvestment)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-alt/70 border border-line/60 space-y-0.5">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider block">
                Issue Size
              </span>
              <div className="text-h4 font-bold text-ink num-tabular">
                {ipo.metrics.issueSize || "—"}
              </div>
            </div>
          </div>

          {/* Group Thesis / Decision Box */}
          <div
            className={`p-3 rounded-xl border space-y-2 font-sans ${
              isOpen
                ? "bg-positive-soft/60 border-positive/30"
                : "bg-surface-alt/60 border-line/60"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-positive">
              <ShieldCheck size={16} />
              <span>Group Decision</span>
            </div>

            <p className="text-xs text-ink font-normal leading-relaxed">
              {ipo.thesis}
            </p>

            <div className="flex items-center gap-3 pt-1.5 text-[11px] text-ink-tertiary border-t border-line/60 font-medium">
              {ipo.decisionBy && (
                <span>Authored by: <strong className="font-semibold text-ink">{ipo.decisionBy}</strong></span>
              )}
              {ipo.decisionBy && ipo.decisionDate && <span>•</span>}
              {ipo.decisionDate && (
                <span>Decision date: <strong className="font-semibold text-ink">{ipo.decisionDate}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-line/70 flex items-center justify-between gap-3 font-sans">
          {isOpen ? (
            <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/25 shadow-2xs">
              <Clock size={14} className="text-amber-400" /> Closes {formatDate(ipo.metrics.closeDate)}
            </span>
          ) : (
            <span className="text-xs text-ink-tertiary font-semibold flex items-center gap-1.5 bg-surface-alt px-3 py-1.5 rounded-xl border border-line/60">
              <Clock size={14} /> Closed on {formatDate(ipo.metrics.closeDate)}
            </span>
          )}

          {isOpen ? (
            <Button
              size="md"
              variant="success"
              onClick={() => onApply(ipo)}
              className="shadow-sm shadow-emerald-500/20 font-bold text-xs"
            >
              Apply Now <ArrowRight size={14} />
            </Button>
          ) : (
            <button
              onClick={() => setShowDetail(true)}
              className="px-3.5 py-2 rounded-xl bg-surface-alt hover:bg-surface-hover border border-line text-ink-secondary hover:text-ink text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>View Details</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </Card>

      {/* IPO Detail Modal */}
      <IPODetailModal
        ipo={ipo}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onApply={onApply}
      />
    </>
  );
}
