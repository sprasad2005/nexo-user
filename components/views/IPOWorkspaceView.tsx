"use client";

import React, { useState } from "react";
import { useNexo } from "@/context/NexoContext";
import { formatINR } from "@/lib/mockData";
import { ListedIPO } from "@/types/nexo";
import {
  Plus,
  TrendUp,
  Users,
  Coins,
  Trash,
  X,
  Buildings,
  MagnifyingGlass,
  User,
  CalendarBlank,
  Sparkle,
} from "@phosphor-icons/react";

export function IPOWorkspaceView() {
  const {
    listedIpos,
    addListedIpo,
    deleteListedIpo,
    currentUserRole,
    currentUser,
    currentMember,
    searchQuery,
  } = useNexo();

  const activeRole = currentMember?.role || currentUser?.role || currentUserRole;
  const isAdmin = String(activeRole).toUpperCase() === "ADMIN";

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "Mainboard" | "SME">("ALL");

  // Form State for Adding a Listed IPO Card
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Mainboard" | "SME">("Mainboard");
  const [lotsApplied, setLotsApplied] = useState<number>(1);
  const [lotsAllotted, setLotsAllotted] = useState<number>(1);
  const [applicantsCount, setApplicantsCount] = useState<number>(1);
  const [oneLotProfit, setOneLotProfit] = useState<number>(15000);
  const [totalProfit, setTotalProfit] = useState<number>(15000);
  const [userProfitShare, setUserProfitShare] = useState<number>(15000);
  const [userLotsApplied, setUserLotsApplied] = useState<number>(1);
  const [listingDate, setListingDate] = useState("22 Aug 2026");
  const [lotPrice, setLotPrice] = useState<number>(15000);

  // Filter listed IPOs by search query and category
  const effectiveSearch = (localSearch || searchQuery || "").trim().toLowerCase();

  const filteredListedIpos = listedIpos.filter((ipo) => {
    const matchesSearch =
      effectiveSearch === "" ||
      ipo.name.toLowerCase().includes(effectiveSearch) ||
      ipo.category?.toLowerCase().includes(effectiveSearch) ||
      ipo.listingDate?.toLowerCase().includes(effectiveSearch);

    const matchesCategory =
      selectedCategory === "ALL" ||
      ipo.category?.toUpperCase() === selectedCategory.toUpperCase();

    return matchesSearch && matchesCategory;
  });

  const activeUserName = currentMember?.name || currentUser?.name || "Member";
  const activeUserId = currentMember?.id || currentUser?.id || "mem_1";

  const formatLotCount = (lots: number): string => {
    if (!lots || isNaN(lots)) return "0 Lots";
    const rounded = Math.round(lots * 100) / 100;
    return `${rounded} ${rounded === 1 ? "Lot" : "Lots"}`;
  };

  const matchProfitForUser = (u: any) => {
    if (!u) return false;
    const uId = String(u.memberId || u.id || "").toLowerCase();
    const uName = String(u.memberName || u.name || u.username || "").toLowerCase().replace(/^@+/, "").trim();
    const currentId = String(activeUserId || "").toLowerCase();
    const currentName = String(activeUserName || "").toLowerCase().trim();
    const currentUsername = String(currentUser?.username || "").toLowerCase().replace(/^@+/, "").trim();

    return Boolean(
      (currentId && (uId === currentId || uId === `mem_${currentUsername}` || uId === `mem_${currentName}`)) ||
      (currentUsername && (uName === currentUsername || uName.includes(currentUsername) || currentUsername.includes(uName))) ||
      (currentName && (uName === currentName || uName.includes(currentName) || currentName.includes(uName))) ||
      (uId && currentUsername && uId.includes(currentUsername))
    );
  };

  // Calculate summary metrics
  const totalTrackRecordProfit = filteredListedIpos.reduce(
    (acc, ipo) => acc + (ipo.totalProfit || 0),
    0
  );

  const userTotalProfit = filteredListedIpos.reduce((acc, ipo) => {
    const myProfits = ipo.userProfits?.filter(matchProfitForUser);
    const sum = myProfits && myProfits.length > 0 ? myProfits.reduce((s, p) => s + (p.profit || 0), 0) : 0;
    return acc + sum;
  }, 0);

  const totalLotsAllotted = filteredListedIpos.reduce(
    (acc, ipo) => acc + (ipo.lotsAllotted || 0),
    0
  );

  const totalLotsApplied = filteredListedIpos.reduce(
    (acc, ipo) => acc + (ipo.lotsApplied || ipo.lotsAllotted || 0),
    0
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    // Check unique IPO name
    const isExisting = listedIpos.some(
      (item) => item.name && item.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (isExisting) {
      alert(`An IPO named "${cleanName}" already exists. Please enter a unique name.`);
      return;
    }

    addListedIpo({
      name: cleanName,
      category,
      lotsApplied: Number(lotsApplied) || 1,
      lotsAllotted: Number(lotsAllotted) || 1,
      applicantsCount: Number(applicantsCount) || 1,
      oneLotProfit: Number(oneLotProfit) || 0,
      totalProfit: Number(totalProfit) || 0,
      listingDate: listingDate.trim() || "Just Now",
      lotPrice: Number(lotPrice) || 15000,
      userProfits: [
        {
          memberId: activeUserId,
          memberName: activeUserName,
          profit: Number(userProfitShare) || Number(oneLotProfit) || 0,
          lotsApplied: Number(userLotsApplied) || Number(lotsApplied) || 1,
        },
      ],
    });

    // Reset Form
    setName("");
    setLotsApplied(1);
    setLotsAllotted(1);
    setApplicantsCount(1);
    setOneLotProfit(15000);
    setTotalProfit(15000);
    setUserProfitShare(15000);
    setUserLotsApplied(1);
    setIsAddModalOpen(false);
  };

  return (
    <div className="w-full max-w-full space-y-6 pb-12 animate-fade-in font-sans">
      {/* HEADER SECTION */}
      <div className="p-6 md:p-7 bg-surface rounded-2xl border border-line shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-accent-soft text-accent border border-accent/20 flex items-center justify-center font-bold shrink-0">
            <Buildings size={22} weight="bold" />
          </div>
          <div>
            <h1 className="text-h2 font-semibold text-ink tracking-tight">
              IPO Workspace • Track Record
            </h1>
            <p className="text-small font-medium text-ink-tertiary">
              Previous listed IPO performance, allotted lots & profit ledger.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98 shrink-0 self-start md:self-auto"
          >
            <Plus size={16} weight="bold" />
            <span>Record Listed IPO</span>
          </button>
        )}
      </div>

      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* STAT 1: Total Syndicate Profit */}
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-ink-tertiary">
            <span className="text-caption font-medium text-ink-secondary">Total Syndicate Gain</span>
            <div className="p-1.5 rounded-lg bg-positive-soft text-positive border border-positive/20">
              <TrendUp size={16} weight="bold" />
            </div>
          </div>
          <div className="text-h3 font-semibold text-positive num-tabular">
            +{formatINR(totalTrackRecordProfit)}
          </div>
          <p className="text-caption font-medium text-ink-tertiary">
            Across {filteredListedIpos.length} listed IPOs
          </p>
        </div>

        {/* STAT 2: User Realized Share */}
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-ink-tertiary">
            <span className="text-caption font-medium text-ink-secondary">Your Realized Share ({activeUserName})</span>
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent border border-accent/20">
              <User size={16} weight="bold" />
            </div>
          </div>
          <div className="text-h3 font-semibold text-accent num-tabular">
            +{formatINR(userTotalProfit)}
          </div>
          <p className="text-caption font-medium text-ink-tertiary">
            Personal allotment gains
          </p>
        </div>

        {/* STAT 3: Total Applied & Allotted Lots */}
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-ink-tertiary">
            <span className="text-caption font-medium text-ink-secondary">Total Applied & Allotted</span>
            <div className="p-1.5 rounded-lg bg-surface-alt text-ink-secondary border border-line-subtle">
              <Coins size={16} weight="bold" />
            </div>
          </div>
          <div className="text-h3 font-semibold text-ink num-tabular">
            {totalLotsAllotted} <span className="text-small font-medium text-ink-tertiary">Allotted ({totalLotsApplied} Applied)</span>
          </div>
          <p className="text-caption font-medium text-ink-tertiary">
            {filteredListedIpos.length > 0
              ? `${(totalLotsApplied / filteredListedIpos.length).toFixed(1)} avg applied / IPO`
              : "No IPOs listed"}
          </p>
        </div>
      </div>

      {/* ADMIN ADD LISTED IPO MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 md:p-7 max-w-lg w-full border border-line shadow-2xl space-y-5 animate-modal-pop-in">
            <div className="flex items-center justify-between border-b border-line pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-soft border border-accent/30 text-accent flex items-center justify-center font-bold">
                  <Plus size={16} weight="bold" />
                </div>
                <div>
                  <h3 className="text-h4 font-semibold text-ink">
                    Add Previous Listed IPO Card
                  </h3>
                  <p className="text-caption text-ink-tertiary font-medium">
                    Record listed IPO allotment & profit metrics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink-secondary hover:bg-surface-alt cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-small font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-ink-secondary mb-1 text-caption">Company / IPO Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Technologies"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-alt border border-line-strong rounded-xl px-3.5 py-2.5 text-ink font-semibold focus:border-accent focus:bg-surface outline-none transition-all"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-ink-secondary mb-1 text-caption">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as "Mainboard" | "SME")}
                    className="w-full bg-surface-alt border border-line-strong rounded-xl px-3.5 py-2.5 text-ink font-semibold focus:border-accent focus:bg-surface outline-none cursor-pointer transition-all"
                  >
                    <option value="Mainboard">Mainboard</option>
                    <option value="SME">SME</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-ink-secondary mb-1 text-caption">IPO Applied (Lots)</label>
                  <input
                    type="number"
                    min={1}
                    value={lotsApplied}
                    onChange={(e) => setLotsApplied(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-line-strong rounded-xl px-3 py-2.5 text-ink num-tabular font-semibold focus:border-accent focus:bg-surface outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-ink-secondary mb-1 text-caption">IPO Allotted (Lots)</label>
                  <input
                    type="number"
                    min={1}
                    value={lotsAllotted}
                    onChange={(e) => setLotsAllotted(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-line-strong rounded-xl px-3 py-2.5 text-ink num-tabular font-semibold focus:border-accent focus:bg-surface outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-ink-secondary mb-1 text-caption">Applicants</label>
                  <input
                    type="number"
                    min={1}
                    value={applicantsCount}
                    onChange={(e) => setApplicantsCount(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-line-strong rounded-xl px-3 py-2.5 text-ink num-tabular font-semibold focus:border-accent focus:bg-surface outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-secondary mb-1 text-caption">1 Lot Profit (₹)</label>
                  <input
                    type="number"
                    value={oneLotProfit}
                    onChange={(e) => setOneLotProfit(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-line-strong rounded-xl px-3.5 py-2.5 text-ink num-tabular font-semibold focus:border-accent focus:bg-surface outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-ink-secondary mb-1 text-caption">User Profit ({activeUserName}) (₹)</label>
                  <input
                    type="number"
                    value={userProfitShare}
                    onChange={(e) => setUserProfitShare(Number(e.target.value))}
                    className="w-full bg-accent-soft border border-accent/40 rounded-xl px-3.5 py-2.5 text-accent num-tabular font-semibold focus:border-accent focus:bg-surface outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-secondary mb-1 text-caption">User Applied Lots ({activeUserName})</label>
                  <input
                    type="number"
                    min={1}
                    value={userLotsApplied}
                    onChange={(e) => setUserLotsApplied(Number(e.target.value))}
                    className="w-full bg-accent-soft border border-accent/40 rounded-xl px-3.5 py-2.5 text-accent num-tabular font-semibold focus:border-accent focus:bg-surface outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-ink-secondary mb-1 text-caption">Total Syndicate Profit (₹)</label>
                  <input
                    type="number"
                    value={totalProfit}
                    onChange={(e) => setTotalProfit(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-line-strong rounded-xl px-3.5 py-2.5 text-ink num-tabular font-semibold focus:border-accent focus:bg-surface outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-secondary mb-1 text-caption">Listing Date</label>
                <input
                  type="text"
                  placeholder="e.g. 22 Aug 2026"
                  value={listingDate}
                  onChange={(e) => setListingDate(e.target.value)}
                  className="w-full bg-surface-alt border border-line-strong rounded-xl px-3.5 py-2.5 text-ink font-medium focus:border-accent focus:bg-surface outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-line text-small font-medium text-ink-secondary hover:bg-surface-alt cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-accent text-white text-small font-semibold hover:bg-accent-hover shadow-xs cursor-pointer transition-colors"
                >
                  Add Listed IPO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS CONTROLS BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-line shadow-xs">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="text"
            placeholder="Search listed IPOs by company name, category, or listing date..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-surface-alt border border-line rounded-xl text-small font-medium text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-accent transition-all"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-xl border border-line shrink-0">
          {(["ALL", "Mainboard", "SME"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-accent text-white shadow-xs"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              {cat === "ALL" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* LISTED IPO CARDS GRID */}
      {filteredListedIpos.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-2xl border border-line shadow-xs space-y-2">
          <MagnifyingGlass size={32} className="text-ink-muted mx-auto" />
          <h3 className="text-h4 font-semibold text-ink">No Listed IPO Cards Found</h3>
          <p className="text-small text-ink-tertiary">
            {effectiveSearch
              ? `No listed IPOs matched "${effectiveSearch}".`
              : "No listed IPO cards present in track record."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
          {filteredListedIpos.map((ipo) => {
            // Find total User Profit for active member across all applications
            const myProfits = ipo.userProfits?.filter(matchProfitForUser);
            const hasUserParticipated = Boolean(myProfits && myProfits.length > 0);
            const myProfitAmount = hasUserParticipated
              ? myProfits!.reduce((sum, u) => sum + u.profit, 0)
              : 0;

            const myAppliedLots = hasUserParticipated
              ? myProfits!.reduce((sum, u) => sum + (Number(u.lotsApplied) || Number(u.lots) || 1), 0)
              : 0;

            return (
              <div
                key={ipo.id}
                className="bg-surface rounded-2xl border border-line hover:border-line-strong shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group relative"
              >
                {/* CARD TOP HEADER */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-surface-alt border border-line flex items-center justify-center text-ink font-bold text-small shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {ipo.logo || ipo.name.substring(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-h4 font-semibold text-ink tracking-tight truncate leading-tight group-hover:text-accent transition-colors">
                          {ipo.name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 text-caption font-medium rounded-md bg-surface-alt text-ink-tertiary border border-line-subtle mt-1">
                          {ipo.category || "Mainboard"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold bg-positive-soft text-positive border border-positive/30 shadow-2xs shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
                        Listed
                      </span>

                      {isAdmin && (
                        <button
                          onClick={() => deleteListedIpo(ipo.id)}
                          title="Delete Card"
                          className="p-1 rounded-lg text-ink-muted hover:text-negative hover:bg-negative-soft opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD BODY */}
                <div className="px-5 pb-5 space-y-3.5 flex-1">
                  {/* METRICS 1: USER APPLIED, ALLOTTED & TOTAL APPLIED */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-alt/70 border border-line-subtle">
                    <div className="space-y-0.5">
                      <span className="text-[10px] sm:text-caption font-medium text-ink-secondary block uppercase tracking-wider truncate">
                        You Applied
                      </span>
                      <span className="text-small sm:text-body-md font-semibold text-accent num-tabular">
                        {formatLotCount(myAppliedLots)}
                      </span>
                    </div>

                    <div className="space-y-0.5 border-l border-line-subtle pl-2">
                      <span className="text-[10px] sm:text-caption font-medium text-ink-secondary block uppercase tracking-wider truncate">
                        IPO Allotted
                      </span>
                      <span className="text-small sm:text-body-md font-semibold text-ink num-tabular">
                        {formatLotCount(ipo.lotsAllotted || 1)}
                      </span>
                    </div>

                    <div className="space-y-0.5 border-l border-line-subtle pl-2">
                      <span className="text-[10px] sm:text-caption font-medium text-ink-secondary block uppercase tracking-wider truncate">
                        Total Applied
                      </span>
                      <span className="text-small sm:text-body-md font-semibold text-ink num-tabular">
                        {formatLotCount(ipo.lotsApplied || ipo.lotsAllotted || 1)}
                      </span>
                    </div>
                  </div>

                  {/* PROFIT LEDGER METRICS */}
                  <div className="space-y-2">
                    {/* USER PROFIT (MY PROFIT) */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-accent-soft/70 border border-accent/25 hover:border-accent/40 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                          <User size={14} weight="bold" />
                        </div>
                        <div>
                          <span className="text-small font-semibold text-ink block leading-tight">
                            User Profit ({activeUserName})
                          </span>
                          <span className="text-caption font-medium text-accent">
                            {hasUserParticipated
                              ? `Your Allocation (${formatLotCount(myAppliedLots)} Applied)`
                              : "0 Lots Applied • Not Participated"}
                          </span>
                        </div>
                      </div>
                      <span className="text-body-md font-semibold text-accent num-tabular">
                        {hasUserParticipated && myProfitAmount > 0
                          ? `+${formatINR(myProfitAmount)}`
                          : "₹0"}
                      </span>
                    </div>

                    {/* 1 LOT PROFIT */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-alt/40 border border-line-subtle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-surface-alt border border-line text-ink-muted flex items-center justify-center shrink-0">
                          <Coins size={13} />
                        </div>
                        <span className="text-small font-medium text-ink-secondary">1 Lot Profit</span>
                      </div>
                      <span className="text-small font-semibold text-ink-secondary num-tabular">
                        +{formatINR(ipo.oneLotProfit)}
                      </span>
                    </div>

                    {/* TOTAL PROFIT */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-positive-soft/70 border border-positive/30 hover:border-positive/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-positive/15 text-positive flex items-center justify-center shrink-0">
                          <TrendUp size={14} weight="bold" />
                        </div>
                        <div>
                          <span className="text-small font-semibold text-ink block leading-tight">
                            Total Profit
                          </span>
                          <span className="text-caption font-medium text-positive">
                            Syndicate Gain
                          </span>
                        </div>
                      </div>
                      <span className="text-body-md font-semibold text-positive num-tabular">
                        +{formatINR(ipo.totalProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD FOOTER */}
                <div className="px-5 py-3 bg-surface-alt/30 border-t border-line-subtle flex items-center justify-between text-caption text-ink-tertiary font-medium">
                  <span className="flex items-center gap-1.5">
                    <CalendarBlank size={14} className="text-ink-muted" />
                    Listed on {ipo.listingDate || "Aug 2026"}
                  </span>
                  {ipo.lotPrice && (
                    <span className="text-caption num-tabular text-ink-muted">
                      Lot: ₹{formatINR(ipo.lotPrice)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

