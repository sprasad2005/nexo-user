"use client";

import React from "react";
import { Conversation } from "@/types/nexo";
import { TrendUp } from "@phosphor-icons/react";

interface ConversationListItemProps {
  conversation: Conversation;
  isActive: boolean;
  currentMemberId: string;
  onClick: () => void;
}

export const ConversationListItem = React.memo(function ConversationListItem({
  conversation,
  isActive,
  onClick,
}: ConversationListItemProps) {
  const isUnread = (conversation.unreadCount || 0) > 0;
  const isDirect = conversation.type === "DIRECT";
  const isIpo = conversation.type === "IPO";

  let title = conversation.title;
  let avatar = conversation.avatar || "/oggy.png";

  if (isDirect && conversation.otherMember) {
    const handle = (conversation.otherMember.username || conversation.otherMember.name).toLowerCase();
    title = `@${handle}`;
    avatar = conversation.otherMember.avatar || "/oggy.png";
  }

  const formatRelativeTime = (rawDate?: string | Date) => {
    if (!rawDate) return "";
    const date = new Date(rawDate);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formattedTime = formatRelativeTime(conversation.lastMessageAt);

  return (
    <button
      onClick={onClick}
      className={`w-full h-[68px] px-3.5 flex items-center gap-3 transition-all duration-150 border-b border-line/50 cursor-pointer select-none text-left relative ${
        isActive
          ? "bg-accent/10 dark:bg-accent/15 border-accent/40 font-medium"
          : "hover:bg-surface-hover/80 bg-surface/30"
      }`}
    >
      {/* Active Indicator Bar */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-accent shadow-xs" />
      )}

      {/* Avatar Container */}
      <div className="relative shrink-0">
        {isIpo ? (
          <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent border border-accent/25 flex items-center justify-center font-bold text-sm shadow-xs">
            <TrendUp size={20} />
          </div>
        ) : (
          <img
            src={avatar}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-11 h-11 rounded-full object-cover ring-1 ring-line/80 bg-surface-alt"
          />
        )}

        {isDirect && conversation.otherMember && (
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface absolute bottom-0 right-0" />
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1 space-y-0.5 font-sans">
        <div className="flex items-center justify-between gap-1.5">
          <h4
            className={`text-xs truncate tracking-tight ${
              isUnread || isActive
                ? "font-extrabold text-ink"
                : "font-semibold text-ink-secondary"
            }`}
          >
            {title}
          </h4>

          <span
            className={`text-[11px] font-sans shrink-0 ${
              isUnread ? "text-emerald-500 dark:text-emerald-400 font-extrabold" : "text-ink-tertiary font-medium"
            }`}
          >
            {formattedTime}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate leading-snug font-sans ${
              isUnread ? "font-bold text-ink dark:text-white" : "text-ink-tertiary font-normal"
            }`}
          >
            {conversation.lastMessage || "Start a conversation"}
          </p>

          {/* WhatsApp-Style Unread Counter Badge */}
          {isUnread && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold font-sans flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.currentMemberId === next.currentMemberId &&
    prev.conversation.id === next.conversation.id &&
    prev.conversation.lastMessage === next.conversation.lastMessage &&
    prev.conversation.lastMessageAt === next.conversation.lastMessageAt &&
    prev.conversation.unreadCount === next.conversation.unreadCount &&
    prev.conversation.title === next.conversation.title &&
    prev.conversation.avatar === next.conversation.avatar
  );
});
