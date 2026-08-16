"use client";

import React from "react";
import { Card } from "../ui/Card";
import { StatusBadge, RecommendationBadge } from "../ui/Badge";
import { formatINR, formatDate, formatIpoAddedDateTime } from "@/lib/mockData";
import { IPOOpportunity } from "@/types/nexo";
import { Clock } from "@phosphor-icons/react";

interface IPOPipelineProps {
  ipos: IPOOpportunity[];
  onInspect: (ipo: IPOOpportunity) => void;
  onViewAll: () => void;
}

export function IPOPipeline({ ipos, onInspect, onViewAll }: IPOPipelineProps) {
  const pipelineIpos = ipos.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[#0F172A] tracking-tight">
            OUR IPO PIPELINE
          </h3>
          <p className="text-xs text-[#64748B] font-medium">
            Selected opportunities we're currently tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs text-accent hover:underline font-extrabold flex items-center gap-1"
        >
          View all pipeline →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineIpos.map((ipo) => (
          <Card
            key={ipo.id}
            hoverable
            onClick={() => onInspect(ipo)}
            className="flex flex-col justify-between p-5 group"
          >
            <div>
              {/* TOP */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-base font-extrabold text-[#0F172A] group-hover:text-accent transition-colors">
                    {ipo.name}
                  </h4>
                  <div className="text-[11px] text-[#64748B] font-medium truncate">
                    {ipo.company}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-accent mt-0.5">
                    <Clock size={11} className="shrink-0" />
                    <span>Added: {formatIpoAddedDateTime(ipo)}</span>
                  </div>
                </div>
                <StatusBadge status={ipo.status} size="sm" />
              </div>

              <div className="my-2">
                <RecommendationBadge type={ipo.recommendation} size="sm" />
              </div>

              {/* MIDDLE */}
              <div className="p-3 rounded-xl bg-page border border-line text-xs space-y-1.5 my-3">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Price Band</span>
                  <span className="font-bold text-[#0F172A] num-tabular">
                    ₹{ipo.metrics.priceBand.min}—₹{ipo.metrics.priceBand.max}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Min Lot</span>
                  <span className="font-bold text-[#0F172A] num-tabular">
                    {formatINR(ipo.metrics.minInvestment)}
                  </span>
                </div>
              </div>
            </div>

            {/* BOTTOM */}
            <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
              <div>
                <div className="text-caution font-bold text-[11px]">
                  Closes {formatDate(ipo.metrics.closeDate)}
                </div>
                <div className="text-[11px] text-[#64748B] font-medium mt-0.5">
                  {ipo.participantsCount} members • {formatINR(ipo.combinedCapital)}
                </div>
              </div>

              <span className="text-xs font-bold text-accent group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
