"use client";

import React from "react";
import { Card } from "../ui/Card";
import { formatINR } from "@/lib/mockData";
import { IPOOpportunity } from "@/types/nexo";
import { ArrowSquareOut } from "@phosphor-icons/react";

interface IPOSnapshotProps {
  ipo: IPOOpportunity;
}

export function IPOSnapshot({ ipo }: IPOSnapshotProps) {
  return (
    <Card id="snapshot" className="bg-surface border-line shadow-2xs font-sans overflow-hidden">
      {/* Header — company logo + name + min investment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 md:p-8 border-b border-line">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft border border-[#BFDBFE] text-accent flex items-center justify-center font-bold text-xl shadow-2xs">
            {ipo.logo}
          </div>
          <div>
            <h2 className="text-[18px] font-semibold text-ink leading-tight tracking-tight">
              {ipo.name}
            </h2>
            <p className="text-sm text-ink-secondary font-normal mt-0.5">{ipo.company}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[22px] font-bold text-ink num-tabular leading-tight">
            {formatINR(ipo.metrics.minInvestment)}
            <span className="text-sm font-normal text-ink-secondary ml-1">
              / IPO LOT
            </span>
          </p>
          <p className="text-xs text-ink-secondary font-medium mt-0.5">Minimum investment</p>
        </div>
      </div>

      {/* IPO Details Grid */}
      <div className="p-6 md:p-8 space-y-6">
        <h3 className="text-[15px] font-semibold text-ink tracking-tight">IPO details</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
          <div>
            <p className="text-xs text-ink-secondary font-normal mb-1">Minimum investment</p>
            <p className="text-[15px] font-semibold text-ink num-tabular">
              {formatINR(ipo.metrics.minInvestment)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-secondary font-normal mb-1">Price range</p>
            <p className="text-[15px] font-semibold text-ink num-tabular">
              ₹{ipo.metrics.priceBand.min} – ₹{ipo.metrics.priceBand.max}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-secondary font-normal mb-1">Lot size</p>
            <p className="text-[15px] font-semibold text-ink num-tabular">
              {ipo.metrics.lotSize}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-secondary font-normal mb-1">Issue size</p>
            <p className="text-[15px] font-semibold text-ink num-tabular">
              {ipo.metrics.issueSize || "—"}
            </p>
          </div>
          {ipo.metrics.faceValue !== undefined && (
            <div>
              <p className="text-xs text-ink-secondary font-normal mb-1">Face value</p>
              <p className="text-[15px] font-semibold text-ink num-tabular">₹{ipo.metrics.faceValue}</p>
            </div>
          )}
          {ipo.metrics.rhpUrl && (
            <div>
              <p className="text-xs text-ink-secondary font-normal mb-1">IPO document</p>
              <a
                href={ipo.metrics.rhpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-positive hover:underline"
              >
                RHP PDF <ArrowSquareOut size={14} />
              </a>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
