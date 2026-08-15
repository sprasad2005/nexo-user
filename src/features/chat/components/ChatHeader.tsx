"use client";

import React from "react";
import { Conversation, Member, UserPresenceStatus } from "@/types/nexo";
import { ArrowLeft, TrendUp, Users, ArrowUpRight } from "@phosphor-icons/react";

import { GroupInfoModal } from "./GroupInfoModal";

interface ChatHeaderProps {
  conversation: Conversation;
  currentMemberId: string;
  presenceStatus?: UserPresenceStatus;
  onBackMobile?: () => void;
  onOpenIpoPage?: (ipoId: string) => void;
  onMemberUpdated?: () => void;
}

export function ChatHeader({
  conversation,
  currentMemberId,
  presenceStatus = "ONLINE",
  onBackMobile,
  onOpenIpoPage,
  onMemberUpdated,
}: ChatHeaderProps) {
  const [isGroupInfoOpen, setIsGroupInfoOpen] = React.useState(false);
  const isDirect = conversation.type === "DIRECT";
  const isIpo = conversation.type === "IPO";
  const isGroup = conversation.type === "GROUP";

  let title = conversation.title;
  let avatar = conversation.avatar || "/oggy.png";
  let subtitle = `${conversation.participants?.length || 2} members`;

  if (isDirect && conversation.otherMember) {
    const handle = (conversation.otherMember.username || conversation.otherMember.name).toLowerCase();
    title = `@${handle}`;
    avatar = conversation.otherMember.avatar || "/oggy.png";
    subtitle = conversation.otherMember.name;
  } else if (isIpo) {
    subtitle = `IPO Group Chat • ${conversation.participants?.length || 3} participants`;
  }

  const participantsList = conversation.participants || [];

  return (
    <div className="h-16 px-4 sm:px-5 bg-surface/90 backdrop-blur-md border-b border-line/70 flex items-center justify-between shrink-0 select-none z-10 font-sans">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        {onBackMobile && (
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 -ml-1.5 rounded-xl text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
            title="Back to Messages"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* Avatar / Icon Stack */}
        <div className="relative shrink-0 flex items-center">
          {isIpo ? (
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent border border-accent/25 flex items-center justify-center font-bold text-sm shadow-xs">
              <TrendUp size={18} />
            </div>
          ) : (
            <img
              src={avatar}
              alt={title}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-line bg-surface-alt"
            />
          )}

          {isDirect && (
            <span
              className={`w-2.5 h-2.5 rounded-full ring-2 ring-surface absolute bottom-0 right-0 ${
                presenceStatus === "ONLINE" ? "bg-emerald-500" : "bg-ink-tertiary"
              }`}
            />
          )}
        </div>

        {/* Title & Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-black text-ink tracking-tight truncate leading-snug">
              {title}
            </h3>
            {isDirect && conversation.otherMember?.role === "ADMIN" && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-400 font-mono font-bold uppercase tracking-wider border border-amber-500/30">
                Admin
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-tertiary font-medium leading-none mt-0.5">
            {isDirect ? (
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    presenceStatus === "ONLINE" ? "bg-emerald-500 animate-pulse" : "bg-ink-tertiary"
                  }`}
                />
                <span className="text-[11px] font-sans">
                  {presenceStatus === "ONLINE" ? "Online" : "Offline"}
                </span>
              </span>
            ) : (
              <span className="truncate text-[11px] font-sans">{subtitle}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right Action & Participant Avatars */}
      <div className="flex items-center gap-3">
        {!isDirect && participantsList.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-2 mr-1">
            {participantsList.slice(0, 3).map((p, idx) => (
              <img
                key={p.id || idx}
                src={p.avatar || "/oggy.png"}
                alt={p.name}
                title={p.name}
                className="w-6 h-6 rounded-full border-2 border-surface object-cover shadow-2xs"
              />
            ))}
          </div>
        )}

        {isGroup && (
          <button
            onClick={() => setIsGroupInfoOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-surface-alt hover:bg-surface-hover border border-line text-xs font-bold text-ink transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="View or manage group members"
          >
            <Users size={14} weight="bold" />
            <span>Group Members</span>
          </button>
        )}

        {isIpo && conversation.ipoId && onOpenIpoPage && (
          <button
            onClick={() => onOpenIpoPage(conversation.ipoId!)}
            className="px-3 py-1.5 rounded-xl bg-accent-soft/70 hover:bg-accent-soft border border-accent/25 text-xs font-bold text-accent transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
          >
            <span>View IPO Details</span>
            <ArrowUpRight size={13} weight="bold" />
          </button>
        )}

        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          conversation={conversation}
          onMemberUpdated={onMemberUpdated}
        />
      </div>
    </div>
  );
}
