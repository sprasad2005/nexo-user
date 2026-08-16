"use client";

import React, { useState } from "react";
import { useNexo } from "@/context/NexoContext";
import { StatusBadge, RecommendationBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { LifecycleBar } from "../ui/LifecycleBar";
import { MaskedPAN } from "../ui/MaskedPAN";
import { formatINR, formatDate, formatIpoAddedDateTime } from "@/lib/mockData";
import { X, UserPlus, ShieldCheck, PencilSimple, Archive, ChatCircleDots, Clock } from "@phosphor-icons/react";
import { EditIPOModal } from "../ipo/EditIPOModal";
import { ArchiveIPOModal } from "../ipo/ArchiveIPOModal";

export function IPODetailDrawer() {
  const { selectedIpo, closeIpoDetail, openApplicationModal, currentUserRole, currentUser, currentMember, openIpoGroupChat } = useNexo();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const activeRole = currentMember?.role || currentUser?.role || currentUserRole;
  const isAdmin = String(activeRole).toUpperCase() === "ADMIN";

  if (!selectedIpo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-overlay backdrop-blur-xs animate-fade-in font-sans">
      <div className="absolute inset-0" onClick={closeIpoDetail} />

      <div className="relative z-10 w-full max-w-xl h-full bg-surface border-l border-line shadow-2xl overflow-y-auto animate-slide-left flex flex-col justify-between">
        <div>
          {/* DRAWER HEADER */}
          <div className="p-5 border-b border-line sticky top-0 bg-surface/95 backdrop-blur-md z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-soft border border-[#BFDBFE] flex items-center justify-center font-semibold text-base text-accent">
                {selectedIpo.logo}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="nexo-h4 text-ink">
                    {selectedIpo.name}
                  </h2>
                  <StatusBadge status={selectedIpo.status} size="sm" />
                </div>
                <div className="text-xs text-ink-secondary font-normal flex items-center gap-1.5 mt-0.5">
                  <span>{selectedIpo.company}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-accent">
                    <Clock size={12} className="shrink-0" />
                    Added: {formatIpoAddedDateTime(selectedIpo)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  openIpoGroupChat(selectedIpo.id, selectedIpo.name);
                  closeIpoDetail();
                }}
                className="px-2.5 py-1 rounded-lg bg-accent-soft text-accent border border-accent/30 text-xs font-semibold hover:bg-accent-soft/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Open Group Chat for this IPO"
              >
                <ChatCircleDots size={15} />
                <span>Group Chat →</span>
              </button>

              <button
                onClick={closeIpoDetail}
                className="p-1.5 rounded-lg text-ink-secondary hover:text-ink hover:bg-page transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* LIFECYCLE PROGRESS TRACKER */}
            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-ink-secondary uppercase tracking-wider">
                Lifecycle Stage
              </div>
              <LifecycleBar currentStage={selectedIpo.status} />
            </div>

            {/* GROUP RECOMMENDATION & COMMENT */}
            <div className="p-4 rounded-xl bg-positive-soft border border-positive/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-positive">
                  <ShieldCheck size={16} />
                  <span>GROUP RECOMMENDATION</span>
                </div>
                <RecommendationBadge type={selectedIpo.recommendation} size="sm" />
              </div>

              <p className="text-xs text-positive font-medium leading-relaxed italic">
                &ldquo;{selectedIpo.thesis}&rdquo;
              </p>

              <div className="text-[12px] text-positive pt-1.5 border-t border-positive/30 font-medium">
                Decision by <strong>{selectedIpo.createdBy}</strong> (Admin)
              </div>
            </div>

            {/* KEY OFFER METRICS (4 Essential Items) */}
            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-ink-secondary uppercase tracking-wider">
                Offer Details
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-page border border-line">
                  <span className="text-[12px] text-ink-secondary block font-medium uppercase">Price Band</span>
                  <span className="text-xs font-semibold text-ink num-tabular">
                    ₹{selectedIpo.metrics.priceBand.min} – ₹{selectedIpo.metrics.priceBand.max}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-page border border-line">
                  <span className="text-[12px] text-ink-secondary block font-medium uppercase">Lot Size</span>
                  <span className="text-xs font-semibold text-ink num-tabular">
                    {selectedIpo.metrics.lotSize} Shares
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-page border border-line">
                  <span className="text-[12px] text-ink-secondary block font-medium uppercase">Min Investment</span>
                  <span className="text-xs font-semibold text-ink num-tabular">
                    {formatINR(selectedIpo.metrics.minInvestment)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <span className="text-[12px] text-emerald-800 block font-semibold uppercase">Expected GMP</span>
                  <span className="text-xs font-extrabold text-emerald-600 num-tabular">
                    +{(selectedIpo.metrics?.gmpPercent ?? 18.5).toFixed(1)}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-page border border-line">
                  <span className="text-[12px] text-ink-secondary block font-medium uppercase">Last Date</span>
                  <span className="text-xs font-semibold text-caution">
                    {formatDate(selectedIpo.metrics.closeDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* GROUP PARTICIPATION & MEMBER SPLITS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div>
                  <div className="text-[12px] font-semibold text-ink-secondary uppercase tracking-wider">
                    Group Applications
                  </div>
                  <div className="text-xs font-semibold text-ink">
                    {selectedIpo.participantsCount} Members Participating
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-positive num-tabular">
                    {formatINR(selectedIpo.combinedCapital)} Committed
                  </span>
                </div>
              </div>

              {selectedIpo.applications.length === 0 ? (
                <div className="p-6 rounded-xl bg-page border border-dashed border-[#CBD5E1] text-center space-y-3">
                  <p className="text-xs text-ink-secondary font-normal">
                    No group applications filed for this IPO yet.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => openApplicationModal(selectedIpo)}
                  >
                    <UserPlus size={14} /> Join Application
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedIpo.applications.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-surface border border-line space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-line">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-accent-soft text-accent font-semibold text-[11px]">
                            {app.type} POOL
                          </span>
                        </div>
                        <span className="font-semibold text-ink num-tabular">
                          {formatINR(app.totalContribution)}
                        </span>
                      </div>

                      {/* Participant List */}
                      <div className="space-y-2">
                        {(app.participants || []).map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-page border border-line text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={p.avatar}
                                alt={p.memberName}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                              <div>
                                <div className="font-semibold text-ink">
                                  {p.memberName}
                                </div>
                                <MaskedPAN
                                  panMasked={p.panMasked || "XXXXXXXX41"}
                                  panFull={p.panFull}
                                />
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-semibold text-ink num-tabular">
                                {formatINR(p.contribution)}
                              </div>
                              <div className="text-[12px] text-accent font-medium num-tabular">
                                {p.percentage}% Share
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 border-t border-line bg-surface flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={closeIpoDetail}>
              Close
            </Button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-secondary hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <PencilSimple size={14} /> Edit IPO
                </button>
                <button
                  onClick={() => setIsArchiveOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-caution hover:bg-caution-soft transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Archive size={14} /> Archive
                </button>
              </>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => openApplicationModal(selectedIpo)}
          >
            <UserPlus size={14} /> Join / Add Application
          </Button>
        </div>
      </div>

      <EditIPOModal
        ipo={selectedIpo}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />

      <ArchiveIPOModal
        ipo={selectedIpo}
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        onSuccess={() => closeIpoDetail()}
      />
    </div>
  );
}
