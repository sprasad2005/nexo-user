"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { Bell, ArrowRight, Megaphone, Info, CheckCircle, Warning, Plus } from "@phosphor-icons/react";
import { SendNotificationModal } from "../admin/SendNotificationModal";

export function NotificationPopover() {
  const { actionItems, notifications = [], ipos, currentUser, openApplicationModal, openIpoDetail } = useNexo();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"actions" | "broadcasts">("actions");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
  const unreadCount = actionItems.length + notifications.length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatCtaText = (label?: string) => {
    if (!label) return "View details →";
    const cleaned = label.replace(/→+$/, "").trim();
    return `${cleaned} →`;
  };

  return (
    <>
      <div className="relative inline-block font-sans" ref={containerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Notifications & Action Items"
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-alt hover:bg-surface-hover/90 text-ink-tertiary hover:text-ink border border-line/80 hover:border-line-strong transition-all duration-150 relative cursor-pointer active:scale-[0.98] shadow-3xs"
        >
          <Bell size={18} className="transition-transform group-hover:rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/80 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2.5 w-84 sm:w-[380px] rounded-3xl bg-surface/98 backdrop-blur-xl border border-line/90 shadow-2xl p-4.5 z-50 space-y-3 animate-fade-in text-xs">
            {/* Header & Send Alert Button */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab("actions")}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === "actions"
                      ? "bg-accent/15 text-accent border border-accent/25"
                      : "text-ink-tertiary hover:text-ink"
                  }`}
                >
                  Actions ({actionItems.length})
                </button>
                <button
                  onClick={() => setActiveTab("broadcasts")}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === "broadcasts"
                      ? "bg-accent/15 text-accent border border-accent/25"
                      : "text-ink-tertiary hover:text-ink"
                  }`}
                >
                  Announcements ({notifications.length})
                </button>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsSendModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                  title="Send Broadcast Notification"
                >
                  <Plus size={12} weight="bold" />
                  <span>Send Notification</span>
                </button>
              )}
            </div>

            {/* Content List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5 no-scrollbar">
              {activeTab === "actions" && (
                <>
                  {actionItems.length === 0 ? (
                    <p className="text-center py-6 text-ink-muted font-medium text-xs">
                      ✨ All caught up! No actions required.
                    </p>
                  ) : (
                    actionItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-caution-soft/40 border border-caution/30 space-y-2 shadow-3xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-caution text-xs leading-snug flex-1">
                            {item.title}
                          </h4>
                          {item.ipoName && (
                            <span className="text-[9px] font-black uppercase bg-caution-soft text-caution px-2 py-0.5 rounded-md border border-caution/30 shrink-0">
                              {item.ipoName}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-caution/90 font-medium leading-relaxed">
                          {item.subtitle}
                        </p>

                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              const targetIpo = ipos.find((i) => i.id === item.ipoId);
                              if (targetIpo) {
                                if (item.type === "PROOF_MISSING") {
                                  openApplicationModal(targetIpo);
                                } else {
                                  openIpoDetail(targetIpo);
                                }
                              }
                            }}
                            className="text-xs font-black text-caution hover:underline cursor-pointer transition-colors"
                          >
                            {formatCtaText(item.ctaLabel)}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {activeTab === "broadcasts" && (
                <>
                  {notifications.length === 0 ? (
                    <p className="text-center py-6 text-ink-muted font-medium text-xs">
                      No broadcast notifications yet.
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3.5 rounded-2xl border space-y-1.5 transition-all ${
                          notif.severity === "CRITICAL"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : notif.severity === "SUCCESS"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : notif.severity === "WARNING"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-extrabold text-xs leading-snug truncate">
                            {notif.title}
                          </h4>
                          <span className="text-[9px] font-mono font-bold text-ink-tertiary">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Today"}
                          </span>
                        </div>

                        <p className="text-[11px] text-ink-secondary font-medium leading-relaxed">
                          {notif.message}
                        </p>

                        {notif.ctaLabel && (
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                if (notif.ipoId) {
                                  const targetIpo = ipos.find((i) => i.id === notif.ipoId);
                                  if (targetIpo) openIpoDetail(targetIpo);
                                }
                              }}
                              className="text-xs font-black hover:underline cursor-pointer transition-colors"
                            >
                              {formatCtaText(notif.ctaLabel)}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Send Notification Modal */}
      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </>
  );
}
