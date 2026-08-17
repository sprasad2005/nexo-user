"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowClockwise, ArrowsCounterClockwise } from "@phosphor-icons/react";
import { SecuritySummary, SecurityHealth, SecurityAlerts } from "@/components/admin/security/SecuritySummary";
import { ActiveSessions } from "@/components/admin/security/ActiveSessions";
import { LoginActivity } from "@/components/admin/security/LoginActivity";
import { AccountSecurity } from "@/components/admin/security/AccountSecurity";
import { RoleChanges } from "@/components/admin/security/RoleChanges";
import { ActivityTimeline } from "@/components/admin/activity/ActivityTimeline";
import { ActivityDetailDrawer } from "@/components/admin/activity/ActivityDetailDrawer";
import { AuditActivity } from "@/src/features/activity/types";
import { AdminDataCache } from "@/lib/nexoDataCache";

export function AdminSecurityView() {
  // Data states
  const [summary, setSummary] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loginEvents, setLoginEvents] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [accountStatus, setAccountStatus] = useState<any | null>(null);
  const [roleEvents, setRoleEvents] = useState<any[]>([]);

  // Apply cache on client mount
  useEffect(() => {
    const s = AdminDataCache.get("admin_security_summary");
    if (s) setSummary(s);
    const sess = AdminDataCache.get<any[]>("admin_security_sessions");
    if (sess) setSessions(sess);
    const logs = AdminDataCache.get<any[]>("admin_security_logins");
    if (logs) setLoginEvents(logs);
    const evts = AdminDataCache.get<any[]>("admin_security_events");
    if (evts) {
      setSecurityEvents(evts);
      const roleEvts = evts
        .filter((e: any) => e.eventType === "ROLE_CHANGED")
        .map((e: any) => ({
          id: e.id,
          actorName: e.actorName,
          actorUsername: e.actorUsername,
          actorRole: e.actorRole,
          targetName: e.targetName,
          createdAt: e.createdAt,
          previousRole: e.metadata?.previousRole || "MEMBER",
          newRole: e.metadata?.newRole || "ADMIN",
        }));
      setRoleEvents(roleEvts);
    }
    const acc = AdminDataCache.get("admin_security_accounts");
    if (acc) setAccountStatus(acc);
  }, []);

  const [selectedActivity, setSelectedActivity] = useState<AuditActivity | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("sessions");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSecurityData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, sessRes, logRes, evtsRes, accRes] = await Promise.all([
        fetch("/api/admin/security/summary").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/security/sessions").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/security/login-events").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/security/events?limit=50").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/security/account-status").then((r) => r.json()).catch(() => null),
      ]);

      if (sumRes?.success && sumRes.summary) {
        setSummary(sumRes.summary);
        AdminDataCache.set("admin_security_summary", sumRes.summary, 30000);
      }

      if (sessRes?.success && Array.isArray(sessRes.sessions)) {
        setSessions(sessRes.sessions);
        AdminDataCache.set("admin_security_sessions", sessRes.sessions, 30000);
      }

      if (logRes?.success && Array.isArray(logRes.loginEvents)) {
        setLoginEvents(logRes.loginEvents);
        AdminDataCache.set("admin_security_logins", logRes.loginEvents, 30000);
      }

      if (evtsRes?.success && Array.isArray(evtsRes.events)) {
        setSecurityEvents(evtsRes.events);
        AdminDataCache.set("admin_security_events", evtsRes.events, 30000);

        const roleEvts = evtsRes.events
          .filter((e: any) => e.eventType === "ROLE_CHANGED")
          .map((e: any) => ({
            id: e.id,
            actorName: e.actorName,
            actorUsername: e.actorUsername,
            actorRole: e.actorRole,
            targetName: e.targetName,
            createdAt: e.createdAt,
            previousRole: e.metadata?.previousRole || "MEMBER",
            newRole: e.metadata?.newRole || "ADMIN",
          }));
        setRoleEvents(roleEvts);
      }

      if (accRes?.success) {
        setAccountStatus(accRes);
        AdminDataCache.set("admin_security_accounts", accRes, 30000);
      }
    } catch {
      showToast("Unable to refresh security logs", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRevokeSession = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/security/sessions/${id}/revoke`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("✓ Session revoked successfully.");
        fetchSecurityData();
      } else {
        showToast(data.error || "Failed to revoke session", "error");
      }
    } catch {
      showToast("Network error revoking session", "error");
    }
  };

  return (
    <div className="space-y-6 select-none font-sans pb-16">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl border text-xs font-bold shadow-2xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
              : "bg-red-950 text-red-300 border-red-500/40"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-ink">
              Security Center &amp; Access Controls
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30 text-[10px] font-mono font-extrabold uppercase">
              Live Audits
            </span>
          </div>
          <p className="text-xs text-ink-tertiary mt-1">
            Real-time sessions, active authentication tokens, access logs, and anomaly detection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSecurityData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-line hover:bg-surface-alt text-ink text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh Security Data"
          >
            <ArrowsCounterClockwise size={14} className={isLoading ? "animate-spin text-accent" : ""} />
            <span>{isLoading ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      <SecuritySummary summary={summary} onRefresh={fetchSecurityData} isLoading={isLoading} />

      {/* Health & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <SecurityHealth summary={summary} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <SecurityAlerts summary={summary} onNavigate={() => setActiveSubTab("accounts")} />
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="border-b border-line">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "sessions", label: "Active Sessions", count: sessions.length },
            { id: "logins", label: "Login History", count: loginEvents.length },
            { id: "activity", label: "Security Logs", count: securityEvents.length },
            { id: "accounts", label: "Account Status", count: accountStatus?.members?.length || 0 },
            { id: "roles", label: "Role Changes", count: roleEvents.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-tertiary hover:text-ink hover:border-line"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeSubTab === tab.id ? "bg-accent/20 text-accent" : "bg-surface-alt text-ink-muted"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab Views */}
      <div>
        {activeSubTab === "sessions" && (
          <ActiveSessions sessions={sessions} onRevoke={handleRevokeSession} isLoading={isLoading} />
        )}
        {activeSubTab === "logins" && <LoginActivity loginEvents={loginEvents} isLoading={isLoading} />}
        {activeSubTab === "activity" && (
          <div className="rounded-2xl bg-surface border border-line p-5 shadow-2xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-tertiary mb-4">
              Security Event Audit Timeline
            </h3>
            <ActivityTimeline
              activities={securityEvents}
              onSelect={(act: AuditActivity) => setSelectedActivity(act)}
            />
          </div>
        )}
        {activeSubTab === "accounts" && (
          <AccountSecurity
            metrics={accountStatus?.metrics || null}
            suspendedAccounts={accountStatus?.suspendedAccounts || []}
            passwordRequiredAccounts={accountStatus?.passwordRequiredAccounts || []}
            onReactivate={async () => { await fetchSecurityData(); }}
            onViewMember={(id: string) => { window.location.href = `/admin/members/${id}`; }}
            isLoading={isLoading}
          />
        )}
        {activeSubTab === "roles" && (
          <RoleChanges
            roleEvents={roleEvents}
            isLoading={isLoading}
            onViewMember={(id: string) => { window.location.href = `/admin/members/${id}`; }}
          />
        )}
      </div>

      {/* Activity Detail Drawer */}
      <ActivityDetailDrawer
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
