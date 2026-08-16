"use client";

import React, { useState, useMemo } from "react";
import { useNexo } from "@/context/NexoContext";
import {
  ClockCounterClockwise,
  Trash,
  MagnifyingGlass,
  CheckCircle,
  CurrencyInr,
  TrendUp,
  Buildings,
  Eye,
  X,
  Warning,
  ArrowSquareOut,
  CalendarBlank,
  Users,
} from "@phosphor-icons/react";
import { formatINR } from "@/lib/mockData";

export function AdminIPOHistoryView() {
  const { ipos, members, removeIPO, listedIpos } = useNexo();

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

  // Combine completed IPOs from both catalog and listed track records
  const historicalIpos = useMemo(() => {
    const list: any[] = [];
    const seenNames = new Set<string>();

    // 1. From ipos state (COMPLETED, LISTED, or SOLD)
    ipos.forEach((ipo) => {
      const isCompleted =
        ipo.status === "COMPLETED" ||
        (ipo as any).isCompleted ||
        ipo.status === "LISTED" ||
        ipo.status === "SOLD";

      if (isCompleted && !ipo.isHidden) {
        seenNames.add(ipo.name.toLowerCase());
        list.push({
          ...ipo,
          source: "catalog",
          displayLotsApplied:
            ipo.applications?.reduce((s, a) => s + (a.lotCount || (a as any).lotsCount || 1), 0) || 1,
          displayLotsAllotted:
            ipo.applications?.reduce(
              (s, a) =>
                s +
                (a.allotmentStatus === "ALLOTTED" ? (a as any).allottedLotsCount || a.lotCount || 1 : 0),
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
        });
      }
    });

    // 2. From listed track records (if not already present)
    listedIpos.forEach((item) => {
      if (!seenNames.has(item.name.toLowerCase())) {
        seenNames.add(item.name.toLowerCase());
        list.push({
          id: item.id || `listed_${item.name}`,
          name: item.name,
          category: item.category || "Mainboard",
          status: "COMPLETED",
          isCompleted: true,
          source: "listed",
          metrics: {
            issueSize: "—",
            gmpPercent: item.oneLotProfit ? Math.round((item.oneLotProfit / (item.lotPrice || 15000)) * 100) : 18.5,
            closeDate: item.listingDate || "Completed",
            listingDate: item.listingDate || "Completed",
          },
          displayLotsApplied: item.lotsApplied || 1,
          displayLotsAllotted: item.lotsAllotted || 1,
          displayProfit: item.totalProfit || 15000,
          userProfits: item.userProfits || [],
          applicantsCount: item.applicantsCount || item.userProfits?.length || 1,
        });
      }
    });

    return list;
  }, [ipos, listedIpos]);

  // Filtered historical IPOs
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

  // Aggregate Metrics
  const totalCompletedCount = historicalIpos.length;
  const totalProfitDistributed = historicalIpos.reduce(
    (sum, item) => sum + (item.displayProfit || 0),
    0
  );
  const totalLotsHandled = historicalIpos.reduce(
    (sum, item) => sum + (item.displayLotsApplied || 0),
    0
  );

  const handleDeleteConfirm = async () => {
    if (!selectedIpoToDelete) return;
    setIsDeleting(true);

    try {
      const res = removeIPO(selectedIpoToDelete.id);
      if (res.success) {
        showToast(
          res.message ||
            `✓ "${selectedIpoToDelete.name}" and all associated records permanently deleted from database.`
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
      {/* Toast Alert */}
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

      {/* Header with Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface border border-line rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <ClockCounterClockwise size={16} weight="bold" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-secondary">
              Historical Ledger
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-ink">
            IPO History & Completed Ledger
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Full audit log of finalized, allotted, and profit-distributed IPOs across the syndicate.
          </p>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-3 bg-surface-alt/70 border border-line rounded-2xl text-right">
            <div className="text-[10px] font-bold text-ink-secondary uppercase">Completed IPOs</div>
            <div className="text-xl font-black text-ink">{totalCompletedCount}</div>
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

      {/* Controls Bar: Search & Category Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-line p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="text"
            placeholder="Search completed IPO by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-alt/60 border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-1 bg-surface-alt/80 p-1 rounded-xl border border-line shrink-0">
          {(["ALL", "Mainboard", "SME"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? "bg-accent text-white shadow-xs"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              {cat === "ALL" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Historical IPOs Table / Card Grid */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-line rounded-3xl space-y-3">
          <Buildings size={42} className="text-ink-tertiary mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-ink">No Completed IPOs in History</h3>
          <p className="text-xs text-ink-secondary max-w-sm mx-auto">
            {searchQuery
              ? `No historical IPOs matched "${searchQuery}".`
              : "When IPOs reach allotment and distribution, they will automatically be recorded in this permanent history ledger."}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-alt/40 text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary">
                  <th className="py-3.5 px-5">IPO Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Lots Applied</th>
                  <th className="py-3.5 px-4 text-right">Lots Allotted</th>
                  <th className="py-3.5 px-4 text-right">Realized Profit</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredHistory.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-alt/50 transition-colors group"
                    >
                      {/* IPO Name */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-surface-alt border border-line flex items-center justify-center font-black text-xs text-ink shrink-0">
                            {item.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-ink text-sm flex items-center gap-2">
                              <span>{item.name}</span>
                            </div>
                            <div className="text-[11px] text-ink-secondary flex items-center gap-2 mt-0.5">
                              <span>Date: {item.metrics?.listingDate || item.metrics?.closeDate || "Completed"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-surface-alt text-ink font-bold text-[10px] border border-line">
                          {item.category || "Mainboard"}
                        </span>
                      </td>

                      {/* Lots Applied */}
                      <td className="py-4 px-4 text-right font-bold text-ink">
                        {item.displayLotsApplied} {item.displayLotsApplied === 1 ? "Lot" : "Lots"}
                      </td>

                      {/* Lots Allotted */}
                      <td className="py-4 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.displayLotsAllotted} {item.displayLotsAllotted === 1 ? "Lot" : "Lots"}
                      </td>

                      {/* Realized Profit */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatINR(item.displayProfit, true)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30">
                          <CheckCircle size={12} weight="fill" />
                          <span>Completed</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedIpoForBreakdown(item)}
                            title="View member profit breakdown"
                            className="p-2 rounded-xl text-ink-secondary hover:text-ink bg-surface-alt hover:bg-surface-hover border border-line transition-all cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setSelectedIpoToDelete(item)}
                            title="Permanently Delete IPO from website & database"
                            className="p-2 rounded-xl text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all cursor-pointer active:scale-95"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BREAKDOWN MODAL */}
      {selectedIpoForBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 max-w-lg w-full border border-line shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                  <span>{selectedIpoForBreakdown.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/20">
                    Completed
                  </span>
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Syndicate Member Payout & Allotment Summary
                </p>
              </div>
              <button
                onClick={() => setSelectedIpoForBreakdown(null)}
                className="p-2 rounded-xl text-ink-secondary hover:text-ink bg-surface-alt cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-surface-alt/70 border border-line rounded-2xl">
                <div className="text-[10px] font-bold text-ink-secondary uppercase">Total Profit</div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {formatINR(selectedIpoForBreakdown.displayProfit, true)}
                </div>
              </div>
              <div className="p-3.5 bg-surface-alt/70 border border-line rounded-2xl">
                <div className="text-[10px] font-bold text-ink-secondary uppercase">Lots (Allotted / Applied)</div>
                <div className="text-lg font-black text-ink">
                  {selectedIpoForBreakdown.displayLotsAllotted} / {selectedIpoForBreakdown.displayLotsApplied}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => {
                  setSelectedIpoToDelete(selectedIpoForBreakdown);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash size={14} />
                <span>Delete IPO Record</span>
              </button>
              <button
                onClick={() => setSelectedIpoForBreakdown(null)}
                className="px-4 py-2 rounded-xl bg-surface-alt border border-line text-xs font-bold text-ink hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {selectedIpoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 max-w-md w-full border border-rose-500/30 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <Trash size={24} />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-ink">
                Permanently Delete "{selectedIpoToDelete.name}"?
              </h3>
              <p className="text-xs text-ink-secondary font-medium mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete this IPO? This action is irreversible.
              </p>
              <div className="mt-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-600 dark:text-rose-400 space-y-1 font-semibold">
                <div className="flex items-center gap-1.5 font-bold">
                  <Warning size={14} className="shrink-0" />
                  <span>The following data will be deleted across the website:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] opacity-90 pl-1">
                  <li>Deleted from MongoDB <code className="font-mono font-bold">ipos</code> collection</li>
                  <li>Deleted from <code className="font-mono font-bold">profit_distributions</code> ledger</li>
                  <li>All member applications & PnL erased from user dashboards</li>
                  <li>Removed from both Admin & User views permanently</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setSelectedIpoToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash size={14} />
                <span>{isDeleting ? "Deleting from Database…" : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
