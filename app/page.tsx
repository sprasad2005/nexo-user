"use client";

import React from "react";
import { useNexo } from "@/context/NexoContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { DashboardView } from "@/components/views/DashboardView";
import { IPOWorkspaceView } from "@/components/views/IPOWorkspaceView";
import { PortfolioView } from "@/components/views/PortfolioView";
import { MembersView } from "@/components/views/MembersView";
import { ApplicationsView } from "@/components/views/ApplicationsView";
import { ProfileView } from "@/components/views/ProfileView";
import { MessagesView } from "@/components/views/MessagesView";
import { FullAdminDashboard } from "@/components/admin/FullAdminDashboard";
import { IPODetailDrawer } from "@/components/views/IPODetailDrawer";
import { ApplicationModal } from "@/components/application/ApplicationModal";
import { AddIPOModal } from "@/components/ipo/AddIPOModal";

export default function Home() {
  const { activeTab, isAuthenticated, isAuthLoaded, currentUser } = useNexo();

  React.useEffect(() => {
    if (activeTab === ("admin" as any)) {
      window.location.href = "/admin";
    }
  }, [activeTab]);

  if (!isAuthLoaded || !isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page text-ink font-sans antialiased">
      {/* LEFT SIDEBAR NAVIGATION & MOBILE BOTTOM BAR */}
      <Sidebar />

      {/* MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar />

        <main
          className={`flex-1 max-w-7xl w-full mx-auto ${
            activeTab === "messages"
              ? "h-full overflow-hidden p-2 sm:p-4 pb-20 lg:pb-4 flex flex-col"
              : "p-4 sm:p-6 md:p-8 pb-24 lg:pb-8 overflow-y-auto"
          }`}
        >
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "ipos" && <IPOWorkspaceView />}
          {activeTab === "applications" && <ApplicationsView />}
          {activeTab === "portfolio" && <PortfolioView />}
          {activeTab === "messages" && <MessagesView />}
          {activeTab === "members" && <MembersView />}
          {activeTab === "profile" && <ProfileView />}
        </main>
      </div>

      {/* DRAWERS & MODALS */}
      <IPODetailDrawer />
      <ApplicationModal />
      <AddIPOModal />
    </div>
  );
}


