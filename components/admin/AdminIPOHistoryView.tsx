"use client";

import React, { useState, useMemo } from "react";
import { useNexo } from "@/context/NexoContext";
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
  UserPlus,
  ArrowSquareOut,
  CalendarBlank,
  Users,
  Coins,
} from "@phosphor-icons/react";
import { formatINR } from "@/lib/mockData";

export function AdminIPOHistoryView() {
  const { ipos, members, removeIPO, listedIpos, addListedIpo, deleteListedIpo, refreshIpos } = useNexo();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "Mainboard" | "SME">("ALL");
  
  // Modals & Drawers state
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
  const [editIssueSize, setEditIssueSize] = useState("");
  const [editMemberProfits, setEditMemberProfits] = useState<any[]>([]);

  // Add Past IPO Form State
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

  // Combine completed IPOs from both catalog and listed track records
  const historicalIpos = useMemo(() => {
    const list: any[] = [];
    const seenNames = new Set<string>();

    const DUMMY_MOCK_NAMES = new Set([
      "dhoot transmission",
      "tata technologies",
      "hexaware tech",
      "swiggy limited",
      "ntpc green energy",
      "veritas pharma sciences",
      "ather energy",
      "bajaj housing",
    ]);

    // 1. From ipos state (COMPLETED, LISTED, SOLD, or has profitDistribution / allotmentFinalized)
    ipos.forEach((ipo) => {
      const dist = ipo.profitDistribution;
      const isCompleted =
        !ipo.isHidden &&
        (ipo.status === "COMPLETED" ||
          (ipo as any).isCompleted ||
          ipo.status === "LISTED" ||
          ipo.status === "SOLD" ||
          Boolean(dist) ||
          Boolean((ipo as any).allotmentFinalized));

      const nameLower = ipo.name?.trim().toLowerCase();
      if (isCompleted && nameLower && !DUMMY_MOCK_NAMES.has(nameLower)) {
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
            : ipo.applications?.reduce((s, a) => s + (a.lotCount || (a as any).lotsCount || 1), 0) || 1;

        const lotsAllotted =
          dist?.allottedLots !== undefined
            ? dist.allottedLots
            : ipo.applications?.reduce(
                (s, a) => s + (a.allotmentStatus === "ALLOTTED" ? (a as any).allottedLotsCount || a.lotCount || 1 : 0),
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
          source: "catalog",
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
                memberName: app.applicantName || (app as any).memberName || "Member",
                lotsApplied: app.lotCount || (app as any).lotsCount || 1,
                lotsAllotted: app.allotmentStatus === "ALLOTTED" ? (app as any).allottedLotsCount || app.lotCount || 1 : 0,
                status: app.allotmentStatus,
                profit:
                  app.allotmentStatus === "ALLOTTED"
                    ? Math.round((app.totalContribution || 15000) * ((ipo.metrics?.gmpPercent || 18.5) / 100))
                    : 0,
              })),
        });
      }
    });

    // 2. From listed track records (including Lalitha Jwellers, xyz, jhgjhg)
    listedIpos.forEach((item) => {
      const nameLower = item.name?.trim().toLowerCase();
      if (nameLower && !DUMMY_MOCK_NAMES.has(nameLower) && !seenNames.has(nameLower)) {
        seenNames.add(nameLower);
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
            closeDate: item.listingDate || "16 Aug 2026",
            listingDate: item.listingDate || "16 Aug 2026",
          },
          displayLotsApplied: item.lotsApplied || item.lotsAllotted || 1,
          displayLotsAllotted: item.lotsAllotted || 1,
          displayProfit: item.totalProfit || 15000,
          oneLotProfit: item.oneLotProfit || (item.lotsAllotted ? Math.round(item.totalProfit / item.lotsAllotted) : item.totalProfit) || 15000,
          memberBreakdown: (item.userProfits || []).map((u) => ({
            id: `usr_${u.memberId}`,
            memberId: u.memberId,
            memberName: u.memberName,
            lotsApplied: u.lotsApplied || 1,
            lotsAllotted: u.lotsApplied || 1,
            status: "ALLOTTED",
            profit: u.profit || 0,
          })),
          applicantsCount: item.applicantsCount || item.userProfits?.length || 1,
        });
      }
    });

    return list;
  }, [ipos, listedIpos]);

  // Filtered list
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
  const totalProfitDistributed = historicalIpos.reduce((sum, item) => sum + (item.displayProfit || 0), 0);

  // Open Edit Modal & Populate Form
  const handleOpenEdit = (ipo: any) => {
    setSelectedIpoToEdit(ipo);
    setEditName(ipo.name);
    setEditCategory(ipo.category || "Mainboard");
    setEditLotsApplied(ipo.displayLotsApplied || 1);
    setEditLotsAllotted(ipo.displayLotsAllotted || 1);
    setEditTotalProfit(ipo.displayProfit || 15000);
    setEditOneLotProfit(ipo.oneLotProfit || (ipo.displayLotsAllotted ? Math.round(ipo.displayProfit / ipo.displayLotsAllotted) : 15000));
    setEditGmpPercent(ipo.metrics?.gmpPercent || 18.5);
    setEditListingDate(ipo.metrics?.listingDate || ipo.metrics?.closeDate || "Completed");
    setEditIssueSize(ipo.metrics?.issueSize || "₹2,400 Cr");
    setEditMemberProfits(ipo.memberBreakdown ? [...ipo.memberBreakdown] : []);
  };

  // Save Edit Changes
  const handleSaveEdit = async () => {
    if (!selectedIpoToEdit) return;
    setIsProcessing(true);

    try {
      // 1. Update via POST /api/ipos (action: updateIpo)
      await fetch("/api/ipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateIpo",
          ipoId: selectedIpoToEdit.id,
          data: {
            name: editName.trim(),
            description: selectedIpoToEdit.thesis || "Historical IPO record.",
            gmpPercent: Number(editGmpPercent) || 18.5,
            listingDate: editListingDate.trim(),
          },
        }),
      });

      // 2. Also update in listedIpos local database store
      try {
        const listedStored = localStorage.getItem("nexo_listed_ipos_db") || "[]";
        const listedParsed = JSON.parse(listedStored);
        const updated = listedParsed.map((item: any) =>
          item.id === selectedIpoToEdit.id || item.name?.toLowerCase() === selectedIpoToEdit.name.toLowerCase()
            ? {
                ...item,
                name: editName.trim(),
                category: editCategory,
                lotsApplied: Number(editLotsApplied),
                lotsAllotted: Number(editLotsAllotted),
                totalProfit: Number(editTotalProfit),
                oneLotProfit: Number(editOneLotProfit),
                listingDate: editListingDate.trim(),
              }
            : item
        );
        localStorage.setItem("nexo_listed_ipos_db", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {}

      showToast(`✓ IPO "${editName.trim()}" history data saved to database.`);
      refreshIpos();
      setSelectedIpoToEdit(null);
    } catch (err: any) {
      showToast(`❌ Failed to save updates: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove specific member from IPO breakdown
  const handleRemoveMemberFromIpo = (memberId: string) => {
    setEditMemberProfits((prev) => prev.filter((m) => m.memberId !== memberId));
    showToast("Member removed from this distribution.");
  };

  // Delete Entire IPO Record (Cascade delete across entire database & website)
  const handleDeleteConfirm = async () => {
    if (!selectedIpoToDelete) return;
    setIsProcessing(true);

    try {
      const res = removeIPO(selectedIpoToDelete.id);
      if (deleteListedIpo) {
        deleteListedIpo(selectedIpoToDelete.id);
      }
      showToast(res.message || `✓ "${selectedIpoToDelete.name}" deleted from database and user website.`);
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

  // Add Past IPO Record
  const handleAddPastIpo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      showToast("❌ Please provide a valid IPO name.");
      return;
    }

    addListedIpo({
      name: addName.trim(),
      category: addCategory,
      lotsApplied: Number(addLotsApplied) || 1,
      lotsAllotted: Number(addLotsAllotted) || 1,
      applicantsCount: 1,
      oneLotProfit: Number(addOneLotProfit) || 15000,
      totalProfit: Number(addTotalProfit) || 15000,
      listingDate: addListingDate.trim() || "Completed",
      lotPrice: 15000,
      userProfits: [
        {
          memberId: members[0]?.id || "mem_admin",
          memberName: members[0]?.name || "Ankit",
          profit: Number(addTotalProfit) || 15000,
          lotsApplied: Number(addLotsApplied) || 1,
        },
      ],
    });

    showToast(`✓ Past IPO "${addName.trim()}" added to database history.`);
    setAddName("");
    setAddLotsApplied(1);
    setAddLotsAllotted(1);
    setAddTotalProfit(15000);
    setAddOneLotProfit(15000);
    setIsAddModalOpen(false);
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

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface border border-line rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <ClockCounterClockwise size={16} weight="bold" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-secondary">
              History & Ledger
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-ink">
            IPO History & Ledger Manager
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Audit, edit, or delete past IPO records, allotment results, and member profit distributions.
          </p>
        </div>

        {/* Aggregate Stats & Add Past IPO Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 bg-surface-alt/70 border border-line rounded-2xl text-right">
            <div className="text-[9px] font-bold text-ink-secondary uppercase">Completed IPOs</div>
            <div className="text-lg font-black text-ink">{totalCompletedCount}</div>
          </div>
          <div className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-right">
            <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Realized Gain
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatINR(totalProfitDistributed, true)}
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>Add Past IPO</span>
          </button>
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

      {/* Historical IPOs Table */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-line rounded-3xl space-y-3">
          <Buildings size={42} className="text-ink-tertiary mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-ink">No Historical IPOs Found</h3>
          <p className="text-xs text-ink-secondary max-w-sm mx-auto">
            {searchQuery
              ? `No historical IPOs matched "${searchQuery}".`
              : "Click '+ Add Past IPO' to log a historical result or finalize active IPOs to save them here."}
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
                  <th className="py-3.5 px-4 text-right">Lots (Allotted / Applied)</th>
                  <th className="py-3.5 px-4 text-right">Realized Profit</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-alt/50 transition-colors group">
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

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-surface-alt text-ink font-bold text-[10px] border border-line">
                        {item.category || "Mainboard"}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-bold text-ink">
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{item.displayLotsAllotted}</span>
                      <span className="text-ink-tertiary"> / </span>
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
                        {/* View Breakdown */}
                        <button
                          onClick={() => setSelectedIpoForBreakdown(item)}
                          title="View member profit breakdown"
                          className="p-2 rounded-xl text-ink-secondary hover:text-ink bg-surface-alt hover:bg-surface-hover border border-line transition-all cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        {/* Edit IPO & Profit Data */}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit IPO, Lots & Profit distribution"
                          className="p-2 rounded-xl text-accent hover:text-white bg-accent-soft hover:bg-accent border border-accent/30 transition-all cursor-pointer"
                        >
                          <PencilSimple size={15} />
                        </button>
                        {/* Delete IPO permanently */}
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
          <div className="bg-surface rounded-3xl p-6 max-w-xl w-full border border-line shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-4 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                  <PencilSimple size={18} className="text-accent" />
                  <span>Edit Historical IPO: {selectedIpoToEdit.name}</span>
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Update IPO information, profit figures, and syndicate member allocations.
                </p>
              </div>
              <button
                onClick={() => setSelectedIpoToEdit(null)}
                className="p-2 rounded-xl text-ink-secondary hover:text-ink bg-surface-alt cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    IPO / Company Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  >
                    <option value="Mainboard">Mainboard</option>
                    <option value="SME">SME</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Total Lots Applied
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editLotsApplied}
                    onChange={(e) => setEditLotsApplied(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Total Lots Allotted
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editLotsAllotted}
                    onChange={(e) => setEditLotsAllotted(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Listing Gain (GMP %)
                  </label>
                  <input
                    type="number"
                    value={editGmpPercent}
                    onChange={(e) => setEditGmpPercent(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Total Realized Profit (₹)
                  </label>
                  <input
                    type="number"
                    value={editTotalProfit}
                    onChange={(e) => setEditTotalProfit(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Listing Date
                  </label>
                  <input
                    type="text"
                    value={editListingDate}
                    onChange={(e) => setEditListingDate(e.target.value)}
                    placeholder="e.g. 28 Aug 2026"
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Member Allocations Section */}
              {editMemberProfits.length > 0 && (
                <div className="pt-3 border-t border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold text-ink-secondary uppercase tracking-wider">
                      Member Allocations ({editMemberProfits.length})
                    </label>
                  </div>
                  <div className="divide-y divide-line/60 bg-surface-alt/40 border border-line rounded-2xl max-h-36 overflow-y-auto">
                    {editMemberProfits.map((m) => (
                      <div key={m.id || m.memberId} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{m.memberName}</span>
                          <span className="text-[10px] text-ink-secondary">({m.lotsApplied} Lots)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {formatINR(m.profit, true)}
                          </span>
                          <button
                            onClick={() => handleRemoveMemberFromIpo(m.memberId)}
                            title="Remove this member's application"
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line shrink-0">
              <button
                disabled={isProcessing}
                onClick={() => setSelectedIpoToEdit(null)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:bg-surface-alt cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FloppyDisk size={15} weight="bold" />
                <span>{isProcessing ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PAST IPO RECORD MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <form
            onSubmit={handleAddPastIpo}
            className="bg-surface rounded-3xl p-6 max-w-lg w-full border border-line shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                  <Plus size={18} className="text-accent" />
                  <span>Log Past IPO Record</span>
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Record a historical IPO that was completed in the past.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-ink-secondary hover:text-ink bg-surface-alt cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    IPO Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Technologies"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  >
                    <option value="Mainboard">Mainboard</option>
                    <option value="SME">SME</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Lots Applied
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addLotsApplied}
                    onChange={(e) => setAddLotsApplied(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Lots Allotted
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addLotsAllotted}
                    onChange={(e) => setAddLotsAllotted(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Total Profit (₹)
                  </label>
                  <input
                    type="number"
                    value={addTotalProfit}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setAddTotalProfit(val);
                      setAddOneLotProfit(addLotsAllotted > 0 ? Math.round(val / addLotsAllotted) : val);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-ink-secondary uppercase block mb-1">
                    Listing Date
                  </label>
                  <input
                    type="text"
                    value={addListingDate}
                    onChange={(e) => setAddListingDate(e.target.value)}
                    placeholder="e.g. 28 Aug 2026"
                    className="w-full px-3 py-2 rounded-xl bg-surface-alt border border-line text-ink font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:bg-surface-alt cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} weight="bold" />
                <span>Add to History</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── BREAKDOWN MODAL ── */}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEdit(selectedIpoForBreakdown);
                    setSelectedIpoForBreakdown(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-accent-soft hover:bg-accent text-accent hover:text-white border border-accent/25 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
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
                className="px-4 py-2 rounded-xl bg-surface-alt border border-line text-xs font-bold text-ink hover:bg-surface-hover transition-colors cursor-pointer"
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
          <div className="bg-surface rounded-3xl p-6 max-w-md w-full border border-rose-500/30 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <Trash size={24} />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-ink">
                Permanently Delete "{selectedIpoToDelete.name}"?
              </h3>
              <p className="text-xs text-ink-secondary font-medium mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete this historical IPO? This action is irreversible.
              </p>
              <div className="mt-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-600 dark:text-rose-400 space-y-1 font-semibold">
                <div className="flex items-center gap-1.5 font-bold">
                  <Warning size={14} className="shrink-0" />
                  <span>The following data will be erased across the website:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] opacity-90 pl-1">
                  <li>Deleted from MongoDB database <code className="font-mono font-bold">ipos</code> collection</li>
                  <li>Deleted from <code className="font-mono font-bold">profit_distributions</code> ledger</li>
                  <li>All member applications & PnL erased from user dashboards</li>
                  <li>Removed from both Admin & User views permanently</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setSelectedIpoToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:bg-surface-alt transition-colors cursor-pointer"
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
