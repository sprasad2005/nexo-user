"use client";

import React, { useState, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getProfile } from "@/src/features/profile/api";
import { UserProfile } from "@/src/features/profile/types";
import { ProfileEditor } from "../profile/ProfileEditor";
import {
  PencilSimple,
  EnvelopeSimple,
  Phone,
  Shield,
  User,
  CheckCircle,
  LockKey,
} from "@phosphor-icons/react";
import { ChangePasswordModal } from "../profile/ChangePasswordModal";

const FIELD_ROWS = [
  { key: "name",      label: "Full Name",     Icon: User,   mono: false },
  { key: "username",  label: "Username",      Icon: User,   mono: true  },
  { key: "phone",     label: "Phone",         Icon: Phone,  mono: false },
  { key: "roleLabel", label: "Role",          Icon: Shield, mono: false },
] as const;

export function ProfileView() {
  const { currentUser, members, updateCurrentUser } = useNexo();
  const { theme } = useTheme();
  const activeUser = currentUser || members[0];
  const isDark = theme === "dark";

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await getProfile();
        if (res?.profile) setProfileData(res.profile);
      } catch (e) {}
    }
    loadProfile();
  }, []);

  const name        = activeUser?.name      || profileData?.name      || "Ankit";
  const displayName = name;
  const rawUsername = activeUser?.username  || profileData?.username  || "ankitgod";
  const username    = rawUsername.startsWith("@") ? rawUsername : `@${rawUsername}`;
  const phone       = activeUser?.phone     || profileData?.phone     || "+91 98200 12345";
  const avatar      = activeUser?.avatar    || profileData?.avatar    || "";
  const rawRole     = String(activeUser?.role || profileData?.role || "MEMBER").toUpperCase();
  const role        = rawRole === "SUPER_ADMIN" ? "MEMBER" : rawRole;
  const roleLabel   = role === "ADMIN" ? "Administrator" : "Member";

  const fieldValues: Record<string, string> = { name, username, phone, roleLabel };

  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
      className="relative min-h-[calc(100vh-60px)] flex flex-col items-center justify-center font-sans animate-fade-in overflow-hidden py-8 pb-24 sm:pb-8 transition-colors duration-500"
    >
      {/* ── Background image (Theme Responsive) ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: bgImage, backgroundSize: "cover", backgroundPosition: "center top" }}
      />
      {/* ── Overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: overlay }}
      />
      {/* ── Dot grid ── */}
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

        {/* ── Avatar ── */}
        <div className="relative group cursor-pointer" onClick={() => setIsEditorOpen(true)}>
          <div
            className="absolute inset-0 rounded-full animate-pulse-glow pointer-events-none transition-transform duration-300 group-hover:scale-125"
            style={{
              background: isDark
                ? "radial-gradient(circle, rgba(107,147,255,0.40) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 70%)",
              transform: "scale-1.8",
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest shadow-2xs">
          <span>👤 USER WORKSPACE PROFILE</span>
        </div>

        {/* ── Name ── */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: nameColor }}>
              {name}
            </h1>
            <CheckCircle size={20} weight="fill" className="text-blue-500 shrink-0" />
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
              {key !== "roleLabel" && (
                <PencilSimple
                  size={14}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer text-blue-500"
                  onClick={() => setIsEditorOpen(true)}
                />
              )}
            </div>
          ))}

          {/* Profile Action Buttons */}
          <div className="p-3 bg-slate-500/[0.03] dark:bg-white/[0.02] flex items-center gap-2.5">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4F75FF] hover:bg-[#3E64F0] active:scale-[0.98] text-white font-extrabold text-xs tracking-wide shadow-lg shadow-blue-500/25 transition-all duration-150 cursor-pointer"
            >
              <PencilSimple size={15} weight="bold" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-[#1E263B] dark:hover:bg-[#2A3550] border border-slate-700/60 dark:border-[#2D3A58] active:scale-[0.98] text-slate-100 font-extrabold text-xs tracking-wide shadow-md transition-all duration-150 cursor-pointer"
            >
              <LockKey size={15} weight="bold" className="text-blue-400" />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] font-medium text-center leading-relaxed text-slate-400 dark:text-slate-500">
          Your details are private and encrypted end-to-end.
        </p>
      </div>

      {/* Edit Profile Drawer */}
      <ProfileEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        currentName={name}
        currentDisplayName={displayName}
        currentUsername={rawUsername}
        currentPhone={phone}
        currentAvatar={avatar}
        isSuperAdmin={currentUser?.role === "SUPER_ADMIN"}
        onSuccess={(updated) => {
          setProfileData((prev) => ({ ...(prev || ({} as any)), ...updated }));
          updateCurrentUser({
            name: updated.name,
            avatar: updated.avatar,
            username: updated.username,
          });
        }}
      />
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
