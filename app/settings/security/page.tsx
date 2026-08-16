"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Desktop, Phone, Lock, Trash, Key, ArrowLeft, CheckCircle, Warning } from "@phosphor-icons/react";
import Link from "next/link";

interface DeviceSession {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
  ipAddress: string;
}

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch active sessions from MongoDB
  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const res = await fetch("/api/auth/sessions");
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch active sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSingle = async (sessionId: string) => {
    if (!confirm("Revoke this active device session? The device will be signed out immediately.")) return;

    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        alert(data.error || "Failed to revoke session");
      }
    } catch (err) {
      console.error("Revoke error:", err);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm("Sign out of all other devices? You will remain signed in on this current device only.")) return;

    try {
      const res = await fetch("/api/auth/sessions", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        alert(data.message || "All other sessions signed out!");
      }
    } catch (err) {
      console.error("Revoke all error:", err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmNewPassword) {
      setPwdMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 12) {
      setPwdMsg({ type: "error", text: "New password must be at least 12 characters long." });
      return;
    }

    setPwdSubmitting(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setPwdMsg({ type: "success", text: data.message });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        fetchSessions();
      } else {
        setPwdMsg({ type: "error", text: data.error || "Failed to change password." });
      }
    } catch (err) {
      console.error("Change password error:", err);
      setPwdMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setPwdSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b border-line pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl border border-line bg-surface hover:bg-surface-alt flex items-center justify-center text-ink-secondary hover:text-ink transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Security & Active Sessions</h1>
              <p className="text-xs text-ink-secondary">Manage HTTP-only cookie device sessions and password security</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted Identity Layer</span>
          </div>
        </div>

        {/* 1. ACTIVE SESSIONS SECTION */}
        <div className="bg-surface/90 border border-line rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <Desktop className="w-5 h-5 text-accent" />
                <span>Active Device Sessions</span>
              </h2>
              <p className="text-xs text-ink-secondary mt-0.5">
                Devices currently signed into your NEXO account via HTTP-only secure cookies
              </p>
            </div>

            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeAllOthers}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Trash className="w-4 h-4" />
                <span>Sign Out of All Other Devices</span>
              </button>
            )}
          </div>

          {/* Session Cards List */}
          {isLoadingSessions ? (
            <div className="py-8 text-center text-xs text-ink-secondary animate-pulse">
              Loading active sessions from MongoDB...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-secondary">No active sessions found.</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    sess.isCurrent
                      ? "bg-accent/5 border-accent/30 shadow-inner"
                      : "bg-surface-alt/40 border-line hover:border-line/80"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      sess.deviceType === "mobile" ? "bg-purple-500/10 text-purple-400" : "bg-accent/15 text-accent"
                    }`}>
                      {sess.deviceType === "mobile" ? <Phone className="w-5 h-5" /> : <Desktop className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink truncate">{sess.deviceName}</span>
                        {sess.isCurrent && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            Current Session
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary mt-0.5 truncate">
                        Last Active: {new Date(sess.lastActiveAt).toLocaleString("en-IN")} • {sess.ipAddress}
                      </p>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleRevokeSingle(sess.id)}
                      className="px-3 py-1.5 rounded-lg bg-surface border border-line hover:border-rose-500/40 hover:bg-rose-500/10 text-xs font-semibold text-ink-secondary hover:text-rose-400 transition-all shrink-0 ml-3"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. CHANGE PASSWORD SECTION */}
        <div className="bg-surface/90 border border-line rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Key className="w-5 h-5 text-accent" />
              <span>Change Password</span>
            </h2>
            <p className="text-xs text-ink-secondary mt-0.5">
              Update your password hash using NIST-approved PBKDF2 salted encryption
            </p>
          </div>

          {pwdMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                pwdMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {pwdMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <Warning className="w-4 h-4" />}
              <span>{pwdMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-alt/60 border border-line text-ink text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-1.5">
                New Password (Min 12 Characters)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-alt/60 border border-line text-ink text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-alt/60 border border-line text-ink text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={pwdSubmitting}
              className="px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all shadow-md shadow-accent/20 disabled:opacity-50"
            >
              {pwdSubmitting ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
