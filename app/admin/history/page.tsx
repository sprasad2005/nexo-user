"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AdminProvider } from "@/admin/context/AdminContext";
import { AdminSidebar } from "@/admin/components/AdminSidebar";
import { AdminNavbarProfileMenu } from "@/components/admin/AdminNavbarProfileMenu";
import { NotificationPopover } from "@/components/shell/NotificationPopover";
import { AdminLogoutModal } from "@/components/admin/AdminLogoutModal";
import { AddIPODrawer } from "@/admin/components/AddIPODrawer";
import { ShieldCheck } from "@phosphor-icons/react";
import { AdminIPOHistoryView } from "@/admin/components/AdminIPOHistoryView";

function AdminHistoryPageContent() {
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddIpoOpen, setIsAddIpoOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"LOADING" | "AUTHORIZED" | "UNAUTHORIZED">("AUTHORIZED");

  useEffect(() => {
    document.title = "NEXO - IPO History";
  }, []);

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
    return () => {
      active = false;
    };
  }, [router]);

  const handleTabChange = (tab: string) => {
    if (tab === "history") return;
    if (tab === "ipos") {
      router.push("/admin/ipos");
      return;
    }
    if (tab === "applications") {
      router.push("/admin/applications");
      return;
    }
    if (tab === "allotment" || tab === "allotments") {
      router.push("/admin/allotment");
      return;
    }
    if (tab === "members") {
      router.push("/admin/members");
      return;
    }
    if (tab === "messages") {
      router.push("/admin/messages");
      return;
    }
    if (tab === "activity") {
      router.push("/admin/activity");
      return;
    }
    if (tab === "security") {
      router.push("/admin/security");
      return;
    }
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
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar */}
        <header className="h-14 border-b border-line px-6 flex items-center justify-between bg-surface/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
              Workspace /
            </span>
            <span className="text-xs font-black text-ink uppercase tracking-wider">
              IPO History
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationPopover />
            <AdminNavbarProfileMenu
              activeTab="history"
              onSelectTab={handleTabChange}
              onSignOutClick={() => setIsLogoutModalOpen(true)}
            />
          </div>
        </header>

        {/* Dynamic Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
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
