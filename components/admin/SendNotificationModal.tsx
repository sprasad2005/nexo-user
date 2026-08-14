"use client";

import React, { useState } from "react";
import { X, PaperPlaneTilt, Bell, Megaphone, Info, CheckCircle, Warning, Prohibit, Sparkle } from "@phosphor-icons/react";
import { useNexo } from "@/context/NexoContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMemberId?: string;
}

export function SendNotificationModal({ isOpen, onClose, defaultMemberId }: Props) {
  const { members, ipos, sendBroadcastNotification } = useNexo();

  const [targetMemberId, setTargetMemberId] = useState<string>(defaultMemberId || "ALL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"INFO" | "SUCCESS" | "WARNING" | "CRITICAL">("WARNING");
  const [selectedIpoId, setSelectedIpoId] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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

      const res = await fetch("/api/admin/notifications", {
        method: "POST",
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
        throw new Error(data.error || "Failed to send notification.");
      }

      // Also trigger in local context state for instant real-time feedback
      if (sendBroadcastNotification) {
        sendBroadcastNotification({
          id: data.notification?.id || `notif_${Date.now()}`,
          senderName: data.notification?.senderName || "Administrator",
          targetMemberId,
          title: title.trim(),
          message: message.trim(),
          severity,
          ipoId: selectedIpo ? selectedIpo.id : undefined,
          ipoName: selectedIpo ? selectedIpo.name : undefined,
          ctaLabel: ctaLabel.trim() || (selectedIpo ? "View Details" : undefined),
          createdAt: new Date().toISOString(),
        });
      }

      setSuccessMsg("Notification sent successfully!");
      setTimeout(() => {
        setSuccessMsg(null);
        setTitle("");
        setMessage("");
        setCtaLabel("");
        setSelectedIpoId("");
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to send notification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1F232B] flex items-center justify-between bg-slate-50/50 dark:bg-[#14161C]/50 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#6B93FF]">
              <Megaphone size={20} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Send Notification</h3>
              <p className="text-xs text-slate-500 dark:text-[#858D99]">Broadcast alerts & updates to group members</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#14161C] border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="ALL">📢 All Group Members (Broadcast)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  👤 {m.name} (@{m.username || m.name.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Notification Severity */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-[#AEB5C0] uppercase tracking-wider mb-1.5">
              Notification Type / Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "INFO", label: "Info", color: "border-blue-500/40 text-blue-600 dark:text-[#6B93FF] bg-blue-500/10" },
                { id: "SUCCESS", label: "Success", color: "border-emerald-500/40 text-emerald-600 dark:text-[#32C98B] bg-emerald-500/10" },
                { id: "WARNING", label: "Warning", color: "border-amber-500/40 text-amber-600 dark:text-[#F3B85B] bg-amber-500/10" },
                { id: "CRITICAL", label: "Urgent", color: "border-rose-500/40 text-rose-600 dark:text-[#FF6B6B] bg-rose-500/10" },
              ].map((sev) => (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id as any)}
                  className={`py-2 px-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center ${
                    severity === sev.id ? sev.color + " ring-2 ring-blue-500/20" : "border-slate-200 dark:border-[#252931] text-slate-400 opacity-60"
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
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
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Check registrar portal now to verify your allotment status."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#14161C] border border-slate-200 dark:border-[#252931] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              required
            />
          </div>

          {/* Optional IPO Attachment & CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Link Active IPO (Optional)
              </label>
              <select
                value={selectedIpoId}
                onChange={(e) => setSelectedIpoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#14161C] border border-slate-200 dark:border-[#252931] text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="">None</option>
                {ipos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                Action Button Text (Optional)
              </label>
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="e.g. Check Allotment"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#14161C] border border-slate-200 dark:border-[#252931] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>
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
              <span>{isSubmitting ? "Sending..." : "Send Notification"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
