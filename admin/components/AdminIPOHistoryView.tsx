"use client";

import React, { useState, useMemo } from "react";
import { useAdmin } from "../context/AdminContext";
import {
  ClockCounterClockwise,
  Trash,
  MagnifyingGlass,
  CheckCircle,
  Buildings,
  Eye,
  X,
  Warning,
} from "@phosphor-icons/react";
import { formatINR } from "@/lib/mockData";

export function AdminIPOHistoryView() {
  const { ipos, removeIPO } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "Mainboard" | "SME">("ALL");
  const [selectedIpoForBreakdown, setSelectedIpoForBreakdown] = useState<any | null>(null);
  const [selectedIpoToDelete, setSelectedIpoToDelete] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const historicalIpos = useMemo(() => {
    return ipos.filter((ipo) => {
      const isCompleted =
        ipo.status === "COMPLETED" ||
        (ipo as any).isCompleted ||
        ipo.status === "LISTED" ||
        ipo.status === "SOLD";
      return isCompleted && !ipo.isHidden;
    }).map((ipo) => ({
      ...ipo,
      displayLotsApplied:
        ipo.applications?.reduce((s, a) => s + (a.lotsCount || 1), 0) || 1,
      displayLotsAllotted:
        ipo.applications?.reduce(
          (s, a) =>
            s + (a.allotmentStatus === "ALLOTTED" ? a.allottedLotsCount || a.lotsCount || 1 : 0),
          0
        ) || 1,
      displayProfit:
        ipo.applications?.reduce(
          (s, a) =>
            s +
            (a.allotmentStatus === "ALLOTTED"
              ? Math.round((a.totalContribution || 15000) * ((ipo.metrics?.gmpPercent || 18.5) / 100))
              : 0),
          0
        ) || 15000,
    }));
  }, [ipos]);

  const filteredHistory = useMemo(() => {
    return historicalIpos.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === "ALL" ||
        item.category?.toUpperCase() === categoryFilter.toUpperCase();

      return matchesSearch && matchesCat;
    });
  }, [historicalIpos, searchQuery, categoryFilter]);

  const totalCompletedCount = historicalIpos.length;
  const totalProfitDistributed = historicalIpos.reduce(
    (sum, item) => sum + (item.displayProfit || 0),
    0
  );

  const handleDeleteConfirm = async () => {
    if (!selectedIpoToDelete) return;
    setIsDeleting(true);

    try {
      const res = await removeIPO(selectedIpoToDelete.id);
      if (res.success) {
        showToast(
          res.message ||
            `✓ "${selectedIpoToDelete.name}" and all associated data permanently deleted.`
        );
      } else {
        showToast(`❌ ${res.message || "Failed to delete IPO."}`);
      }
    } catch (err: any) {
      showToast(`❌ Error deleting IPO: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setSelectedIpoToDelete(null);
      if (selectedIpoForBreakdown?.id === selectedIpoToDelete?.id) {
        setSelectedIpoForBreakdown(null);
      }
    }
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {toastMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} weight="fill" className="text-emerald-500 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:opacity-75 text-sm ml-4 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <ClockCounterClockwise size={16} weight="bold" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Historical Ledger
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            IPO History & Completed Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit log of finalized, allotted, and profit-distributed IPOs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#15171C] border border-slate-200 dark:border-[#252931] rounded-2xl text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Completed IPOs</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{totalCompletedCount}</div>
          </div>
          <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-right">
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Realized Gain
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatINR(totalProfitDistributed, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search completed IPO by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#15171C] border border-slate-200 dark:border-[#252931] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#15171C] p-1 rounded-xl border border-slate-200 dark:border-[#252931] shrink-0">
          {(["ALL", "Mainboard", "SME"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {cat === "ALL" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl space-y-3">
          <Buildings size={42} className="text-slate-400 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Completed IPOs in History</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When IPOs reach allotment and distribution, they will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#252931] bg-slate-50/70 dark:bg-[#15171C]/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">IPO Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Lots Applied</th>
                  <th className="py-3.5 px-4 text-right">Lots Allotted</th>
                  <th className="py-3.5 px-4 text-right">Realized Profit</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#252931]/60">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-[#15171C]/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1C2028] border border-slate-200 dark:border-[#2B313C] flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                          {item.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">{item.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Date: {item.metrics?.listingDate || item.metrics?.closeDate || "Completed"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1C2028] text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200 dark:border-[#2B313C]">
                        {item.category || "Mainboard"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {item.displayLotsApplied} Lots
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {item.displayLotsAllotted} Lots
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatINR(item.displayProfit, true)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30">
                        <CheckCircle size={12} weight="fill" />
                        <span>Completed</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => setSelectedIpoToDelete(item)}
                        title="Permanently Delete IPO from website & database"
                        className="p-2 rounded-xl text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all cursor-pointer"
                      >
                        <Trash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedIpoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#14161A] rounded-3xl p-6 max-w-md w-full border border-rose-500/30 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <Trash size={24} />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Permanently Delete "{selectedIpoToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete this IPO? This action cannot be undone.
              </p>
              <div className="mt-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-600 dark:text-rose-400 space-y-1 font-semibold">
                <div className="flex items-center gap-1.5 font-bold">
                  <Warning size={14} className="shrink-0" />
                  <span>Whole data will be deleted across the website:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] opacity-90 pl-1">
                  <li>Deleted from MongoDB database collections</li>
                  <li>All member applications & profit distribution records erased</li>
                  <li>Removed from both user side and admin side completely</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setSelectedIpoToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E2128] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash size={14} />
                <span>{isDeleting ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
