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
import { AdminIPOHistoryView } from "@/components/admin/AdminIPOHistoryView";

import { AdminDataCache } from "@/lib/nexoDataCache";

function AdminHistoryPageContent() {
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddIpoOpen, setIsAddIpoOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">("AUTHORIZED");

  useEffect(() => {
    document.title = "NEXO - IPO History";
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
            Loading administrative history ledger...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-page text-ink font-sans">
      {/* SIDEBAR NAVIGATION */}
      <AdminSidebar
        activeTab="history"
        setActiveTab={handleTabChange}
        onAddIpoClick={() => setIsAddIpoOpen(true)}
        onSignOutClick={() => setIsLogoutModalOpen(true)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <header className="h-14 border-b border-line px-3.5 sm:px-6 flex items-center justify-between bg-surface/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-xl text-ink-tertiary hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer mr-0.5 shrink-0"
              title="Open Navigation Menu"
            >
              <span className="text-base font-bold">☰</span>
            </button>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 hidden sm:inline-block" />
            <span className="text-[11px] sm:text-xs font-bold text-ink-secondary uppercase tracking-wider hidden sm:inline">
              Workspace /
            </span>
            <span className="text-xs font-black text-ink uppercase tracking-wider truncate">
              IPO History
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationPopover />
            <AdminNavbarProfileMenu
              activeTab="history"
              onSelectTab={handleTabChange}
              onSignOutClick={() => setIsLogoutModalOpen(true)}
            />
          </div>
        </header>

        {/* Dynamic Viewport Content */}
        <main className="p-3 sm:p-5 md:p-8 flex-1 max-w-full lg:max-w-6xl w-full mx-auto min-w-0">
          <AdminIPOHistoryView />
        </main>
      </div>

      {/* MODALS */}
      <AdminLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

      <AddIPODrawer
        isOpen={isAddIpoOpen}
        onClose={() => setIsAddIpoOpen(false)}
      />
    </div>
  );
}

export default function AdminHistoryPage() {
  return (
    <AdminProvider>
      <Suspense fallback={<div className="p-8 text-xs text-ink-secondary">Loading...</div>}>
        <AdminHistoryPageContent />
      </Suspense>
    </AdminProvider>
  );
}
