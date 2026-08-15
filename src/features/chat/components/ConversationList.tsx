"use client";

import React, { useState, useMemo } from "react";
import { Conversation } from "@/types/nexo";
import { useNexo } from "@/context/NexoContext";
import { ConversationListItem } from "./ConversationListItem";
import { MagnifyingGlass, Plus, X, ChatCircleDots, UserPlus, ChatCircle, Users, TrendUp } from "@phosphor-icons/react";

import { CreateGroupModal } from "./CreateGroupModal";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  currentMemberId: string;
  onSelectConversation: (id: string) => void;
  onOpenNewMessageModal: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  currentMemberId,
  onSelectConversation,
  onOpenNewMessageModal,
}: ConversationListProps) {
  const { members, currentMember, currentUser, openDirectChatWithUser } = useNexo();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "DIRECT" | "IPO">("ALL");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const activeRole = currentMember?.role || currentUser?.role;
  const isAdmin = activeRole === "ADMIN" || activeRole === "SUPER_ADMIN";

  const filteredConversations = useMemo(() => {
    const validConvs = conversations.filter((c) => c && c.type !== "IPO" && !c.id?.startsWith("conv_ipo_"));
    const list = !searchQuery.trim()
      ? validConvs
      : validConvs.filter((c) => {
          const q = searchQuery.toLowerCase().trim();
          const titleMatch = c.title?.toLowerCase().includes(q);
          const otherMatch = c.otherMember?.name?.toLowerCase().includes(q) || c.otherMember?.username?.toLowerCase().includes(q);
          const msgMatch = c.lastMessage?.toLowerCase().includes(q);
          return titleMatch || otherMatch || msgMatch;
        });

    const seen = new Set<string>();
    const unique = list.filter((c) => {
      if (!c || !c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    if (activeTab === "DIRECT") return unique.filter((c) => c.type === "DIRECT");
    if (activeTab === "IPO") return unique.filter((c) => c.type === "GROUP");
    return unique;
  }, [conversations, searchQuery, activeTab]);

  const matchingMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    return members.filter((m) => {
      if (m.id === currentMemberId) return false;
      const uName = (m.username || "").toLowerCase();
      const fName = (m.name || "").toLowerCase();
      return uName.includes(q) || fName.includes(q) || `@${uName}`.includes(q);
    });
  }, [members, searchQuery, currentMemberId]);

  return (
    <div className="flex flex-col h-full bg-surface border-r border-line select-none">
      {/* List Header */}
      <div className="p-3.5 border-b border-line flex items-center justify-between gap-2 shrink-0 bg-surface/90 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-ink tracking-tight">
              Messages
            </h2>
            <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-extrabold font-mono border border-accent/25">
              {conversations.length}
            </span>
          </div>
          <p className="text-[11px] text-ink-tertiary font-medium mt-0.5">
            Syndicate discussions & chats
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isAdmin && (
            <button
              onClick={() => setIsCreateGroupOpen(true)}
              className="h-8 px-2.5 rounded-xl bg-accent-soft text-accent border border-accent/20 hover:bg-accent/15 font-extrabold text-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
              title="Create new private group chat"
            >
              <Users size={14} weight="bold" />
              <span>+ Group</span>
            </button>
          )}

          <button
            onClick={onOpenNewMessageModal}
            className="h-8 px-3 rounded-xl bg-accent text-white hover:bg-accent-hover font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-accent/25 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={14} weight="bold" />
            <span>New</span>
          </button>
        </div>
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(newConv) => {
          onSelectConversation(newConv.id);
        }}
      />

      {/* Filter Tabs & Search Container */}
      <div className="p-2.5 border-b border-line/70 shrink-0 space-y-2 bg-surface-alt/30">
        {/* Segment Filter Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-surface border border-line rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-accent text-white shadow-2xs"
                : "text-ink-tertiary hover:text-ink hover:bg-surface-hover"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("DIRECT")}
            className={`py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "DIRECT"
                ? "bg-accent text-white shadow-2xs"
                : "text-ink-tertiary hover:text-ink hover:bg-surface-hover"
            }`}
          >
            <ChatCircle size={12} weight="bold" />
            <span>Direct</span>
          </button>
          <button
            onClick={() => setActiveTab("IPO")}
            className={`py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "IPO"
                ? "bg-accent text-white shadow-2xs"
                : "text-ink-tertiary hover:text-ink hover:bg-surface-hover"
            }`}
          >
            <Users size={12} weight="bold" />
            <span>Groups</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages or @username..."
            className="w-full pl-8.5 pr-8 py-1.5 bg-surface border border-line rounded-xl text-xs text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-accent transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink cursor-pointer"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono text-ink-tertiary bg-surface border border-line rounded">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-line/40">
        {/* Direct Member Search Results */}
        {matchingMembers.length > 0 && (
          <div className="p-2 border-b border-line bg-surface-alt/40 space-y-1.5">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider px-2 block">
              Start Direct Chat
            </span>
            {matchingMembers.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  openDirectChatWithUser(m.id);
                  onSelectConversation(m.id);
                  setSearchQuery("");
                }}
                className="flex items-center justify-between p-2 rounded-xl bg-surface hover:bg-accent/10 border border-line hover:border-accent/30 cursor-pointer transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={m.avatar || "/oggy.png"}
                    alt={m.name}
                    className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-line"
                  />
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-xs text-ink block truncate group-hover:text-accent">
                      @{ (m.username || m.name).toLowerCase() }
                    </span>
                    <span className="text-[10px] text-ink-tertiary block truncate">
                      {m.name}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-accent text-white text-[10px] font-extrabold shadow-2xs shrink-0 group-hover:bg-accent-hover transition-colors">
                  Message →
                </span>
              </div>
            ))}
          </div>
        )}

        {filteredConversations.length === 0 && matchingMembers.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <ChatCircleDots size={32} className="mx-auto text-ink-tertiary opacity-40" />
            <p className="text-xs font-semibold text-ink">No conversations found</p>
            <p className="text-[11px] text-ink-tertiary">
              {searchQuery ? "Try another search term" : "Click 'New Message' to start chatting"}
            </p>
          </div>
        ) : (
          filteredConversations.map((c) => (
            <ConversationListItem
              key={c.id}
              conversation={c}
              isActive={c.id === activeConversationId}
              currentMemberId={currentMemberId}
              onClick={() => onSelectConversation(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
