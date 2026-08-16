"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, PaperPlaneTilt, Megaphone, CheckCircle, PencilSimple } from "@phosphor-icons/react";
import { useNexo } from "@/context/NexoContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMemberId?: string;
  editNotification?: any;
  onNotificationSaved?: (notif: any) => void;
}

export function SendNotificationModal({
  isOpen,
  onClose,
  defaultMemberId,
  editNotification,
  onNotificationSaved,
}: Props) {
  const { members, ipos, sendBroadcastNotification } = useNexo();

  const [mounted, setMounted] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState<string>(defaultMemberId || "ALL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"INFO" | "SUCCESS" | "WARNING" | "CRITICAL">("WARNING");
  const [selectedIpoId, setSelectedIpoId] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isEditMode = Boolean(editNotification?.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editNotification) {
      setTargetMemberId(editNotification.targetMemberId || "ALL");
      setTitle(editNotification.title || "");
      setMessage(editNotification.message || "");
      setSeverity(editNotification.severity || "INFO");
      setSelectedIpoId(editNotification.ipoId || "");
      setCtaLabel(editNotification.ctaLabel || "");
    } else {
      setTargetMemberId(defaultMemberId || "ALL");
      setTitle("");
      setMessage("");
      setSeverity("WARNING");
      setSelectedIpoId("");
      setCtaLabel("");
    }
  }, [editNotification, defaultMemberId, isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a notification title.");
      return;
    }
    if (!message.trim()) {
      setError("Please enter a notification message.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const selectedIpo = ipos.find((i) => i.id === selectedIpoId);

      const endpoint = isEditMode
        ? `/api/admin/notifications/${editNotification.id}`
        : "/api/admin/notifications";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetMemberId,
          title: title.trim(),
          message: message.trim(),
          severity,
          ipoId: selectedIpo ? selectedIpo.id : null,
          ipoName: selectedIpo ? selectedIpo.name : null,
          ctaLabel: ctaLabel.trim() || (selectedIpo ? "View Details" : "Check Now"),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || `Failed to ${isEditMode ? "update" : "send"} notification.`);
      }

      if (onNotificationSaved) {
        onNotificationSaved(data.notification);
      }

      const targetName = targetMemberId === "ALL"
        ? "All Group Members"
        : (members.find((m) => m.id === targetMemberId)?.name || "Member");

      // Also trigger in local context state for instant real-time feedback
      if (!isEditMode && sendBroadcastNotification) {
        sendBroadcastNotification({
          id: data.notification?.id || `notif_${Date.now()}`,
          senderName: data.notification?.senderName || "Administrator",
          targetMemberId,
          targetMemberName: targetName,
          title: title.trim(),
          message: message.trim(),
          severity,
          createdAt: new Date().toISOString(),
        } as any);
      }

      setSuccessMsg(
        isEditMode
          ? "Notification updated successfully!"
          : `Notification successfully sent to ${targetName}!`
      );
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditMode ? "update" : "send"} notification.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col z-10">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-[#1F232B] flex items-center justify-between bg-slate-50/60 dark:bg-[#14161C]/60 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#6B93FF]">
              {isEditMode ? <PencilSimple size={20} weight="bold" /> : <Megaphone size={20} weight="bold" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {isEditMode ? "Edit Notification" : "Send Notification"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#858D99]">
                {isEditMode ? "Update broadcast notification details" : "Broadcast alerts & updates to group members"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1A1D24] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-[#FF6B6B] text-xs font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-[#32C98B] text-xs font-bold flex items-center gap-2">
              <CheckCircle size={16} weight="bold" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-[#AEB5C0] uppercase tracking-wider mb-1.5">
              Target Audience
            </label>
            <select
              value={targetMemberId}
              onChange={(e) => setTargetMemberId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#14161C] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              <option value="ALL">📢 All Group Members (Broadcast)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  👤 {m.name} (@{m.username || m.name.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-[#AEB5C0] uppercase tracking-wider mb-1.5">
              Notification Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HDB Financial Services Allotment Declared!"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#14161C] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-[#AEB5C0] uppercase tracking-wider mb-1.5">
              Message Details *
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Check registrar portal now to verify your allotment status."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#14161C] border border-slate-200 dark:border-[#252931] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              required
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-[#1F232B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-[#AEB5C0] hover:bg-slate-50 dark:hover:bg-[#1A1D24] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PaperPlaneTilt size={16} weight="bold" />
              <span>{isSubmitting ? (isEditMode ? "Updating..." : "Sending...") : (isEditMode ? "Update Notification" : "Send Notification")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
