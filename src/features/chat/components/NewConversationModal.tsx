"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNexo } from "@/context/NexoContext";
import { MemberSearchUser } from "@/types/nexo";
import { MagnifyingGlass, X, UserPlus, ChatCircleDots } from "@phosphor-icons/react";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMember: (memberId: string) => void;
}

export function NewConversationModal({
  isOpen,
  onClose,
  onSelectMember,
}: NewConversationModalProps) {
  const { members, currentUser, currentMember, openDirectChatWithUser } = useNexo();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserId = currentUser?.id || currentMember?.id || "mem_1";

  // Real-time API member search with immediate local fallback
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (isMounted && data?.success && Array.isArray(data.members)) {
          setResults(data.members);
        }
      } catch (err) {
        console.error("Failed to search members:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchMembers, 100);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  const handleClose = useCallback(() => {
    setQuery("");
    setResults([]);
    onClose();
  }, [onClose]);

  // Combine & filter available member list
  const displayMembers = useMemo(() => {
    const list = results.length > 0 ? results : members;
    const trimmed = query.trim().toLowerCase().replace(/^@/, "");

    if (!trimmed) return list;

    return list.filter((m) => {
      const nameMatch = m.name.toLowerCase().includes(trimmed);
      const userMatch = m.username ? m.username.toLowerCase().includes(trimmed) : false;
      return nameMatch || userMatch;
    });
  }, [results, members, query]);

  if (!isOpen) return null;

  const handleSelect = (memberId: string) => {
    if (memberId === currentUserId) return;
    openDirectChatWithUser(memberId);
    onSelectMember(memberId);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up select-none">
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-accent" />
            <h3 className="text-sm font-extrabold text-ink tracking-tight">New Private Message</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-ink-tertiary hover:text-ink p-1 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-line bg-surface-alt/40">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search member by @username or display name..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-line hover:border-line-strong rounded-xl text-xs font-medium text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-line/20 min-h-[240px]">
          {isLoading && displayMembers.length === 0 ? (
            <div className="text-center py-10 text-xs text-ink-tertiary">
              Searching members...
            </div>
          ) : displayMembers.length === 0 ? (
            <div className="text-center py-10 text-xs text-ink-tertiary space-y-1">
              <p className="font-bold text-ink">No members found</p>
              <p className="text-[11px]">Try searching by name or handle e.g. @ashay, @ranveer</p>
            </div>
          ) : (
            displayMembers.map((m) => {
              const isSelf = m.id === currentUserId;
              const handle = m.username || m.name.toLowerCase();

              return (
                <div
                  key={m.id}
                  onClick={() => !isSelf && handleSelect(m.id)}
                  className={`w-full p-2.5 flex items-center justify-between rounded-xl transition-all ${
                    isSelf
                      ? "opacity-60 cursor-default"
                      : "hover:bg-surface-hover cursor-pointer group"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={m.avatar || "/oggy.png"}
                      alt={m.name}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-line bg-surface-alt shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-extrabold text-ink group-hover:text-accent transition-colors">
                          {m.name}
                        </p>
                        {m.role === "ADMIN" && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold uppercase">
                            Admin
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center text-[11px] font-sans font-semibold text-accent bg-accent-soft/40 px-2 py-0.5 rounded-lg border border-accent/25 tracking-tight">
                        @{handle}
                      </span>
                    </div>
                  </div>

                  {isSelf ? (
                    <span className="px-3 py-1 rounded-xl bg-surface-alt border border-line text-ink-tertiary font-bold text-xs">
                      You
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(m.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-accent text-white hover:bg-accent-hover font-bold text-xs shadow-xs shadow-accent/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <ChatCircleDots size={14} weight="bold" />
                      <span>Message</span>
                      <span className="text-white/80 font-sans font-normal">→</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
