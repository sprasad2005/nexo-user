"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import {
  Bell,
  Plus,
  PencilSimple,
  Trash,
  ArrowSquareOut,
  ChatCircleText,
  Globe,
  User,
  Users,
} from "@phosphor-icons/react";
import { SendNotificationModal } from "../admin/SendNotificationModal";

export function NotificationPopover() {
  const {
    notifications = [],
    members = [],
    currentUser,
    refreshNotifications,
    deleteNotification,
    markAllNotificationsRead,
  } = useNexo();

  const [isOpen, setIsOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [editTargetNotification, setEditTargetNotification] = useState<any>(null);
  const [deleteTargetNotifId, setDeleteTargetNotifId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN";
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setDeleteTargetNotifId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Automatically mark notifications as read when opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      fetch("/api/notifications/read", { method: "PUT" }).catch(() => {});
      if (markAllNotificationsRead) {
        markAllNotificationsRead();
      }
    }
  }, [isOpen, unreadCount, markAllNotificationsRead]);

  const handleDeleteClick = (notif: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSuperAdmin) {
      // Toggle small inline menu for Admin
      setDeleteTargetNotifId((prev) => (prev === notif.id ? null : notif.id));
    } else {
      // Regular user direct action
      handleExecuteDelete(notif.id, "me");
    }
  };

  const handleExecuteDelete = async (id: string, scope: "me" | "everyone") => {
    setDeletingId(id);
    try {
      if (deleteNotification) {
        await deleteNotification(id, scope);
      } else {
        await fetch(`/api/notifications/${id}?scope=${scope}`, { method: "DELETE" });
        if (refreshNotifications) await refreshNotifications();
      }
    } catch {
    } finally {
      setDeletingId(null);
      setDeleteTargetNotifId(null);
    }
  };

  const handleEditNotification = (notif: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTargetNotification(notif);
    setIsSendModalOpen(true);
  };

  // Helper to format relative time cleanly
  const formatTime = (isoString?: string) => {
    if (!isoString) return "Just now";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  // Auto-detect and cleanly format links within message
  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    const textWithoutUrls = text.replace(urlRegex, "").trim();

    return (
      <div className="space-y-2 mt-1">
        {textWithoutUrls && (
          <p className="text-xs text-slate-300/90 dark:text-[#AEB5C0] leading-relaxed break-words font-normal">
            {textWithoutUrls}
          </p>
        )}
        {urls && urls.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {urls.map((url, idx) => {
              let domain = url;
              try {
                const parsed = new URL(url);
                domain = parsed.hostname.replace("www.", "");
              } catch {}

              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all group/link shadow-3xs"
                >
                  <Globe size={13} className="text-blue-400/80" />
                  <span className="truncate max-w-[200px]">{domain}</span>
                  <ArrowSquareOut size={12} weight="bold" className="transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="relative inline-block font-sans" ref={containerRef}>
        {/* Bell Icon Trigger */}
        <button
          onClick={() => {
            const nextState = !isOpen;
            setIsOpen(nextState);
            setDeleteTargetNotifId(null);
            if (nextState && unreadCount > 0) {
              fetch("/api/notifications/read", { method: "PUT" }).catch(() => {});
              if (markAllNotificationsRead) markAllNotificationsRead();
            }
          }}
          title="Notifications"
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-alt hover:bg-surface-hover text-ink-tertiary hover:text-ink border border-line/80 hover:border-line-strong transition-all duration-150 relative cursor-pointer active:scale-95 shadow-3xs"
        >
          <Bell size={18} className="transition-transform group-hover:rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-black flex items-center justify-center shadow-md ring-2 ring-surface animate-scale-up">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel with 100% Solid Dark Theme */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-3.5 w-88 sm:w-[430px] rounded-3xl bg-[#0D0F14] border border-[#232738] shadow-[0_25px_70px_rgba(0,0,0,0.85)] p-4.5 z-[999] animate-fade-in text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#232738] pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">
                  Notifications
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium">
                  Stay updated on group alerts and announcements
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Super Admin Action */}
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setEditTargetNotification(null);
                      setIsSendModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Broadcast New Notification to Members"
                  >
                    <Plus size={13} weight="bold" />
                    <span>New Alert</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notifications Feed */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium text-xs space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#161922] flex items-center justify-center text-slate-500 mb-2 border border-[#232738]">
                    <ChatCircleText size={24} />
                  </div>
                  <p className="font-bold text-slate-200 text-sm">All caught up!</p>
                  <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                    You have no new alerts at the moment.
                  </p>
                </div>
              ) : (
                notifications.map((notif: any) => {
                  const isUnread = notif.isRead === false;
                  const senderMember = members.find((m: any) => m.id === notif.senderId || m.name === notif.senderName);
                  const senderAvatar = notif.senderAvatar || senderMember?.avatar || (currentUser?.name === notif.senderName ? currentUser?.avatar : "/oggy.png");
                  const isDeleteOpen = deleteTargetNotifId === notif.id;

                  return (
                    <div
                      key={notif.id}
                      className={`group relative p-3.5 rounded-2xl bg-[#151821] hover:bg-[#1A1E29] border border-[#222634] hover:border-[#343B4F] transition-all duration-150 space-y-2 shadow-xs ${
                        isUnread ? "ring-1 ring-blue-500/40" : ""
                      }`}
                    >
                      {/* Top Bar (Sender, Target, Time & Quick Actions) */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Sender Profile Picture */}
                          <img
                            src={senderAvatar || "/oggy.png"}
                            alt={notif.senderName || "Admin"}
                            className="w-6 h-6 rounded-full object-cover border border-white/10 shadow-xs shrink-0 bg-surface-alt"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/oggy.png";
                            }}
                          />
                          <span className="font-bold text-xs text-slate-200 truncate">
                            {notif.senderName || "Admin"}
                          </span>

                          {/* Specific Target Tag (Admin side) */}
                          {isSuperAdmin && notif.targetMemberId !== "ALL" && (
                            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[9.5px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 truncate">
                              👤 {notif.targetMemberName || notif.targetMemberId}
                            </span>
                          )}
                        </div>

                        {/* Timestamp & Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-medium text-slate-400">
                            {formatTime(notif.createdAt)}
                          </span>

                          <div className="flex items-center gap-0.5 ml-1 relative">
                            {isSuperAdmin && (
                              <button
                                onClick={(e) => handleEditNotification(notif, e)}
                                className="p-1 rounded-lg hover:bg-[#252A38] text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit Notification"
                              >
                                <PencilSimple size={13} weight="bold" />
                              </button>
                            )}

                            {/* Trash Button & Small Dropdown Box */}
                            <div className="relative">
                              <button
                                onClick={(e) => handleDeleteClick(notif, e)}
                                disabled={deletingId === notif.id}
                                className={`p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                                  isDeleteOpen
                                    ? "bg-rose-500/20 text-rose-400"
                                    : "hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                                }`}
                                title={isSuperAdmin ? "Delete options" : "Remove"}
                              >
                                <Trash size={13} weight="bold" />
                              </button>

                              {/* Small Box Context Dropdown Menu */}
                              {isDeleteOpen && isSuperAdmin && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl bg-[#11131A] border border-[#2A3144] shadow-[0_12px_36px_rgba(0,0,0,0.9)] p-1 space-y-0.5 animate-scale-up font-sans"
                                >
                                  {/* Delete for Everyone */}
                                  <button
                                    onClick={() => handleExecuteDelete(notif.id, "everyone")}
                                    disabled={deletingId === notif.id}
                                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 font-bold text-[11px] transition-colors flex items-center justify-between group cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Users size={13} weight="bold" />
                                      <span>Delete for everyone</span>
                                    </span>
                                    <Trash size={11} weight="bold" className="text-rose-400/80 group-hover:text-rose-300" />
                                  </button>

                                  {/* Delete for Me */}
                                  <button
                                    onClick={() => handleExecuteDelete(notif.id, "me")}
                                    disabled={deletingId === notif.id}
                                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-300 hover:text-white hover:bg-white/10 font-medium text-[11px] transition-colors flex items-center justify-between group cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <User size={13} weight="bold" />
                                      <span>Delete for me</span>
                                    </span>
                                    <Trash size={11} weight="bold" className="text-slate-400 group-hover:text-white" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notification Title */}
                      <h4 className="font-bold text-xs text-white leading-snug">
                        {notif.title}
                      </h4>

                      {/* Notification Message Details & Links */}
                      {renderMessageContent(notif.message)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Send / Edit Notification Modal */}
      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => {
          setIsSendModalOpen(false);
          setEditTargetNotification(null);
        }}
        editNotification={editTargetNotification}
        onNotificationSaved={() => {
          if (refreshNotifications) refreshNotifications();
        }}
      />
    </>
  );
}
