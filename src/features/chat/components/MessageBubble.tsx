"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Message } from "@/types/nexo";
import { MemoizedMarkdown } from "./MemoizedMarkdown";
import {
  Check,
  Checks,
  Pencil,
  Trash,
  FileText,
  DownloadSimple,
  MusicNotes,
  ShieldWarning,
  Smiley,
  Copy,
  X,
} from "@phosphor-icons/react";

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  showSenderHeader: boolean;
  currentMemberId: string;
  isAdmin?: boolean;
  onEditMessage?: (messageId: string, text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isSelf,
  showSenderHeader,
  currentMemberId,
  isAdmin = false,
  onEditMessage,
  onDeleteMessage,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [selectedEmojiFilter, setSelectedEmojiFilter] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const formattedTime = useMemo(() => {
    try {
      return new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [message.createdAt]);

  const isDeleted = Boolean(message.isDeleted || message.isDeletedByAdmin);
  const isDeletedBySelf = isDeleted && (message.deletedByUserId === currentMemberId || isSelf);
  const canDelete = !isEditing && !isDeleted;

  // Auto-close Reaction Picker, Reaction Details, and Context Menu on Outside Click
  useEffect(() => {
    if (!showReactionPicker && !showReactionDetails && !contextMenuPos) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setShowReactionPicker(false);
        setShowReactionDetails(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReactionPicker, showReactionDetails, contextMenuPos]);

  const handleSaveEdit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (editText.trim() && onEditMessage) {
        onEditMessage(message.id, editText.trim());
        setIsEditing(false);
      }
    },
    [editText, message.id, onEditMessage]
  );

  const handleToggleReaction = useCallback(
    async (emoji: string) => {
      setShowReactionPicker(false);
      setShowReactionDetails(false);
      try {
        await fetch(`/api/conversations/${message.conversationId}/messages/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: message.id,
            emoji,
            memberId: currentMemberId,
          }),
        });
      } catch (err) {
        console.error("Failed to toggle reaction:", err);
      }
    },
    [message.conversationId, message.id, currentMemberId]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isDeleted && !isAdmin) return;
      e.preventDefault();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    },
    [isDeleted, isAdmin]
  );

  const handleCopyText = useCallback(() => {
    if (message.text && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(message.text);
    }
    setContextMenuPos(null);
  }, [message.text]);

  // Group reactions by emoji - memoized to avoid expensive reduce on every render
  const reactionGroups = useMemo(() => {
    const rawReactions = message.reactions || [];
    return rawReactions.reduce<
      Record<string, { count: number; users: string[]; hasReacted: boolean }>
    >((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, users: [], hasReacted: false };
      }
      acc[r.emoji].count += 1;
      acc[r.emoji].users.push(r.memberName || "Member");
      if (r.memberId === currentMemberId) {
        acc[r.emoji].hasReacted = true;
      }
      return acc;
    }, {});
  }, [message.reactions, currentMemberId]);

  const allReactions = message.reactions || [];
  const filteredReactions = useMemo(() => {
    return selectedEmojiFilter
      ? allReactions.filter((r) => r.emoji === selectedEmojiFilter)
      : allReactions;
  }, [allReactions, selectedEmojiFilter]);

  // Self deletion hides the bubble completely for self (non-admin)
  if (isDeletedBySelf && !isAdmin) {
    return null;
  }

  return (
    <div
      ref={bubbleRef}
      onContextMenu={handleContextMenu}
      className={`group relative flex gap-2.5 max-w-[85%] md:max-w-[72%] ${
        isSelf ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
      } ${showSenderHeader ? "mt-3.5" : "mt-1"}`}
    >
      {/* Avatar */}
      {!isSelf && (
        <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-surface-alt self-start mt-0.5 ring-1 ring-line">
          {showSenderHeader ? (
            <img
              src={message.senderAvatar || "/oggy.png"}
              alt={message.senderName || "Member"}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>
      )}

      <div className="flex flex-col min-w-0 relative">
        {/* Sender Header */}
        {!isSelf && showSenderHeader && (
          <div className="flex items-center gap-1.5 mb-1 px-0.5">
            <span className="text-xs font-extrabold text-ink font-sans">
              {message.senderName}
            </span>
            {message.senderUsername && (
              <span className="text-[10px] font-sans font-semibold tracking-tight text-accent bg-accent-soft/40 px-1.5 py-0.2 rounded-md border border-accent/20">
                @{message.senderUsername}
              </span>
            )}
          </div>
        )}

        {/* Bubble Container */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl text-xs font-sans leading-relaxed shadow-xs break-words transition-all ${
            isSelf
              ? "bg-gradient-to-br from-accent/25 via-accent/15 to-accent/10 text-ink border border-accent/30 rounded-tr-xs"
              : "bg-surface-alt text-ink border border-line/80 rounded-tl-xs"
          }`}
        >
          {/* Admin Audit Badge for Deleted Messages */}
          {isDeleted && isAdmin && (
            <div className="px-2 py-0.5 mb-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold flex items-center gap-1">
              <ShieldWarning size={12} weight="bold" />
              <span>
                {message.isDeletedByAdmin
                  ? "Deleted by Admin (Admin Audit View)"
                  : "Deleted by user (Admin Audit View)"}
              </span>
            </div>
          )}

          {/* Attachment Rendering */}
          {message.attachment && (!isDeleted || isAdmin) && (
            <div className="mb-2 space-y-1">
              {message.attachment.type === "IMAGE" && (
                <div className="rounded-xl overflow-hidden border border-line/80 max-w-sm">
                  <img
                    src={message.attachment.url}
                    alt={message.attachment.name || "Image attachment"}
                    loading="lazy"
                    decoding="async"
                    className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(message.attachment?.url, "_blank")}
                  />
                </div>
              )}

              {message.attachment.type === "DOCUMENT" && (
                <a
                  href={message.attachment.url}
                  download={message.attachment.name}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-line hover:border-accent/40 transition-colors gap-3 group max-w-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <FileText size={18} weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-ink truncate block group-hover:text-accent">
                        {message.attachment.name}
                      </span>
                      {message.attachment.size && (
                        <span className="text-[10px] text-ink-tertiary font-mono block">
                          {(message.attachment.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                  </div>
                  <DownloadSimple size={16} className="text-ink-tertiary group-hover:text-accent shrink-0" />
                </a>
              )}

              {message.attachment.type === "AUDIO" && (
                <div className="p-2 rounded-xl bg-surface border border-line max-w-xs space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-ink">
                    <MusicNotes size={16} className="text-purple-500" />
                    <span className="truncate">{message.attachment.name}</span>
                  </div>
                  <audio
                    src={message.attachment.url}
                    controls
                    preload="metadata"
                    className="w-full h-8 rounded-lg outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Message Text / Status */}
          {isDeleted && !isAdmin ? (
            <span className="italic text-ink-tertiary">Message deleted</span>
          ) : isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-2 min-w-[220px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-accent font-sans"
                rows={2}
                autoFocus
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 text-[11px] font-semibold text-ink-tertiary hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-accent rounded-md shadow-2xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              {message.text && <MemoizedMarkdown content={message.text} />}
              {message.isEdited && (
                <span className="text-[10px] text-ink-tertiary ml-1.5 italic font-sans">
                  (edited)
                </span>
              )}
            </>
          )}

          {/* Timestamp & Read Status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
              isSelf ? "text-accent/90" : "text-ink-tertiary"
            }`}
          >
            <span className="font-sans font-medium">{formattedTime}</span>
            {isSelf && !message.isDeleted && (
              <span title={message.status === "READ" ? "Read by recipient(s)" : message.status === "DELIVERED" ? "Delivered" : "Sent"}>
                {message.status === "READ" ? (
                  <Checks size={15} className="text-[#53bdeb] dark:text-[#53bdeb] font-bold" />
                ) : message.status === "DELIVERED" ? (
                  <Checks size={15} className="text-slate-400 opacity-80" />
                ) : (
                  <Check size={13} className="text-slate-400 opacity-80" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* WhatsApp-Style Reaction Pills */}
        {Object.entries(reactionGroups).length > 0 && (!isDeleted || isAdmin) && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isSelf ? "justify-end" : "justify-start"}`}>
            {Object.entries(reactionGroups).map(([emoji, group]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setSelectedEmojiFilter(emoji);
                  setShowReactionDetails(!showReactionDetails);
                }}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border cursor-pointer transition-all select-none ${
                  group.hasReacted
                    ? "bg-accent/15 border-accent/40 text-accent shadow-2xs scale-105 hover:bg-accent/25"
                    : "bg-surface-alt hover:bg-surface border-line text-ink-secondary"
                }`}
                title="Click to view reaction details or remove"
              >
                <span>{emoji}</span>
                <span className="text-[10px]">{group.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Local Anchored Popover Window for Reaction Details */}
        {showReactionDetails && (
          <div
            className={`absolute bottom-6 z-40 w-64 sm:w-72 bg-[#181B22] border border-line/80 rounded-2xl shadow-2xl overflow-hidden space-y-0 text-white animate-in fade-in zoom-in-95 duration-150 select-none ${
              isSelf ? "right-0" : "left-0"
            }`}
          >
            {/* Header Bar */}
            <div className="p-3 border-b border-line/60 flex items-center justify-between bg-[#14161C]">
              <h3 className="text-xs font-extrabold text-white font-sans">
                {allReactions.length} {allReactions.length === 1 ? "reaction" : "reactions"}
              </h3>
              <button
                type="button"
                onClick={() => setShowReactionDetails(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Filter Tabs Bar */}
            <div className="px-3 py-2 border-b border-line/60 flex items-center gap-1.5 overflow-x-auto bg-[#14161C]/50">
              <button
                type="button"
                onClick={() => setSelectedEmojiFilter(null)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedEmojiFilter === null
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Smiley size={14} />
                <span>All</span>
              </button>

              {Object.entries(reactionGroups).map(([emoji, group]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmojiFilter(emoji)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedEmojiFilter === emoji
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px]">{group.count}</span>
                </button>
              ))}
            </div>

            {/* User Reaction List */}
            <div className="p-1.5 max-h-56 overflow-y-auto space-y-0.5 divide-y divide-line/30">
              {filteredReactions.map((r, idx) => {
                const isSelfReaction = r.memberId === currentMemberId;
                return (
                  <div
                    key={`${r.memberId}_${r.emoji}_${idx}`}
                    onClick={() => {
                      if (isSelfReaction) {
                        handleToggleReaction(r.emoji);
                        setShowReactionDetails(false);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                      isSelfReaction
                        ? "hover:bg-rose-500/10 group/row"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={r.memberAvatar || "/oggy.png"}
                        alt={r.memberName}
                        loading="lazy"
                        decoding="async"
                        className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-white block truncate">
                          {isSelfReaction ? "You" : r.memberName}
                        </span>
                        <span
                          className={`text-[10px] block truncate font-medium ${
                            isSelfReaction
                              ? "text-slate-400 group-hover/row:text-rose-400 group-hover/row:underline"
                              : "text-slate-400"
                          }`}
                        >
                          {isSelfReaction ? "Click to remove" : `@${(r.memberName || "").toLowerCase()}`}
                        </span>
                      </div>
                    </div>

                    <span className="text-base shrink-0">{r.emoji}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Smiley Trigger Icon Button */}
      {(!isDeleted || isAdmin) && (
        <div className={`transition-opacity self-center relative shrink-0 ${
          showReactionPicker ? "opacity-100 z-40" : "opacity-0 group-hover:opacity-100"
        }`}>
          <button
            type="button"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="w-7 h-7 rounded-full bg-[#20232B] hover:bg-[#2A2E39] border border-line/60 text-ink-tertiary hover:text-ink flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="React to message"
          >
            <Smiley size={16} />
          </button>

          {/* Reaction Popover Window */}
          {showReactionPicker && (
            <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-[#181B22] border border-line/80 shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggleReaction(emoji)}
                  className="w-7 h-7 rounded-full hover:bg-surface-hover text-base flex items-center justify-center transition-transform hover:scale-130 cursor-pointer active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Right-Click Context Menu */}
      {contextMenuPos && (
        <div
          ref={contextMenuRef}
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          className="fixed z-50 bg-[#181A20] border border-line/80 rounded-2xl shadow-2xl py-1.5 w-36 text-xs font-sans animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {message.text && (
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                handleCopyText();
              }}
              className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-surface-hover text-ink cursor-pointer text-xs font-medium"
            >
              <Copy size={14} className="text-ink-tertiary" />
              <span>Copy</span>
            </button>
          )}

          {isSelf && !message.isDeleted && message.text && (
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setContextMenuPos(null);
              }}
              className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-surface-hover text-ink cursor-pointer text-xs font-medium"
            >
              <Pencil size={14} className="text-accent" />
              <span>Edit</span>
            </button>
          )}

          {canDelete && (
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                if (onDeleteMessage) onDeleteMessage(message.id);
                setContextMenuPos(null);
              }}
              className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-rose-500/10 text-rose-500 cursor-pointer text-xs font-medium border-t border-line/40 mt-1"
            >
              <Trash size={14} />
              <span>{isAdmin && !isSelf ? "Delete (Admin)" : "Delete"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.text === next.message.text &&
    prev.message.status === next.message.status &&
    prev.message.isEdited === next.message.isEdited &&
    prev.message.isDeleted === next.message.isDeleted &&
    prev.message.isDeletedByAdmin === next.message.isDeletedByAdmin &&
    prev.isSelf === next.isSelf &&
    prev.showSenderHeader === next.showSenderHeader &&
    prev.currentMemberId === next.currentMemberId &&
    prev.isAdmin === next.isAdmin &&
    (prev.message.reactions?.length || 0) === (next.message.reactions?.length || 0) &&
    prev.message.attachment?.url === next.message.attachment?.url
  );
});
