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
  PencilSimple,
  Plus,
  FloppyDisk,
} from "@phosphor-icons/react";
import { formatINR } from "@/lib/mockData";

export function AdminIPOHistoryView() {
  const { ipos, removeIPO, updateIPO, refreshIpos } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "Mainboard" | "SME">("ALL");
  
  const [selectedIpoForBreakdown, setSelectedIpoForBreakdown] = useState<any | null>(null);
  const [selectedIpoToEdit, setSelectedIpoToEdit] = useState<any | null>(null);
  const [selectedIpoToDelete, setSelectedIpoToDelete] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<"Mainboard" | "SME">("Mainboard");
  const [editLotsApplied, setEditLotsApplied] = useState<number>(1);
  const [editLotsAllotted, setEditLotsAllotted] = useState<number>(1);
  const [editTotalProfit, setEditTotalProfit] = useState<number>(15000);
  const [editOneLotProfit, setEditOneLotProfit] = useState<number>(15000);
  const [editGmpPercent, setEditGmpPercent] = useState<number>(18.5);
  const [editListingDate, setEditListingDate] = useState("");
  const [editMemberProfits, setEditMemberProfits] = useState<any[]>([]);

  // Add Past Form State
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<"Mainboard" | "SME">("Mainboard");
  const [addLotsApplied, setAddLotsApplied] = useState<number>(1);
  const [addLotsAllotted, setAddLotsAllotted] = useState<number>(1);
  const [addTotalProfit, setAddTotalProfit] = useState<number>(15000);
  const [addOneLotProfit, setAddOneLotProfit] = useState<number>(15000);
  const [addListingDate, setAddListingDate] = useState("28 Aug 2026");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const historicalIpos = useMemo(() => {
    const list: any[] = [];
    const seenNames = new Set<string>();

    // 1. From ipos state
    ipos.forEach((ipo) => {
      const dist = ipo.profitDistribution;
      const isCompleted =
        ipo.status === "COMPLETED" ||
        (ipo as any).isCompleted ||
        ipo.status === "LISTED" ||
        ipo.status === "SOLD" ||
        Boolean(dist) ||
        Boolean((ipo as any).allotmentFinalized);

      if (isCompleted) {
        const nameLower = ipo.name.trim().toLowerCase();
        seenNames.add(nameLower);

        const totalProfit =
          dist?.totalProfit !== undefined
            ? dist.totalProfit
            : ipo.applications?.reduce(
                (s, a) =>
                  s +
                  (a.allotmentStatus === "ALLOTTED"
                    ? Math.round((a.totalContribution || 15000) * ((ipo.metrics?.gmpPercent || 18.5) / 100))
                    : 0),
                0
              ) || 15000;

        const lotsApplied =
          dist?.totalLots !== undefined
            ? dist.totalLots
            : ipo.applications?.reduce((s, a) => s + (a.lotsCount || (a as any).lotCount || 1), 0) || 1;

        const lotsAllotted =
          dist?.allottedLots !== undefined
            ? dist.allottedLots
            : ipo.applications?.reduce(
                (s, a) =>
                  s + (a.allotmentStatus === "ALLOTTED" ? a.allottedLotsCount || a.lotsCount || 1 : 0),
                0
              ) || 1;

        const oneLotProfit =
          dist?.oneLotProfit !== undefined
            ? dist.oneLotProfit
            : (lotsAllotted > 0 ? Math.round(totalProfit / lotsAllotted) : totalProfit);

        const formattedListingDate = dist?.publishedAt
          ? new Date(dist.publishedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : (ipo.metrics?.listingDate || ipo.metrics?.closeDate || "16 Aug 2026");

        list.push({
          ...ipo,
          displayLotsApplied: lotsApplied,
          displayLotsAllotted: lotsAllotted,
          displayProfit: totalProfit,
          oneLotProfit,
          metrics: {
            ...ipo.metrics,
            listingDate: formattedListingDate,
          },
          memberBreakdown: (dist as any)?.memberPayouts
            ? (dist as any).memberPayouts.map((p: any) => ({
                id: `pay_${p.memberId}`,
                memberId: p.memberId,
                memberName: p.name || "Member",
                lotsApplied: p.lots || 1,
                lotsAllotted: p.lots || 1,
                status: "ALLOTTED",
                profit: p.profit || 0,
              }))
            : (ipo.applications || []).map((app) => ({
                id: app.id,
                memberId: app.memberId,
                memberName: app.applicantName || "Member",
                lotsApplied: app.lotsCount || 1,
                lotsAllotted: app.allotmentStatus === "ALLOTTED" ? app.allottedLotsCount || app.lotsCount || 1 : 0,
                status: app.allotmentStatus,
                profit:
                  app.allotmentStatus === "ALLOTTED"
                    ? Math.round((app.totalContribution || 15000) * ((ipo.metrics?.gmpPercent || 18.5) / 100))
                    : 0,
              })),
        });
      }
    });

    return list;
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

  const handleOpenEdit = (ipo: any) => {
    setSelectedIpoToEdit(ipo);
    setEditName(ipo.name);
    setEditCategory(ipo.category || "Mainboard");
    setEditLotsApplied(ipo.displayLotsApplied || 1);
    setEditLotsAllotted(ipo.displayLotsAllotted || 1);
    setEditTotalProfit(ipo.displayProfit || 15000);
    setEditOneLotProfit(ipo.oneLotProfit || 15000);
    setEditGmpPercent(ipo.metrics?.gmpPercent || 18.5);
    setEditListingDate(ipo.metrics?.listingDate || ipo.metrics?.closeDate || "Completed");
    setEditMemberProfits(ipo.memberBreakdown ? [...ipo.memberBreakdown] : []);
  };

  const handleSaveEdit = async () => {
    if (!selectedIpoToEdit) return;
    setIsProcessing(true);

    try {
      await updateIPO(selectedIpoToEdit.id, {
        name: editName.trim(),
        description: selectedIpoToEdit.thesis || "Historical IPO record.",
        gmpPercent: Number(editGmpPercent) || 18.5,
        listingDate: editListingDate.trim(),
      });

      showToast(`✓ IPO "${editName.trim()}" history records updated in database.`);
      await refreshIpos();
      setSelectedIpoToEdit(null);
    } catch (err: any) {
      showToast(`❌ Failed to save updates: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMemberFromIpo = (memberId: string) => {
    setEditMemberProfits((prev) => prev.filter((m) => m.memberId !== memberId));
    showToast("Member removed from this distribution.");
  };

  const handleDeleteConfirm = async () => {
    if (!selectedIpoToDelete) return;
    setIsProcessing(true);

    try {
      const res = await removeIPO(selectedIpoToDelete.id);
      showToast(res.message || `✓ "${selectedIpoToDelete.name}" permanently deleted.`);
      await refreshIpos();
    } catch (err: any) {
      showToast(`❌ Error deleting IPO: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setSelectedIpoToDelete(null);
      if (selectedIpoForBreakdown?.id === selectedIpoToDelete?.id) {
        setSelectedIpoForBreakdown(null);
      }
      if (selectedIpoToEdit?.id === selectedIpoToDelete?.id) {
        setSelectedIpoToEdit(null);
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
              History & Ledger
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            IPO History & Ledger Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit, edit, or permanently delete completed IPO records and member distributions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#15171C] border border-slate-200 dark:border-[#252931] rounded-2xl text-right">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Completed IPOs</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{totalCompletedCount}</div>
          </div>
          <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-right">
            <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Realized Gain
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
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
            placeholder="Search completed IPO by name or category..."
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
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Historical IPOs Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When IPOs reach allotment and distribution, they will automatically be recorded here.
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
                  <th className="py-3.5 px-4 text-right">Lots (Allotted / Applied)</th>
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
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{item.displayLotsAllotted}</span>
                      <span className="text-slate-400"> / </span>
                      <span>{item.displayLotsApplied} Lots</span>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedIpoForBreakdown(item)}
                          title="View member profit breakdown"
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-[#1C2028] border border-slate-200 dark:border-[#2B313C] transition-all cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit IPO, Lots & Profit distribution"
                          className="p-2 rounded-xl text-blue-600 dark:text-[#6B93FF] hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/20 transition-all cursor-pointer"
                        >
                          <PencilSimple size={15} />
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EDIT IPO & PROFIT DATA MODAL ── */}
      {selectedIpoToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#14161A] rounded-3xl p-6 max-w-xl w-full border border-slate-200 dark:border-[#252931] shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#252931] pb-4 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <PencilSimple size={18} className="text-blue-600 dark:text-[#6B93FF]" />
                  <span>Edit Historical IPO: {selectedIpoToEdit.name}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update IPO information, profit figures, and syndicate member allocations.
                </p>
              </div>
              <button
                onClick={() => setSelectedIpoToEdit(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                    IPO / Company Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-slate-900 dark:text-white font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-slate-900 dark:text-white font-semibold focus:outline-none"
                  >
                    <option value="Mainboard">Mainboard</option>
                    <option value="SME">SME</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                    Lots Applied
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editLotsApplied}
                    onChange={(e) => setEditLotsApplied(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-slate-900 dark:text-white font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                    Lots Allotted
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editLotsAllotted}
                    onChange={(e) => setEditLotsAllotted(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-slate-900 dark:text-white font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                    GMP %
                  </label>
                  <input
                    type="number"
                    value={editGmpPercent}
                    onChange={(e) => setEditGmpPercent(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-slate-900 dark:text-white font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                    Total Realized Profit (₹)
                  </label>
                  <input
                    type="number"
                    value={editTotalProfit}
                    onChange={(e) => setEditTotalProfit(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                    Listing Date
                  </label>
                  <input
                    type="text"
                    value={editListingDate}
                    onChange={(e) => setEditListingDate(e.target.value)}
                    placeholder="e.g. 28 Aug 2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] text-slate-900 dark:text-white font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Member Breakdown */}
              {editMemberProfits.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-[#252931] space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Member Allocations ({editMemberProfits.length})
                  </label>
                  <div className="divide-y divide-slate-100 dark:divide-[#252931] bg-slate-50 dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-2xl max-h-36 overflow-y-auto">
                    {editMemberProfits.map((m) => (
                      <div key={m.id || m.memberId} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{m.memberName}</span>
                          <span className="text-[10px] text-slate-400">({m.lotsApplied} Lots)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {formatINR(m.profit, true)}
                          </span>
                          <button
                            onClick={() => handleRemoveMemberFromIpo(m.memberId)}
                            title="Remove member"
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#252931] shrink-0">
              <button
                disabled={isProcessing}
                onClick={() => setSelectedIpoToEdit(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FloppyDisk size={15} weight="bold" />
                <span>{isProcessing ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BREAKDOWN MODAL ── */}
      {selectedIpoForBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#14161A] rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-[#252931] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#252931] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedIpoForBreakdown.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/20">
                    Completed
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Member Payout & Allotment Summary
                </p>
              </div>
              <button
                onClick={() => setSelectedIpoForBreakdown(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-[#15171C] border border-slate-200 dark:border-[#252931] rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Profit</div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {formatINR(selectedIpoForBreakdown.displayProfit, true)}
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-[#15171C] border border-slate-200 dark:border-[#252931] rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Lots (Allotted / Applied)</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedIpoForBreakdown.displayLotsAllotted} / {selectedIpoForBreakdown.displayLotsApplied}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEdit(selectedIpoForBreakdown);
                    setSelectedIpoForBreakdown(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <PencilSimple size={14} />
                  <span>Edit Data</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedIpoToDelete(selectedIpoForBreakdown);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash size={14} />
                  <span>Delete</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedIpoForBreakdown(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1C2028] border border-slate-200 dark:border-[#2B313C] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PERMANENT CASCADE DELETE CONFIRMATION MODAL ── */}
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
                Are you sure you want to permanently delete this IPO? This action is irreversible.
              </p>
              <div className="mt-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-600 dark:text-rose-400 space-y-1 font-semibold">
                <div className="flex items-center gap-1.5 font-bold">
                  <Warning size={14} className="shrink-0" />
                  <span>The following data will be erased across the website:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] opacity-90 pl-1">
                  <li>Deleted from MongoDB database collections</li>
                  <li>All member applications & profit distribution records erased</li>
                  <li>Removed from both Admin & User views permanently</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setSelectedIpoToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#252931] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash size={14} />
                <span>{isProcessing ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
