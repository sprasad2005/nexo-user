import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Conversation } from "@/types/nexo";
import { useNexo } from "@/context/NexoContext";
import { Users, X, UserPlus, Trash, ShieldCheck, Check, Plus, Camera, UploadSimple, Image as ImageIcon } from "@phosphor-icons/react";

const PRESET_AVATARS = [
  { name: "Oggy", path: "/oggy.png" },
  { name: "Jack", path: "/jack.png" },
  { name: "Shinchan", path: "/sinchan.png" },
  { name: "Doraemon", path: "/doremon.png" },
  { name: "Japlu", path: "/japlu.png" },
];

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
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("/oggy.png");
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>("");
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    if (conversation?.avatar) {
      setSelectedAvatar(conversation.avatar);
    }
  }, [conversation]);

  if (!isOpen || !conversation || conversation.type !== "GROUP" || !isMounted) return null;

  const activeRole = currentMember?.role || currentUser?.role;
  const isAdmin = activeRole === "SUPER_ADMIN" || activeRole === "ADMIN";
  const isMainGroup = conversation.id === "conv_grp_main";

  // Deduplicate participants to prevent duplicate key warnings
  const rawParticipants = conversation.participants || [];
  const seenGroupIds = new Set<string>();
  const groupParticipants = rawParticipants.filter((p) => {
    if (!p || !p.id || seenGroupIds.has(p.id)) return false;
    seenGroupIds.add(p.id);
    return true;
  });

  const participantIds = new Set(groupParticipants.map((p) => p.id));
  const seenNonGroupIds = new Set<string>();
  const nonGroupMembers = (members || []).filter((m) => {
    if (!m || !m.id || participantIds.has(m.id) || seenNonGroupIds.has(m.id)) return false;
    seenNonGroupIds.add(m.id);
    return true;
  });

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showFeedback("Image file must be less than 2MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSelectedAvatar(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    setIsSavingLogo(true);
    try {
      const avatarToSave = customAvatarUrl.trim() || selectedAvatar;
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarToSave }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        conversation.avatar = avatarToSave;
        showFeedback("Group logo updated successfully!");
        setIsEditingLogo(false);
        if (onMemberUpdated) onMemberUpdated();
      } else {
        showFeedback(data.error || "Failed to update group logo", "error");
      }
    } catch {
      showFeedback("Network error updating group logo", "error");
    } finally {
      setIsSavingLogo(false);
    }
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
            <div className="relative group">
              <img
                src={conversation.avatar || "/oggy.png"}
                alt={conversation.title}
                className="w-12 h-12 rounded-full object-cover border-2 border-line shrink-0 shadow-xs"
              />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsEditingLogo(!isEditingLogo)}
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                  title="Change Group Logo"
                >
                  <Camera size={16} weight="bold" />
                  <span className="text-[8px] font-bold mt-0.5">EDIT</span>
                </button>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-ink">{conversation.title}</h3>
                {isAdmin && !isEditingLogo && (
                  <button
                    type="button"
                    onClick={() => setIsEditingLogo(true)}
                    className="text-[10px] text-accent hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    Change Logo
                  </button>
                )}
              </div>
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

        {/* Super Admin Logo Editor Drawer */}
        {isAdmin && isEditingLogo && (
          <div className="mx-4 p-3.5 rounded-2xl bg-surface-alt border border-accent/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-ink flex items-center gap-1.5">
                <ImageIcon size={15} className="text-accent" />
                Change Group Logo
              </span>
              <button
                type="button"
                onClick={() => setIsEditingLogo(false)}
                className="text-[10px] text-ink-tertiary hover:text-ink cursor-pointer font-bold"
              >
                Cancel
              </button>
            </div>

            {/* Presets */}
            <div>
              <span className="text-[10px] font-bold text-ink-tertiary block mb-1.5">Select Preset Avatar</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PRESET_AVATARS.map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(p.path);
                      setCustomAvatarUrl("");
                    }}
                    className={`relative p-0.5 rounded-full border-2 transition-all cursor-pointer shrink-0 ${
                      selectedAvatar === p.path && !customAvatarUrl ? "border-accent scale-105 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={p.path} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Upload or URL */}
            <div className="pt-2 border-t border-line/60 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-line text-xs font-bold text-ink flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <UploadSimple size={14} />
                  <span>Upload Image</span>
                </button>
                <span className="text-[10px] text-ink-tertiary">or paste URL below</span>
              </div>

              <input
                type="text"
                placeholder="https://example.com/logo.png"
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-surface border border-line text-xs text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Save Action */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingLogo(false)}
                className="px-3 py-1 rounded-xl text-xs font-bold text-ink-tertiary hover:text-ink cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveLogo}
                disabled={isSavingLogo}
                className="px-3.5 py-1.5 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={14} weight="bold" />
                <span>{isSavingLogo ? "Saving..." : "Save Logo"}</span>
              </button>
            </div>
          </div>
        )}

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
              {groupParticipants.map((m, idx) => {
                const isSelf = m.id === currentMember?.id;
                return (
                  <div
                    key={`group_part_${m.id || idx}_${idx}`}
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
                nonGroupMembers.map((m, idx) => (
                  <div
                    key={`non_group_${m.id || idx}_${idx}`}
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
