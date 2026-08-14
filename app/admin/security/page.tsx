"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AdminProvider } from "@/admin/context/AdminContext";
import { AdminSidebar } from "@/admin/components/AdminSidebar";
import { AdminNavbarProfileMenu } from "@/components/admin/AdminNavbarProfileMenu";
import { AdminLogoutModal } from "@/components/admin/AdminLogoutModal";
import { AddIPODrawer } from "@/admin/components/AddIPODrawer";
import { ShieldCheck, ArrowClockwise, ArrowsCounterClockwise } from "@phosphor-icons/react";

// Security Component imports
import { SecuritySummary, SecurityHealth, SecurityAlerts } from "@/components/admin/security/SecuritySummary";
import { ActiveSessions } from "@/components/admin/security/ActiveSessions";
import { LoginActivity } from "@/components/admin/security/LoginActivity";
import { AccountSecurity } from "@/components/admin/security/AccountSecurity";
import { RoleChanges } from "@/components/admin/security/RoleChanges";

// Reusable Activity Timeline & Drawer components
import { ActivityTimeline } from "@/components/admin/activity/ActivityTimeline";
import { ActivityDetailDrawer } from "@/components/admin/activity/ActivityDetailDrawer";
import { AuditActivity } from "@/src/features/activity/types";

function AdminSecurityPageContent() {
  const router = useRouter();

  // Shell states
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddIpoOpen, setIsAddIpoOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("nexo_admin_authenticated") === "true") {
      return "AUTHORIZED";
    }
    return "LOADING";
  });

  // Data states
  const [summary, setSummary] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loginEvents, setLoginEvents] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [accountStatus, setAccountStatus] = useState<any | null>(null);
  const [roleEvents, setRoleEvents] = useState<any[]>([]);

  // Selected event for detail drawer
  const [selectedActivity, setSelectedActivity] = useState<AuditActivity | null>(null);

  // Tabs state: sessions, logins, activity, accounts, roles
  const [activeSubTab, setActiveSubTab] = useState("sessions");
  const [isLoading, setIsLoading] = useState(true);

  // Success Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth check
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.authenticated && (data.user?.role === "SUPER_ADMIN" || data.user?.role === "ADMIN")) {
          try {
            sessionStorage.setItem("nexo_admin_authenticated", "true");
          } catch {}
          setAdminStatus("AUTHORIZED");
        } else {
          try {
            sessionStorage.removeItem("nexo_admin_authenticated");
          } catch {}
          setAdminStatus("UNAUTHORIZED");
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        if (active) {
          try {
            sessionStorage.removeItem("nexo_admin_authenticated");
          } catch {}
          setAdminStatus("UNAUTHORIZED");
          router.replace("/admin/login");
        }
      });
    return () => { active = false; };
  }, [router]);

  // Fetch security data
  const fetchSecurityData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch summary metrics & alerts
      const sumRes = await fetch("/api/admin/security/summary");
      const sumData = await sumRes.json();
      if (sumData.success) {
        setSummary(sumData.summary);
      }

      // 2. Fetch active sessions
      const sessRes = await fetch("/api/admin/security/sessions");
      const sessData = await sessRes.json();
      if (sessData.success) {
        setSessions(sessData.sessions);
      }

      // 3. Fetch login events
      const logRes = await fetch("/api/admin/security/login-events");
      const logData = await logRes.json();
      if (logData.success) {
        setLoginEvents(logData.loginEvents);
      }

      // 4. Fetch security timeline events
      const evtsRes = await fetch("/api/admin/security/events?limit=50");
      const evtsData = await evtsRes.json();
      if (evtsData.success) {
        setSecurityEvents(evtsData.events);
        
        // Filter out role change events for the dedicated tab
        const roleEvts = evtsData.events
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

      // 5. Fetch account security statuses
      const accRes = await fetch("/api/admin/security/account-status");
      const accData = await accRes.json();
      if (accData.success) {
        setAccountStatus(accData);
      }

    } catch (err) {
      showToast("Unable to refresh security logs", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminStatus === "AUTHORIZED") {
      fetchSecurityData();
    }
  }, [adminStatus]);

  // Session revocation trigger
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

  // Reactivate suspended member trigger
  const handleReactivateMember = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/members/${id}/activate`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("✓ Account reactivated successfully.");
        fetchSecurityData();
      } else {
        showToast(data.error || "Failed to reactivate account", "error");
      }
    } catch {
      showToast("Network error reactivating member", "error");
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === "security") return;
    router.push(`/admin?tab=${tab}`);
  };

  const handleViewMemberDetails = (id: string) => {
    router.push(`/admin/members/${id}`);
  };

  if (adminStatus === "LOADING") {
    return (
      <div className="min-h-screen w-full bg-[#0A0C10] flex flex-col items-center justify-center text-slate-100 font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-500/30 text-blue-400 flex items-center justify-center animate-pulse">
            <ShieldCheck size={28} weight="bold" />
          </div>
          <p className="text-xs font-semibold text-slate-400 tracking-wide">
            Loading security console...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#090A0C] text-slate-900 dark:text-[#F5F7FA] font-sans antialiased">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="security"
        setActiveTab={handleTabChange}
        onAddIpoClick={() => setIsAddIpoOpen(true)}
        onSignOutClick={() => setIsLogoutModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 bg-surface/90 dark:bg-surface/90 border-b border-line px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shrink-0 select-none font-sans">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
              Workspace
            </span>
            <span className="text-xs font-bold text-ink-muted">/</span>
            <span className="text-xs font-extrabold text-ink uppercase tracking-wider">
              Security Center
            </span>
          </div>

          <AdminNavbarProfileMenu
            activeTab="security"
            onSelectTab={handleTabChange}
            onSignOutClick={() => setIsLogoutModalOpen(true)}
          />
        </header>

        {/* Toast Alert */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all border animate-in fade-in slide-in-from-top-4 duration-300 bg-white/95 border-slate-200 text-slate-900 dark:bg-[#14161A]/95 dark:border-[#252931] dark:text-white">
            <span className={toast.type === "success" ? "text-emerald-500" : "text-rose-500"}>
              {toast.type === "success" ? "✓" : "⚠️"}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Content Body */}
        <main className="p-4 sm:p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto space-y-6 pb-20">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#252931] pb-5 select-none">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F5F7FA]">Security Console</h1>
              <p className="text-xs text-slate-500 dark:text-[#858D99] mt-1">Monitor authentication parameters, active sessions, and administrator privileges.</p>
            </div>
            <button
              onClick={fetchSecurityData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-700 dark:text-[#AEB5C0] hover:bg-slate-50 dark:hover:bg-[#1D2026] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-center"
            >
              <ArrowClockwise size={14} className={isLoading ? "animate-spin" : ""} />
              <span>Refresh status</span>
            </button>
          </div>

          {/* Top Panel: Health Indicator + Metrics + Alerts */}
          <div className="space-y-4">
            <SecurityHealth summary={summary} isLoading={isLoading} />
            <SecuritySummary summary={summary} onRefresh={fetchSecurityData} isLoading={isLoading} />
            <SecurityAlerts summary={summary} onNavigate={handleViewMemberDetails} />
          </div>

          {/* Tab Worksheets */}
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-[#252931] select-none shrink-0 gap-1 overflow-x-auto pb-px">
              {[
                { id: "sessions", label: "Active Sessions" },
                { id: "logins", label: "Login History" },
                { id: "activity", label: "Security Activity" },
                { id: "accounts", label: "Account States" },
                { id: "roles", label: "Privilege Changes" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveSubTab(tab.id); }}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeSubTab === tab.id
                      ? "border-blue-600 dark:border-[#6B93FF] text-blue-600 dark:text-white"
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F7FA]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-6 shadow-xs min-h-[300px]">
              
              {/* TAB: ACTIVE SESSIONS */}
              {activeSubTab === "sessions" && (
                <div className="animate-in fade-in duration-200">
                  <ActiveSessions 
                    sessions={sessions} 
                    onRevoke={handleRevokeSession} 
                    isLoading={isLoading} 
                  />
                </div>
              )}

              {/* TAB: LOGIN HISTORY */}
              {activeSubTab === "logins" && (
                <div className="animate-in fade-in duration-200">
                  <LoginActivity 
                    loginEvents={loginEvents} 
                    isLoading={isLoading} 
                  />
                </div>
              )}

              {/* TAB: SECURITY ACTIVITY */}
              {activeSubTab === "activity" && (
                <div className="animate-in fade-in duration-200 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-855 dark:text-[#F5F7FA] uppercase tracking-wider block select-none">Security Audit Log</h3>
                  {isLoading ? (
                    <div className="p-4 animate-pulse space-y-4">
                      <div className="w-1/4 h-3 bg-slate-100 dark:bg-slate-800 rounded"></div>
                      <div className="w-full h-10 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    </div>
                  ) : securityEvents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-[#252931] rounded-xl select-none">
                      No security activity logs.
                    </div>
                  ) : (
                    <ActivityTimeline 
                      activities={securityEvents} 
                      onSelect={(evt) => setSelectedActivity(evt)} 
                    />
                  )}
                </div>
              )}

              {/* TAB: ACCOUNT STATES */}
              {activeSubTab === "accounts" && (
                <div className="animate-in fade-in duration-200">
                  <AccountSecurity 
                    metrics={accountStatus?.metrics || null}
                    suspendedAccounts={accountStatus?.suspendedAccounts || []}
                    passwordRequiredAccounts={accountStatus?.passwordRequiredAccounts || []}
                    onReactivate={handleReactivateMember}
                    onViewMember={handleViewMemberDetails}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* TAB: PRIVILEGE CHANGES */}
              {activeSubTab === "roles" && (
                <div className="animate-in fade-in duration-200">
                  <RoleChanges 
                    roleEvents={roleEvents} 
                    isLoading={isLoading} 
                    onViewMember={handleViewMemberDetails}
                  />
                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      {/* DETAIL DRAWER */}
      <ActivityDetailDrawer
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />

      {/* ADD IPO DRAWER */}
      <AddIPODrawer
        isOpen={isAddIpoOpen}
        onClose={() => setIsAddIpoOpen(false)}
        onSuccess={() => {}}
      />

      {/* LOGOUT MODAL */}
      <AdminLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}

export default function AdminSecurityPage() {
  return (
    <AdminProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-slate-400 text-xs">
          Loading workspace...
        </div>
      }>
        <AdminSecurityPageContent />
      </Suspense>
    </AdminProvider>
  );
}
