"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AdminProvider } from "@/context/AdminContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbarProfileMenu } from "@/components/admin/AdminNavbarProfileMenu";
import { NotificationPopover } from "@/components/shell/NotificationPopover";
import { AdminLogoutModal } from "@/components/admin/AdminLogoutModal";
import { AddIPODrawer } from "@/components/admin/AddIPODrawer";
import { ShieldCheck } from "@phosphor-icons/react";
import { AdminApplicationsView } from "@/components/admin/AdminApplicationsView";

import { AdminDataCache } from "@/lib/nexoDataCache";

function AdminApplicationsPageContent() {
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddIpoOpen, setIsAddIpoOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">("AUTHORIZED");

  useEffect(() => {
    document.title = "NEXO- Applications";
  }, []);

  // Auth check with deduplication
  useEffect(() => {
    let active = true;
    AdminDataCache.fetchSWR(
      "auth_me",
      async () => {
        const r = await fetch("/api/auth/me");
        return r.json();
      },
      { ttlMs: 60000 }
    )
      .then((data) => {
        if (!active) return;
        if (data?.authenticated && (data.user?.role === "SUPER_ADMIN" || data.user?.role === "ADMIN" || data.member?.role === "SUPER_ADMIN" || data.member?.role === "ADMIN")) {
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
          setAdminStatus("AUTHORIZED");
        }
      });
    return () => {
      active = false;
    };
  }, [router]);

  const handleTabChange = (tab: string) => {
    router.push(`/admin?tab=${tab}`);
  };

  if (adminStatus === "LOADING") {
    return (
      <div className="min-h-screen w-full bg-[#0A0C10] flex flex-col items-center justify-center text-slate-100 font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-500/30 text-blue-400 flex items-center justify-center animate-pulse">
            <ShieldCheck size={28} weight="bold" />
          </div>
          <p className="text-xs font-semibold text-slate-400 tracking-wide">
            Loading administrative workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#090A0C] text-slate-900 dark:text-[#F5F7FA] font-sans antialiased">
      {/* Sidebar */}
      <AdminSidebar
        activeTab="applications"
        setActiveTab={handleTabChange}
        onAddIpoClick={() => setIsAddIpoOpen(true)}
        onSignOutClick={() => setIsLogoutModalOpen(true)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 bg-surface/90 dark:bg-surface/90 border-b border-line px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shrink-0 select-none font-sans">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-xl text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer mr-0.5 shrink-0"
              title="Open Navigation Menu"
            >
              <span className="text-base font-bold">☰</span>
            </button>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0 hidden sm:inline-block" />
            <span className="text-[11px] sm:text-xs font-semibold text-ink-tertiary uppercase tracking-wider hidden sm:inline">
              Workspace
            </span>
            <span className="text-xs font-bold text-ink-muted hidden sm:inline">/</span>
            <span className="text-xs font-extrabold text-ink uppercase tracking-wider truncate">
              Applications Management
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationPopover />
            <AdminNavbarProfileMenu
              activeTab="applications"
              onSelectTab={handleTabChange}
              onSignOutClick={() => setIsLogoutModalOpen(true)}
            />
          </div>
        </header>

        {/* Content Body */}
        <main className="p-3 sm:p-5 md:p-8 flex-1 max-w-full lg:max-w-6xl w-full mx-auto min-w-0">
          <AdminApplicationsView />
        </main>
      </div>

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

export default function AdminApplicationsPage() {
  return (
    <AdminProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center text-slate-400 text-xs">
            Loading workspace...
          </div>
        }
      >
        <AdminApplicationsPageContent />
      </Suspense>
    </AdminProvider>
  );
}
