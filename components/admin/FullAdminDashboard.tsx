"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AdminProvider } from "@/context/AdminContext";
import { AdminSidebar } from "./AdminSidebar";
import { AddIPODrawer } from "./AddIPODrawer";
import { AdminNavbarProfileMenu } from "./AdminNavbarProfileMenu";
import { NotificationPopover } from "../shell/NotificationPopover";
import { AdminLogoutModal } from "./AdminLogoutModal";
import { UserCircle, Gear, SignOut, List } from "@phosphor-icons/react";
import { AdminDataCache } from "@/lib/nexoDataCache";

// Code-split admin views into async chunks to minimize initial dashboard bundle size
const AdminIPOManagement = dynamic(() => import("./AdminIPOManagement").then((m) => m.AdminIPOManagement), { ssr: false });
const AdminIPOHistoryView = dynamic(() => import("./AdminIPOHistoryView").then((m) => m.AdminIPOHistoryView), { ssr: false });
const DistributeProfitView = dynamic(() => import("./DistributeProfitView").then((m) => m.DistributeProfitView), { ssr: false });
const SuperAdminMemberManagement = dynamic(() => import("./SuperAdminMemberManagement").then((m) => m.SuperAdminMemberManagement), { ssr: false });
const ActivityPage = dynamic(() => import("./activity/ActivityPage").then((m) => m.ActivityPage), { ssr: false });
const AllotmentManagementView = dynamic(() => import("./AllotmentManagementView").then((m) => m.AllotmentManagementView), { ssr: false });
const AdminApplicationsView = dynamic(() => import("./AdminApplicationsView").then((m) => m.AdminApplicationsView), { ssr: false });
const AdminSecurityView = dynamic(() => import("./AdminSecurityView").then((m) => m.AdminSecurityView), { ssr: false });
const MessagesTab = dynamic(() => import("@/src/features/admin/components/MessagesTab").then((m) => m.MessagesTab), { ssr: false });
const AdminProfileView = dynamic(() => import("./AdminProfileView").then((m) => m.AdminProfileView), { ssr: false });
const AdminSettingsView = dynamic(() => import("./AdminSettingsView").then((m) => m.AdminSettingsView), { ssr: false });

function AdminOverview({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const router = useRouter();
  // ⚠ Never read localStorage/cache inside useState initializers — causes SSR/client
  // hydration mismatch because the server has no window and returns a different value.
  // Always start with a safe SSR-consistent default and apply cache in useEffect.
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    // Immediately apply any cached data so returning visitors see instant content
    const cached = AdminDataCache.get<any>("admin_dashboard_summary");
    if (cached) {
      setDashboardData(cached);
      setIsLoading(false);
    }

    AdminDataCache.fetchSWR(
      "admin_dashboard_summary",
      async () => {
        const res = await fetch("/api/admin/dashboard");
        const json = await res.json();
        return json.success ? json.data : null;
      },
      {
        ttlMs: 15000,
        onUpdate: (data) => {
          if (active && data) setDashboardData(data);
        },
      }
    )
      .then((data) => {
        if (!active) return;
        if (data) setDashboardData(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = dashboardData?.stats;
  const recentEvents = dashboardData?.recentActivities || [];

  return (
    <div className="space-y-6 select-none font-sans">
      <div className="border-b border-slate-200 dark:border-[#252931] pb-5">
        <h1 className="text-2xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">Overview</h1>
        <p className="text-xs text-slate-500 dark:text-[#858D99] mt-0.5 font-medium">
          Welcome to the NEXO Admin Console. Monitor system operations and platform status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Status Card */}
        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-[230px]">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="text-xs font-extrabold text-slate-850 dark:text-[#F5F7FA] uppercase tracking-wider">Security Status</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black border bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/25 uppercase">
                Healthy
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-105 dark:bg-slate-800 rounded w-2/3"></div>
                <div className="h-4 bg-slate-105 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-[#AEB5C0] font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span><strong>{stats?.activeSessions ?? 0}</strong> Active Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span><strong>{stats?.activeMembers ?? 0}</strong> Active Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span><strong>{stats?.securityAlerts ?? 0}</strong> Security Alerts</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push("/admin/security")}
            className="w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-[#1D2026] hover:bg-slate-100 dark:hover:bg-[#252931] text-[11px] font-bold text-blue-600 dark:text-[#6B93FF] transition-colors border border-slate-200 dark:border-[#252931]/60 cursor-pointer mt-4"
          >
            Open Security →
          </button>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl p-5 shadow-2xs flex flex-col justify-between min-h-[230px]">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="text-xs font-extrabold text-slate-850 dark:text-[#F5F7FA] uppercase tracking-wider">Recent Activity</h3>
              <span className="text-[10px] text-slate-400 font-mono">Live Logs</span>
            </div>

            {isLoading ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="h-3 bg-slate-105 dark:bg-slate-800 rounded"></div>
                <div className="h-3 bg-slate-105 dark:bg-slate-800 rounded w-5/6"></div>
              </div>
            ) : recentEvents.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 text-center">No recent activity logs.</p>
            ) : (
              <div className="space-y-2.5">
                {recentEvents.map((evt: any) => {
                  const date = new Date(evt.createdAt);
                  const timeStr = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
                  return (
                    <div key={evt.id} className="flex justify-between items-start gap-3 text-[11px] leading-normal font-medium">
                      <div className="min-w-0 truncate">
                        <span className="font-extrabold text-slate-800 dark:text-slate-150">{evt.actorName || "System"} </span>
                        <span className="text-slate-500 dark:text-[#AEB5C0]">{String(evt.eventType).replace(/_/g, " ").toLowerCase()}</span>
                        {evt.targetName && <span className="text-blue-500 dark:text-[#6B93FF] font-semibold"> ({evt.targetName})</span>}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-[#626A75] shrink-0">{timeStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab("activity")}
            className="w-full text-center py-2.5 rounded-xl bg-slate-50 dark:bg-[#1D2026] hover:bg-slate-100 dark:hover:bg-[#252931] text-[11px] font-bold text-blue-600 dark:text-[#6B93FF] transition-colors border border-slate-200 dark:border-[#252931]/60 cursor-pointer mt-4"
          >
            View all activity →
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get("tab") : null;

  // ⚠ Do NOT read window.location.search here — the server has no window, so the
  // lazy initializer would return "ipos" on the server but the real tab on the client,
  // causing a hydration mismatch in both the sidebar (active item) and the breadcrumb.
  // tabParam from useSearchParams() is already available via Next.js and is applied
  // consistently by the existing useEffect below.
  const [activeTab, setActiveTab] = useState("ipos");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = "NEXO - Admin";

    // Idle prefetch of all admin views to eliminate tab switching delays
    const timer = setTimeout(() => {
      import("./AdminIPOManagement");
      import("./SuperAdminMemberManagement");
      import("./AllotmentManagementView");
      import("./AdminApplicationsView");
      import("./DistributeProfitView");
      import("./AdminIPOHistoryView");
      import("./AdminSecurityView");
      import("./activity/ActivityPage");
      import("@/src/features/admin/components/MessagesTab");
      import("./AdminProfileView");
      import("./AdminSettingsView");
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (tabParam && ["ipos", "history", "applications", "allotment", "allotments", "distribute-profit", "members", "messages", "activity", "security", "profile", "settings"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleSelectTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/admin?tab=${tab}`);
    }
  }, []);

  const handleAddSuccess = useCallback((msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 5000);
  }, []);

  const getTabTitle = useCallback((tab: string) => {
    switch (tab) {
      case "ipos":
        return "IPO Management";
      case "history":
        return "IPO History";
      case "applications":
        return "Applications Management";
      case "allotment":
      case "allotments":
        return "Allotment";
      case "distribute-profit":
        return "Distribute Profit";
      case "members":
        return "Member Management";
      case "messages":
        return "Messages";
      case "activity":
        return "Activity & Audit Center";
      case "security":
        return "Security Center";
      case "profile":
        return "Admin Profile";
      case "settings":
        return "System Settings";
      default:
        return "Dashboard";
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#090A0C] text-slate-900 dark:text-[#F5F7FA] font-sans antialiased">
      {/* ADMIN SIDEBAR */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        onAddIpoClick={() => setIsDrawerOpen(true)}
        onSignOutClick={() => setIsLogoutModalOpen(true)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN ADMIN WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 bg-surface/90 dark:bg-surface/90 border-b border-line px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shrink-0 select-none font-sans">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-xl text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer mr-0.5 shrink-0"
              title="Open Navigation Menu"
            >
              <List size={20} weight="bold" />
            </button>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0 hidden sm:inline-block" />
            <span className="text-[11px] sm:text-xs font-semibold text-ink-tertiary uppercase tracking-wider hidden sm:inline">
              Workspace
            </span>
            <span className="text-xs font-bold text-ink-muted hidden sm:inline">/</span>
            <span className="text-xs font-extrabold text-ink uppercase tracking-wider truncate">
              {getTabTitle(activeTab)}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationPopover />
            <AdminNavbarProfileMenu
              activeTab={activeTab}
              onSelectTab={(tab) => handleSelectTab(tab)}
              onSignOutClick={() => setIsLogoutModalOpen(true)}
            />
          </div>
        </header>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="m-3 sm:m-4 p-3 bg-emerald-50 dark:bg-[#102C22] border border-emerald-200 dark:border-[#32C98B]/20 rounded-xl text-emerald-700 dark:text-[#32C98B] text-xs font-bold flex items-center justify-between">
            <span>{feedbackMsg}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-emerald-500 dark:text-[#32C98B] hover:opacity-75">✕</button>
          </div>
        )}

        {/* Page Content */}
        <main
          className={`flex-1 w-full mx-auto min-w-0 ${
            activeTab === "messages"
              ? "h-[calc(100vh-56px)] overflow-hidden p-1.5 sm:p-4 max-w-full flex flex-col"
              : "p-3 sm:p-5 md:p-8 max-w-full lg:max-w-6xl"
          }`}
        >
          {activeTab === "overview" && <AdminOverview setActiveTab={handleSelectTab} />}
          {activeTab === "ipos" && (
            <AdminIPOManagement
              isDrawerOpen={isDrawerOpen}
              setIsDrawerOpen={setIsDrawerOpen}
            />
          )}
          {activeTab === "history" && <AdminIPOHistoryView />}
          {activeTab === "applications" && <AdminApplicationsView />}
          {(activeTab === "allotment" || activeTab === "allotments") && <AllotmentManagementView />}
          {activeTab === "distribute-profit" && <DistributeProfitView />}
          {activeTab === "members" && <SuperAdminMemberManagement />}
          {activeTab === "messages" && <MessagesTab />}
          {activeTab === "activity" && <ActivityPage />}
          {activeTab === "security" && <AdminSecurityView />}
          {activeTab === "profile" && (
            <AdminProfileView onSignOutClick={() => setIsLogoutModalOpen(true)} />
          )}
          {activeTab === "settings" && <AdminSettingsView />}
          {activeTab !== "overview" &&
            activeTab !== "ipos" &&
            activeTab !== "history" &&
            activeTab !== "applications" &&
            activeTab !== "allotment" &&
            activeTab !== "allotments" &&
            activeTab !== "distribute-profit" &&
            activeTab !== "members" &&
            activeTab !== "messages" &&
            activeTab !== "activity" &&
            activeTab !== "profile" &&
            activeTab !== "settings" && (
              <div className="p-12 text-center bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl shadow-2xs space-y-2">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-[#F5F7FA]">
                  {activeTab.toUpperCase()} Section
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-[#858D99]">
                  Use <strong className="text-blue-600 dark:text-[#6B93FF]">IPO Management</strong>, <strong className="text-blue-600 dark:text-[#6B93FF]">Allotment</strong>, <strong className="text-amber-600 dark:text-[#F3B85B]">Distribute Profit</strong>, <strong className="text-indigo-600 dark:text-[#6B93FF]">Admin Profile</strong>, or <strong className="text-slate-800 dark:text-[#F5F7FA]">Settings</strong> in the sidebar.
                </p>
              </div>
            )}
        </main>
      </div>

      {/* CONFIRMATION LOGOUT MODAL */}
      <AdminLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}

export function FullAdminDashboard() {
  return (
    <AdminProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-slate-400 text-xs">
          Loading workspace...
        </div>
      }>
        <AdminDashboardContent />
      </Suspense>
    </AdminProvider>
  );
}
