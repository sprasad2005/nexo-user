import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Conversation } from "@/types/nexo";
import { useNexo } from "@/context/NexoContext";
import { Users, X, UserPlus, Trash, ShieldCheck, Check, Plus } from "@phosphor-icons/react";

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onMemberUpdated?: () => void;
}

export function GroupInfoModal({
  isOpen,
  onClose,
  conversation,
  onMemberUpdated,
}: GroupInfoModalProps) {
  const { members, currentMember, currentUser } = useNexo();
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "ADD">("MEMBERS");
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isOpen || !conversation || conversation.type !== "GROUP" || !isMounted) return null;

  const activeRole = currentMember?.role || currentUser?.role;
  const isAdmin = activeRole === "ADMIN" || activeRole === "SUPER_ADMIN";
  const isMainGroup = conversation.id === "conv_grp_main";

  const groupParticipants = conversation.participants || [];
  const participantIds = new Set(groupParticipants.map((p) => p.id));
  const nonGroupMembers = members.filter((m) => !participantIds.has(m.id));

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleAddMember = async (memberId: string) => {
    setLoadingMemberId(memberId);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("Member added to group!");
        if (onMemberUpdated) onMemberUpdated();
      } else {
        showFeedback(data.error || "Failed to add member", "error");
      }
    } catch {
      showFeedback("Network error adding member", "error");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setLoadingMemberId(memberId);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("Member removed from group!");
        if (onMemberUpdated) onMemberUpdated();
      } else {
        showFeedback(data.error || "Failed to remove member", "error");
      }
    } catch {
      showFeedback("Network error removing member", "error");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between bg-surface-alt/50">
          <div className="flex items-center gap-3">
            <img
              src={conversation.avatar || "/oggy.png"}
              alt={conversation.title}
              className="w-10 h-10 rounded-full object-cover border border-line shrink-0"
            />
            <div>
              <h3 className="text-sm font-extrabold text-ink">{conversation.title}</h3>
              <p className="text-[11px] text-ink-tertiary">
                {groupParticipants.length} group member(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {msg && (
          <div className={`mx-4 p-2.5 rounded-xl text-xs font-bold ${
            msg.type === "success" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
          }`}>
            {msg.text}
          </div>
        )}

        {/* Navigation Tabs */}
        {isAdmin && !isMainGroup && (
          <div className="px-4 flex border-b border-line gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab("MEMBERS")}
              className={`pb-2 transition-all cursor-pointer border-b-2 ${
                activeTab === "MEMBERS"
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-tertiary hover:text-ink"
              }`}
            >
              Current Members ({groupParticipants.length})
            </button>
            <button
              onClick={() => setActiveTab("ADD")}
              className={`pb-2 transition-all cursor-pointer border-b-2 ${
                activeTab === "ADD"
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-tertiary hover:text-ink"
              }`}
            >
              Add Members ({nonGroupMembers.length})
            </button>
          </div>
        )}

        <div className="p-4 pt-0 space-y-3 max-h-72 overflow-y-auto">
          {activeTab === "MEMBERS" ? (
            <div className="space-y-2">
              {groupParticipants.map((m) => {
                const isSelf = m.id === currentMember?.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface-alt/40 border border-line/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.avatar || "/oggy.png"}
                        alt={m.name}
                        className="w-8 h-8 rounded-full object-cover border border-line shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-ink truncate">{m.name}</span>
                          {isSelf && (
                            <span className="text-[9px] font-mono text-accent bg-accent/10 px-1 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-ink-tertiary truncate block">
                          @{m.username} • {m.role}
                        </span>
                      </div>
                    </div>

                    {isAdmin && !isMainGroup && !isSelf && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={loadingMemberId === m.id}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 shrink-0"
                        title="Remove member from group"
                      >
                        <Trash size={14} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {nonGroupMembers.length === 0 ? (
                <p className="text-xs text-ink-tertiary text-center py-6">All registered members are already in this group.</p>
              ) : (
                nonGroupMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface-alt/40 border border-line/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.avatar || "/oggy.png"}
                        alt={m.name}
                        className="w-8 h-8 rounded-full object-cover border border-line shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-ink truncate block">{m.name}</span>
                        <span className="text-[10px] text-ink-tertiary truncate block">
                          @{m.username} • {m.role}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddMember(m.id)}
                      disabled={loadingMemberId === m.id}
                      className="px-2.5 py-1 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus size={13} weight="bold" />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
