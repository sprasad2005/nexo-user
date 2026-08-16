"use client";

import React from "react";
import { Card } from "../ui/Card";
import { GMPBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatINR, formatDate, formatIpoAddedDateTime } from "@/lib/mockData";
import { IPOOpportunity } from "@/types/nexo";
import { ArrowRight, Clock, ShieldCheck } from "@phosphor-icons/react";

interface FeaturedIPOProps {
  ipo: IPOOpportunity;
  onInspect: (ipo: IPOOpportunity) => void;
}

export function FeaturedIPO({ ipo, onInspect }: FeaturedIPOProps) {
  const participants = ipo.applications.flatMap((a) => a.participants || []).filter(Boolean);

  return (
    <Card
      hoverable
      onClick={() => onInspect(ipo)}
      className="p-6 md:p-7 bg-surface border border-accent/40 shadow-xs flex flex-col justify-between group"
    >
      <div>
        {/* TOP */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-line">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base shadow-xs">
              {ipo.logo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-caption font-semibold px-2 py-0.5 rounded bg-accent-soft text-accent border border-accent/20 tracking-wide uppercase">
                  OUR CURRENT OPPORTUNITY
                </span>
                <span className="text-caption text-ink-tertiary font-medium">
                  {ipo.category || "Mainboard IPO"}
                </span>
              </div>
              <h3 className="text-h2 font-semibold text-ink group-hover:text-accent transition-colors mt-1">
                {ipo.name}
              </h3>
              <div className="flex items-center gap-1 text-[11px] font-medium text-ink-muted mt-0.5">
                <Clock size={12} className="text-accent shrink-0" />
                <span>Added: <strong className="text-ink font-mono font-bold">{formatIpoAddedDateTime(ipo)}</strong></span>
              </div>
            </div>
          </div>

          <GMPBadge gmpPercent={ipo.metrics?.gmpPercent ?? 18.5} size="md" />
        </div>

        {/* MIDDLE */}
        <div className="py-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <div>
              <span className="text-caption font-medium text-ink-tertiary uppercase tracking-wider block mb-1">
                Offer Price Band
              </span>
              <div className="text-h1 font-bold text-ink num-tabular">
                ₹{ipo.metrics.priceBand.min} — ₹{ipo.metrics.priceBand.max}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-caption text-ink-secondary font-medium block">Lot Size</span>
                <span className="text-body-md font-semibold text-ink num-tabular">
                  {ipo.metrics.lotSize} shares / lot
                </span>
              </div>
              <div>
                <span className="text-caption text-ink-secondary font-medium block">Minimum Investment</span>
                <span className="text-body-md font-semibold text-ink num-tabular">
                  {formatINR(ipo.metrics.minInvestment)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-alt border border-line flex flex-col justify-between space-y-3">
            <div>
              <span className="text-caption font-medium text-ink-tertiary uppercase tracking-wider block">
                Application Deadline
              </span>
              <div className="text-body-md font-semibold text-caution flex items-center gap-1.5 mt-1">
                <Clock size={16} />
                <span>{formatDate(ipo.metrics.closeDate)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between">
              <span className="text-caption text-ink-secondary font-medium">Subscription closes</span>
              <span className="text-caption font-semibold text-caution num-tabular">{formatDate(ipo.metrics.closeDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SUBTLE SEPARATOR & BOTTOM */}
      <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {participants.slice(0, 4).map((p, idx) => (
              <img
                key={idx}
                src={p.avatar}
                alt={p.memberName}
                title={`${p.memberName} (${formatINR(p.contribution)})`}
                className="w-7 h-7 rounded-full border-2 border-surface object-cover shadow-xs"
              />
            ))}
          </div>

          <div className="text-small">
            <span className="font-semibold text-ink">
              {ipo.participantsCount} participants
            </span>
            <span className="text-ink-tertiary font-medium ml-1.5">
              ({formatINR(ipo.combinedCapital)} committed)
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(ipo);
          }}
        >
          View Opportunity <ArrowRight size={14} />
        </Button>
      </div>
    </Card>
  );
}
