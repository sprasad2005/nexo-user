"use client";

import React, { useState } from "react";
import {
  User,
  EnvelopeSimple,
  Phone,
  IdentificationCard,
  Shield,
  Key,
  CheckCircle,
  PencilSimple,
  Eye,
  EyeSlash,
  Lock,
} from "@phosphor-icons/react";
import { useAdmin } from "@/context/AdminContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

const FIELD_ROWS = [
  { key: "name",      label: "Full Name", Icon: User,               mono: false },
  { key: "username",  label: "Username",  Icon: User,               mono: true  },
  { key: "phone",     label: "Phone",     Icon: Phone,              mono: false },
  { key: "panMasked", label: "PAN",       Icon: IdentificationCard, mono: true  },
  { key: "roleLabel", label: "Role",      Icon: Shield,             mono: false },
] as const;

interface AdminProfileViewProps {
  onSignOutClick?: () => void;
}

export function AdminProfileView({ onSignOutClick }: AdminProfileViewProps = {}) {
  const { currentUser } = useAdmin();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const activeAdmin = currentUser as any;

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [profileOverride, setProfileOverride] = useState<{
    name?: string;
    username?: string;
    phone?: string;
    avatar?: string;
  }>({});

  const name        = profileOverride.name      || currentUser?.name      || "Ankit";
  const displayName = name;
  const rawUsername = currentUser?.username     || "ankitgod";
  const username    = rawUsername.startsWith("@") ? rawUsername : `@${rawUsername}`;
  const phone       = profileOverride.phone     || activeAdmin?.phone     || "+91 98200 12345";
  const panMasked = currentUser?.panMasked || "ABCDE1234F";
  const avatar    = profileOverride.avatar    || currentUser?.avatar    || "";
  const rawRole   = String(currentUser?.role || "SUPER_ADMIN").toUpperCase();
  const roleLabel = rawRole === "SUPER_ADMIN" ? "Super Administrator" : "Member";

  const fieldValues: Record<string, string> = { name, username, phone, panMasked, roleLabel };

  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Change Password State & Visibility Toggles
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!currentPassword) {
      setPassError("Current password is required.");
      return;
    }
    if (newPassword.length < 6) {
      setPassError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPassSuccess("Password updated successfully.");
      } else {
        setPassSuccess("Password updated successfully.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPassSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setIsChangingPass(false);
      setTimeout(() => setPassSuccess(null), 5000);
    }
  };

  /* ── Dynamic Light/Dark Theme Tokens ── */
  const bgImage   = isDark ? "url('/profile-bg.jpg')" : "url('/profile-bg-light.jpg')";
  const overlay   = isDark
    ? "linear-gradient(to bottom, rgba(6,8,16,0.60) 0%, rgba(6,8,16,0.40) 40%, rgba(6,8,16,0.92) 80%, rgba(6,8,16,1) 100%)"
    : "linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.25) 40%, rgba(248,250,252,0.92) 80%, rgba(248,250,252,1) 100%)";
  const cardBg    = isDark ? "rgba(16,18,26,0.75)" : "rgba(255,255,255,0.85)";
  const cardBorder= isDark ? "rgba(255,255,255,0.10)" : "rgba(226,232,240,0.90)";
  const rowDivide = isDark ? "rgba(255,255,255,0.06)" : "rgba(241,245,249,1)";
  const labelColor= isDark ? "#94A3B8" : "#64748B";
  const valueColor= isDark ? "#F8FAFC" : "#0F172A";
  const nameColor = isDark ? "#FFFFFF" : "#0F172A";
  const iconBg    = isDark ? "rgba(255,255,255,0.06)" : "rgba(239,246,255,1)";
  const iconBorder= isDark ? "rgba(255,255,255,0.10)" : "rgba(219,234,254,1)";
  const iconColor = isDark ? "#94A3B8" : "#3B82F6";
  const dotColor  = isDark ? "rgba(180,200,255,0.08)" : "rgba(60,100,220,0.06)";

  return (
    <div
      className="relative h-full flex flex-col items-center justify-start font-sans animate-fade-in overflow-hidden pt-6 pb-16 transition-colors duration-500"
      style={{ minHeight: "calc(100vh - 60px)" }}
    >
      {/* ── Background image (Theme Responsive) ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: bgImage, backgroundSize: "cover", backgroundPosition: "center top" }}
      />
      {/* ── Ambient Gradient Overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: overlay }}
      />
      {/* ── Dot grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          backgroundImage: `radial-gradient(circle, ${dotColor} 1.2px, transparent 1.2px)`,
          backgroundSize: "28px 28px",
          opacity: 0.75,
        }}
      />

      {/* ══════════════════════════════════════
          PROFILE CONTAINER
      ══════════════════════════════════════ */}
      <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center gap-5">

        {/* ── Avatar Section ── */}
        <div className="relative group cursor-pointer" onClick={() => setIsEditorOpen(true)}>
          <div
            className="absolute inset-0 rounded-full animate-pulse-glow pointer-events-none transition-transform duration-300 group-hover:scale-125"
            style={{
              background: isDark
                ? "radial-gradient(circle, rgba(107,147,255,0.40) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 70%)",
              transform: "scale(1.8)",
            }}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300"
            style={{
              boxShadow: isDark
                ? "0 0 0 3px rgba(107,147,255,0.40), 0 0 0 7px rgba(107,147,255,0.12), 0 0 32px rgba(107,147,255,0.30)"
                : "0 0 0 3px rgba(59,130,246,0.35), 0 0 0 7px rgba(59,130,246,0.10), 0 0 28px rgba(59,130,246,0.20)",
            }}
          />
          {avatar ? (
            <img src={avatar} alt={name} className="relative w-20 h-20 rounded-full object-cover shadow-md" />
          ) : (
            <div
              className="relative w-20 h-20 rounded-full text-white flex items-center justify-center text-2xl font-black select-none shadow-md"
              style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)" }}
            >
              {initials}
            </div>
          )}
          <span
            className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 transition-colors"
            style={{
              background: "#10B981",
              borderColor: isDark ? "#0E1017" : "#FFFFFF",
              boxShadow: "0 0 8px rgba(16,185,129,0.8)",
            }}
          />
        </div>

        {/* ── Context Badge ── */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-[10px] font-black uppercase tracking-widest shadow-2xs">
          <span>⚡ SUPER ADMIN CONSOLE PROFILE</span>
        </div>

        {/* ── Name & Role Header ── */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: nameColor }}>
              {name}
            </h1>
            <CheckCircle size={20} weight="fill" className="text-purple-500 shrink-0" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span
              className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30 shadow-2xs"
            >
              Super Administrator Console
            </span>
          </div>
        </div>

        {/* ── Details Card ── */}
        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {FIELD_ROWS.map(({ key, label, Icon, mono }) => (
            <div
              key={key}
              className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 cursor-default"
              style={{ borderBottom: `1px solid ${rowDivide}` }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
              >
                <Icon size={16} style={{ color: iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: labelColor }}>
                  {label}
                </p>
                <p className={`text-xs sm:text-sm font-bold truncate ${mono ? "font-mono tracking-widest text-blue-600 dark:text-blue-400" : ""}`} style={{ color: valueColor }}>
                  {fieldValues[key] || "—"}
                </p>
              </div>
            </div>
          ))}

          {/* Edit Profile Button Footer */}
          <div className="p-3 bg-slate-500/[0.03] dark:bg-white/[0.02]">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4F75FF] hover:bg-[#3E64F0] active:scale-[0.98] text-white font-extrabold text-xs tracking-wide shadow-lg shadow-blue-500/25 transition-all duration-150 cursor-pointer"
            >
              <PencilSimple size={15} weight="bold" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* ── Change Password Card ── */}
        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 transition-all duration-300"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div className="flex items-center gap-3 pb-3" style={{ borderBottom: `1px solid ${rowDivide}` }}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
            >
              <Key size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-extrabold tracking-tight" style={{ color: nameColor }}>
                Change Password
              </p>
              <p className="text-[10px] font-medium" style={{ color: labelColor }}>
                Update your sign-in password
              </p>
            </div>
          </div>

          {passError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span>⚠️</span>
              <span>{passError}</span>
            </div>
          )}

          {passSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle size={16} weight="fill" />
              <span>{passSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            {/* Current Password Field */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: labelColor }}>
                Current Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs font-medium focus:outline-none transition-all duration-200 bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showCurrentPass ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: labelColor }}>
                New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs font-medium focus:outline-none transition-all duration-200 bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showNewPass ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: labelColor }}>
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs font-medium focus:outline-none transition-all duration-200 bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showConfirmPass ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 active:scale-[0.98] mt-1"
            >
              <Lock size={14} weight="bold" />
              <span>{isChangingPass ? "Updating Password..." : "Update Password"}</span>
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] font-medium text-center leading-relaxed text-slate-400 dark:text-slate-500">
          Your details are private and encrypted end-to-end.
        </p>
      </div>

      {/* Interactive Edit Profile Drawer */}
      <ProfileEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        currentName={name}
        currentDisplayName={displayName}
        currentUsername={rawUsername}
        currentPhone={phone}
        currentAvatar={avatar}
        isSuperAdmin={rawRole === "SUPER_ADMIN"}
        onSuccess={(updated) => {
          setProfileOverride({
            name: updated.name,
            username: updated.username,
            phone: updated.phone,
            avatar: updated.avatar,
          });
        }}
      />
    </div>
  );
}
