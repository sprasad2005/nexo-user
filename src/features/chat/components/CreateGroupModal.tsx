import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNexo } from "@/context/NexoContext";
import { Users, X, Plus, Check, ShieldCheck, UploadSimple, Camera } from "@phosphor-icons/react";

const PRESET_AVATARS = [
  { name: "Oggy", path: "/oggy.png" },
  { name: "Jack", path: "/jack.png" },
  { name: "Shinchan", path: "/sinchan.png" },
  { name: "Doraemon", path: "/doremon.png" },
  { name: "Japlu", path: "/japlu.png" },
];

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: any) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
}: CreateGroupModalProps) {
  const { members, currentMember } = useNexo();
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("/oggy.png");
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isOpen || !isMounted) return null;

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image file must be less than 2MB");
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!groupTitle.trim()) {
      setErrorMsg("Please enter a group name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const avatarToUse = customAvatarUrl.trim() || selectedAvatar;
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GROUP",
          title: groupTitle.trim(),
          avatar: avatarToUse,
          participantIds: selectedMemberIds,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onGroupCreated(data.conversation);
        setGroupTitle("");
        setSelectedAvatar("/oggy.png");
        setCustomAvatarUrl("");
        setSelectedMemberIds([]);
        onClose();
      } else {
        setErrorMsg(data.error || "Failed to create group.");
      }
    } catch (err: any) {
      setErrorMsg("Network error creating group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between bg-surface-alt/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center">
              <Users size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-ink">Create New Group Chat</h3>
              <p className="text-[11px] text-ink-tertiary">Select members to include in this private group</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="p-4 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Group Logo Selector */}
          <div className="space-y-2 p-3 rounded-2xl bg-surface-alt/40 border border-line/60">
            <label className="text-xs font-bold text-ink block">Group Logo / Icon</label>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <img
                  src={customAvatarUrl.trim() || selectedAvatar}
                  alt="Group Logo Preview"
                  className="w-12 h-12 rounded-full object-cover border-2 border-line shrink-0 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                >
                  <Camera size={16} weight="bold" />
                </button>
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((p) => (
                    <button
                      key={p.path}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(p.path);
                        setCustomAvatarUrl("");
                      }}
                      className={`p-0.5 rounded-full border-2 transition-all cursor-pointer shrink-0 ${
                        selectedAvatar === p.path && !customAvatarUrl
                          ? "border-accent scale-105 shadow-sm"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={p.path} alt={p.name} className="w-7 h-7 rounded-full object-cover" />
                    </button>
                  ))}
                </div>

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
                    className="px-2 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-line text-[11px] font-bold text-ink flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <UploadSimple size={12} />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Group Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink block">Group Name *</label>
            <input
              type="text"
              placeholder="e.g. High Net Worth Investors, VIP Syndicate..."
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-alt border border-line text-xs font-semibold text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-accent transition-all"
              required
            />
          </div>

          {/* Member Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">
                Select Members ({selectedMemberIds.length} selected)
              </label>
              <button
                type="button"
                onClick={() =>
                  setSelectedMemberIds(
                    selectedMemberIds.length === members.length
                      ? []
                      : members.map((m) => m.id)
                  )
                }
                className="text-[11px] text-accent font-bold hover:underline cursor-pointer"
              >
                {selectedMemberIds.length === members.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-line rounded-xl p-2 bg-surface-alt/30">
              {members.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                const isSelf = m.id === currentMember?.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMemberSelection(m.id)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-accent/10 border-accent/30 text-ink"
                        : "bg-surface hover:bg-surface-hover border-line/60 text-ink-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.avatar || "/oggy.png"}
                        alt={m.name}
                        className="w-7 h-7 rounded-full object-cover border border-line shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-ink truncate">
                            {m.name}
                          </span>
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

                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-accent border-accent text-white"
                          : "border-line bg-surface"
                      }`}
                    >
                      {isSelected && <Check size={12} weight="bold" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-ink-secondary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-extrabold transition-all shadow-md shadow-accent/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              <span>{isSubmitting ? "Creating..." : "Create Group"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
