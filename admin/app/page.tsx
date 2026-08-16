"use client";

import React, { useState } from "react";
import { AdminSidebar } from "../components/AdminSidebar";
import { AdminIPOManagement } from "../components/AdminIPOManagement";
import { AdminIPOHistoryView } from "../components/AdminIPOHistoryView";
import { DistributeProfitView } from "../components/DistributeProfitView";
import { AddIPODrawer } from "../components/AddIPODrawer";

export default function AdminHomePage() {
  const [activeTab, setActiveTab] = useState("ipos");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleAddSuccess = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 5000);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* ADMIN SIDEBAR */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddIpoClick={() => setIsDrawerOpen(true)}
      />

      {/* MAIN ADMIN WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Workspace /
            </span>
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              {activeTab === "history" ? "IPO History" : "IPO Management"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">
              Role: <strong className="text-slate-900">Administrator</strong>
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto">
          {activeTab === "ipos" && <AdminIPOManagement />}
          {activeTab === "history" && <AdminIPOHistoryView />}
          {activeTab === "distribute-profit" && <DistributeProfitView />}
          {activeTab !== "ipos" && activeTab !== "history" && activeTab !== "distribute-profit" && (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
              <h3 className="text-base font-extrabold text-slate-800">
                {activeTab.toUpperCase()} Section
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Feature coming soon. Use <strong className="text-blue-600">IPO Management</strong> or <strong className="text-amber-600">Distribute Profit</strong>.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* GLOBAL ADD IPO DRAWER */}
      <AddIPODrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
