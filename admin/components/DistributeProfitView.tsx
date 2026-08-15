"use client";

import React, { useState, useMemo } from "react";
import { Coins, CheckCircle, ArrowRight, User, Users, Calculator, Package, Wallet, MagnifyingGlass, X } from "@phosphor-icons/react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CopyButton } from "@/components/ui/CopyButton";
import { useAdmin } from "../context/AdminContext";

export function DistributeProfitView() {
  const { ipos, publishProfitDistribution } = useAdmin();

  // Show all IPOs (active + historical/hidden) for profit distribution
  const activeIpos = ipos;

  const [selectedIpoId, setSelectedIpoId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nexo_distribute_selected_ipo_id");
      if (stored) return stored;
    }
    return activeIpos[0]?.id || "";
  });
  const [allottedLots, setAllottedLots] = useState<number | "">(1);
  const [totalProfit, setTotalProfit] = useState<number | "">("");
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [realApplications, setRealApplications] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedIpoId = localStorage.getItem("nexo_distribute_selected_ipo_id") || activeIpos[0]?.id;
        if (storedIpoId) {
          const cached = localStorage.getItem(`nexo_admin_apps_${storedIpoId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
      } catch {}
    }
    return [];
  });
  const [isFetchingApps, setIsFetchingApps] = useState(false);

  const selectedIpo = activeIpos.find((ipo) => ipo.id === selectedIpoId) || activeIpos[0];

  const [autoAllottedBadge, setAutoAllottedBadge] = useState<string | null>(null);

  // Fetch real applications from API whenever selected IPO changes
  React.useEffect(() => {
    if (!selectedIpoId) return;

    try {
      localStorage.setItem("nexo_distribute_selected_ipo_id", selectedIpoId);
      const cached = localStorage.getItem(`nexo_admin_apps_${selectedIpoId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRealApplications(parsed);
        }
      }
    } catch {}

    setIsFetchingApps(true);
    fetch(`/api/admin/allotment?ipoId=${selectedIpoId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.applications)) {
          setRealApplications(data.applications);
          try {
            localStorage.setItem(`nexo_admin_apps_${selectedIpoId}`, JSON.stringify(data.applications));
          } catch {}

          // Auto-calculate allotted lots from the allotment section
          let autoCount = 0;
          data.applications.forEach((app: any) => {
            if (Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0) {
              autoCount += app.allottedIndices.length;
            } else if (app.allotmentStatus === "ALLOTTED") {
              autoCount += Number(app.lotsApplied || app.lotCount || 1);
            }
          });

          if (autoCount > 0) {
            setAllottedLots(autoCount);
            setAutoAllottedBadge(`✓ Auto-fetched ${autoCount} Allotted Lot${autoCount > 1 ? "s" : ""} from Allotment Section`);
          } else {
            const totalApplied = data.applications.reduce(
              (sum: number, app: any) => sum + Number(app.lotsApplied || app.lotCount || 1),
              0
            );
            setAllottedLots(totalApplied > 0 ? totalApplied : 1);
            setAutoAllottedBadge("ℹ No lots marked Allotted yet in Allotment Section (showing total applied)");
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingApps(false));
  }, [selectedIpoId]);

  // Auto-select first IPO if none selected
  React.useEffect(() => {
    if (!selectedIpoId && activeIpos.length > 0) {
      setSelectedIpoId(activeIpos[0].id);
    }
  }, [activeIpos, selectedIpoId]);

  // Sync state with published profit distribution or local draft whenever selected IPO changes
  React.useEffect(() => {
    if (!selectedIpo) return;

    // Check draft first
    try {
      const draftsStr = localStorage.getItem("nexo_distribute_drafts");
      if (draftsStr) {
        const drafts = JSON.parse(draftsStr);
        if (drafts[selectedIpo.id]) {
          const d = drafts[selectedIpo.id];
          if (d.totalProfit !== undefined) setTotalProfit(d.totalProfit);
          if (d.allottedLots !== undefined) setAllottedLots(d.allottedLots);
          return;
        }
      }
    } catch {}

    // Fallback to published profitDistribution
    if (selectedIpo.profitDistribution) {
      const dist = selectedIpo.profitDistribution;
      if (typeof dist.totalProfit === "number" && dist.totalProfit > 0) {
        setTotalProfit(dist.totalProfit);
      }
      if (typeof dist.allottedLots === "number" && dist.allottedLots > 0) {
        setAllottedLots(dist.allottedLots);
      }
    } else {
      setTotalProfit("");
      setAllottedLots(1);
    }
  }, [selectedIpo?.id, selectedIpo?.profitDistribution]);

  const handleProfitChange = (val: number | "") => {
    setTotalProfit(val);
    if (selectedIpo) {
      try {
        const draftsStr = localStorage.getItem("nexo_distribute_drafts") || "{}";
        const drafts = JSON.parse(draftsStr);
        drafts[selectedIpo.id] = { ...drafts[selectedIpo.id], totalProfit: val };
        localStorage.setItem("nexo_distribute_drafts", JSON.stringify(drafts));
      } catch {}
    }
  };

  const handleLotsChange = (val: number | "") => {
    setAllottedLots(val);
    if (selectedIpo) {
      try {
        const draftsStr = localStorage.getItem("nexo_distribute_drafts") || "{}";
        const drafts = JSON.parse(draftsStr);
        drafts[selectedIpo.id] = { ...drafts[selectedIpo.id], allottedLots: val };
        localStorage.setItem("nexo_distribute_drafts", JSON.stringify(drafts));
      } catch {}
    }
  };

  const numProfit = typeof totalProfit === "number" ? totalProfit : 0;
  const numAllottedLots = typeof allottedLots === "number" ? allottedLots : 0;

  const [searchQuery, setSearchQuery] = useState("");

  // ── Auto-fetch individual member contributions & lots ──
  const memberApplications = useMemo(() => {
    const rawApps = realApplications.length > 0 ? realApplications : selectedIpo?.applications || [];
    if (!rawApps || rawApps.length === 0) {
      return [];
    }

    const minInv = selectedIpo.metrics?.minInvestment || 15000;
    const formatHandle = (str: string) => {
      const trimmed = str.replace(/^@+/, "").trim();
      if (!trimmed) return "@member";
      return `@${trimmed}`;
    };

    const splitMultiNames = (str: string): string[] => {
      if (!str) return [];
      return str
        .split(/,|\band\b|&|\+/i)
        .map((s) => s.replace(/^@+/, "").trim())
        .filter(Boolean);
    };

    const membersMap = new Map<string, { id: string; name: string; lots: number; contribution: number; pan: string }>();

    const addMemberEntry = (memberId: string | undefined, nameStr: string, lots: number, contribution: number, panStr: string) => {
      const cleanName = formatHandle(nameStr);
      const key = (memberId || cleanName.replace(/^@/, "")).toLowerCase().trim();
      const cleanPan = panStr && !panStr.includes("X") && panStr.length === 10 ? panStr.toUpperCase() : (panStr || "ABCDE1234F").toUpperCase();

      if (membersMap.has(key)) {
        const existing = membersMap.get(key)!;
        existing.lots += lots;
        existing.contribution += contribution;
        if ((!existing.pan || existing.pan === "ABCDE1234F" || existing.pan.includes("X")) && cleanPan && cleanPan !== "ABCDE1234F") {
          existing.pan = cleanPan;
        }
      } else {
        membersMap.set(key, {
          id: memberId || `mem_${key}`,
          name: cleanName,
          lots: lots,
          contribution: contribution,
          pan: cleanPan,
        });
      }
    };

    rawApps.forEach((app: any) => {
      const pansList = Array.isArray(app.panNumbers) && app.panNumbers.length > 0
        ? app.panNumbers
        : [app.pan || app.panMasked || app.panFull || "ABCDE1234F"];
      
      const appLots = Number(app.lotsApplied || app.lotCount || pansList.length || 1) || 1;
      const appContrib = Number(app.totalContribution) || (appLots * minInv);

      // Check participants / contributors first
      const pool = (Array.isArray(app.participants) && app.participants.length > 0)
        ? app.participants
        : (Array.isArray(app.contributors) && app.contributors.length > 0)
        ? app.contributors
        : null;

      if (pool && pool.length > 0) {
        pool.forEach((p: any, idx: number) => {
          const rawPName = p.memberName || p.name || p.username || "";
          const subNames = splitMultiNames(rawPName);
          const pPan = p.panMasked || p.panFull || p.pan || pansList[idx] || pansList[0] || "ABCDE1234F";
          const pContrib = Number(p.contribution || p.amount) || (appContrib / pool.length);
          const pLots = Number(p.lots) || (pContrib / minInv) || (appLots / pool.length);

          if (subNames.length > 1) {
            const splitSubContrib = pContrib / subNames.length;
            const splitSubLots = pLots / subNames.length;
            subNames.forEach((sName, sIdx) => {
              const subPan = pansList[idx + sIdx] || pPan;
              addMemberEntry(undefined, sName, splitSubLots, splitSubContrib, subPan);
            });
          } else {
            const singleName = subNames[0] || rawPName || `member_${idx + 1}`;
            addMemberEntry(p.memberId, singleName, pLots, pContrib, pPan);
          }
        });
      } else {
        // Parse applicantName / username
        const rawApplicant = String(app.applicantName || app.username || "Member").trim();
        const splitNames = splitMultiNames(rawApplicant);

        if (splitNames.length > 1) {
          const splitLots = appLots / splitNames.length;
          const splitContrib = appContrib / splitNames.length;
          splitNames.forEach((sName: string, sIdx: number) => {
            const panForPerson = pansList[sIdx] || pansList[0] || "ABCDE1234F";
            addMemberEntry(undefined, sName, splitLots, splitContrib, panForPerson);
          });
        } else {
          const singleName = splitNames[0] || rawApplicant;
          const panForPerson = pansList[0] || app.pan || app.panMasked || "ABCDE1234F";
          addMemberEntry(app.memberId, singleName, appLots, appContrib, panForPerson);
        }
      }
    });

    return Array.from(membersMap.values());
  }, [selectedIpo, realApplications]);

  // Filtered members based on PAN or Name search
  const filteredMemberApplications = useMemo(() => {
    if (!searchQuery.trim()) return memberApplications;
    const q = searchQuery.toLowerCase().trim();
    return memberApplications.filter((m) => {
      const nameMatch = m.name.toLowerCase().includes(q);
      const panMatch = m.pan.toLowerCase().includes(q);
      return nameMatch || panMatch;
    });
  }, [memberApplications, searchQuery]);

  // ── Auto-calculated values ──
  const totalApplicants = memberApplications.length;
  const totalAppliedLots = memberApplications.reduce((acc, m) => acc + m.lots, 0);
  const totalAppliedAmount = memberApplications.reduce((acc, m) => acc + m.contribution, 0);
  const perLotProfit = totalAppliedLots > 0 ? Math.round(numProfit / totalAppliedLots) : 0;


  const handlePublish = async () => {
    if (!selectedIpo || numProfit <= 0 || !hasApplicants) return;

    const payouts = memberApplications.map((m) => ({
      memberId: m.id,
      name: m.name,
      pan: m.pan,
      contribution: m.contribution,
      lots: m.lots,
      profit: Math.round(m.lots * perLotProfit),
    }));

    if (publishProfitDistribution) {
      await publishProfitDistribution(
        selectedIpo.id,
        numProfit,
        totalAppliedLots,
        typeof numAllottedLots === "number" ? numAllottedLots : 1,
        payouts
      );
    }

    try {
      const draftsStr = localStorage.getItem("nexo_distribute_drafts") || "{}";
      const drafts = JSON.parse(draftsStr);
      delete drafts[selectedIpo.id];
      localStorage.setItem("nexo_distribute_drafts", JSON.stringify(drafts));
    } catch {}

    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 5000);
  };

  const hasApplicants = memberApplications.length > 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {isSuccessToast && (
        <div className="p-4 bg-emerald-50 dark:bg-[#102C22] border border-emerald-200 dark:border-[#32C98B]/20 rounded-2xl text-emerald-800 dark:text-[#32C98B] text-sm font-extrabold flex items-center gap-3 animate-fade-in shadow-md">
          <CheckCircle size={22} weight="fill" className="text-emerald-600 dark:text-[#32C98B] shrink-0" />
          <span>
            ✓ Profit distribution published for <strong className="underline">{selectedIpo?.name}</strong>! It is now visible on the user-side IPO workspace.
          </span>
        </div>
      )}

      {/* ═══ SECTION 1: Controls ═══ */}
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1B1E23] pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 dark:bg-[#32C98B] text-white dark:text-[#101114] flex items-center justify-center font-black shadow-md shrink-0">
              <Coins size={24} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 dark:bg-[#102C22] text-emerald-600 dark:text-[#32C98B] border border-emerald-200 dark:border-[#32C98B]/20 font-mono">
                  PROFIT DISTRIBUTION
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">
                Distribute Profit
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={!selectedIpo || numProfit <= 0 || !hasApplicants}
            className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-md ${
              selectedIpo && numProfit > 0 && hasApplicants
                ? "bg-emerald-600 dark:bg-[#32C98B] hover:bg-emerald-700 dark:hover:bg-[#32C98B]/90 text-white dark:text-[#101114] active:scale-[0.98]"
                : "bg-slate-200 dark:bg-[#1D2026] text-slate-400 dark:text-[#626A75] cursor-not-allowed shadow-none"
            }`}
          >
            <Coins size={18} weight="bold" />
            <span>Publish Profit to Workspace</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>

        {/* ── Row 1: Select IPO + Allotted Lots (Admin input) + Total Profit (Admin input) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* 1. Select IPO */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-2">
              Select IPO
            </label>
            <CustomSelect
              value={selectedIpoId}
              onChange={(val) => setSelectedIpoId(val)}
              options={activeIpos.map((ipo) => ({
                value: ipo.id,
                label: ipo.name,
                sublabel: ipo.metrics?.issueSize ? `(${ipo.metrics.issueSize})` : undefined,
                badge: ipo.isHidden ? "History" : undefined,
              }))}
              className="w-full"
            />
          </div>

          {/* 2. Number of Allotted Lots (Admin enters) */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-2">
              Number of Allotted Lots
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-[#626A75]">
                <Package size={18} weight="bold" />
              </span>
              <input
                type="number"
                min={0}
                step="0.5"
                placeholder="e.g. 3"
                value={allottedLots}
                onChange={(e) => {
                  const raw = e.target.value === "" ? "" : Number(e.target.value);
                  handleLotsChange(raw);
                }}
                className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#14161A] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none shadow-xs"
              />
            </div>
            {autoAllottedBadge && (
              <p className="text-[11px] font-bold text-emerald-600 dark:text-[#32C98B] mt-1.5 flex items-center gap-1 font-mono">
                {autoAllottedBadge}
              </p>
            )}
          </div>

          {/* 3. Total Realized Profit (Admin enters) */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-[#F5F7FA] mb-2">
              Total Realized Profit (₹)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-[#626A75] font-mono font-bold text-base">₹</span>
              <input
                type="number"
                min={0}
                placeholder="e.g. 150000"
                value={totalProfit}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  handleProfitChange(val);
                }}
                className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl pl-9 pr-4 py-3 text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#14161A] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* ── Row 2: Auto-calculated summary cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Total Applicants (auto) */}
          <div className="bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-[#858D99]">
              <Users size={16} weight="bold" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Applicants</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-[#F5F7FA]">
              {totalApplicants}
              <span className="text-xs font-bold text-slate-400 dark:text-[#626A75] ml-1">Members</span>
            </div>
          </div>

          {/* Total Money Applied (auto) */}
          <div className="bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-[#858D99]">
              <Wallet size={16} weight="bold" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Money Applied</span>
            </div>
            <div className="text-xl font-mono font-black text-slate-900 dark:text-[#F5F7FA]">
              ₹{totalAppliedAmount.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Total Applied Lots (auto) */}
          <div className="bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-2xl p-4 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-[#858D99]">
              <Package size={16} weight="bold" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Applied Lots</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-[#F5F7FA]">
              {totalAppliedLots % 1 === 0 ? totalAppliedLots : totalAppliedLots.toFixed(1)}
              <span className="text-xs font-bold text-slate-400 dark:text-[#626A75] ml-1">Lots</span>
            </div>
          </div>

          {/* Per Lot Profit (auto) */}
          <div className="bg-emerald-50 dark:bg-[#102C22] border border-emerald-200 dark:border-[#32C98B]/20 rounded-2xl p-4 space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-[#32C98B]">
              <Calculator size={16} weight="bold" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Per Lot Profit</span>
            </div>
            <div className="text-xl font-mono font-black text-emerald-700 dark:text-[#32C98B]">
              ₹{perLotProfit.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: Member Payout Table ═══ */}
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-[#1B1E23] pb-4 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">
              Individual Payout Breakdown
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-[#858D99]">
              Auto-calculated per individual member contribution for <strong className="text-slate-800 dark:text-[#F5F7FA]">{selectedIpo?.name || "—"}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-500 dark:text-[#858D99]">
              Total Profit: <strong className="font-mono text-emerald-600 dark:text-[#32C98B] font-extrabold">₹{numProfit.toLocaleString("en-IN")}</strong>
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#858D99]">
              Per Lot Profit: <strong className="font-mono text-blue-600 dark:text-[#6B93FF] font-extrabold">₹{perLotProfit.toLocaleString("en-IN")}</strong>
            </span>
          </div>
        </div>

        {/* Search Bar for Member Name and PAN */}
        {hasApplicants && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#626A75] pointer-events-none">
                <MagnifyingGlass size={16} weight="bold" />
              </span>
              <input
                type="text"
                placeholder="Search by Member Name or PAN Card..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F5F7FA] placeholder:text-slate-400 dark:placeholder:text-[#626A75] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className="text-xs font-bold text-slate-400 dark:text-[#858D99] self-center">
                Showing {filteredMemberApplications.length} of {totalApplicants} members
              </span>
            )}
          </div>
        )}

        {!hasApplicants ? (
          <div className="p-10 text-center space-y-2">
            <Users size={36} className="text-slate-300 dark:text-[#626A75] mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-[#F5F7FA]">No Applicants Found</h4>
            <p className="text-xs text-slate-500 dark:text-[#858D99]">
              No applications have been submitted for this IPO yet on the user-side website.
            </p>
          </div>
        ) : filteredMemberApplications.length === 0 ? (
          <div className="p-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-[#252931] rounded-2xl">
            <MagnifyingGlass size={32} className="text-slate-300 dark:text-[#626A75] mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-[#F5F7FA]">No Matching Members Found</h4>
            <p className="text-xs text-slate-500 dark:text-[#858D99]">
              No applicants or PAN cards match &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#252931] bg-slate-50 dark:bg-[#14161A] text-slate-500 dark:text-[#626A75] uppercase text-[10px] font-extrabold tracking-wider">
                  <th className="p-3.5 rounded-l-xl">Member Name</th>
                  <th className="p-3.5">PAN Card</th>
                  <th className="p-3.5 text-right">Money Applied (₹)</th>
                  <th className="p-3.5 text-center">Applied Lots</th>
                  <th className="p-3.5 text-right rounded-r-xl">Individual Profit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1B1E23] font-medium text-slate-800 dark:text-[#F5F7FA]">
                {filteredMemberApplications.map((m, idx) => {
                  const individualProfit = Math.round(m.lots * perLotProfit);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-[#14161A] transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-[#F5F7FA] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#1D2026] text-slate-700 dark:text-[#AEB5C0] flex items-center justify-center text-xs shrink-0 font-bold uppercase">
                          <User size={16} />
                        </div>
                        <span>{m.name.startsWith("@") ? m.name : `@${m.name}`}</span>
                      </td>
                      <td className="p-3.5">
                        <CopyButton
                          text={m.pan}
                          label={m.pan}
                          className="font-mono text-xs font-bold"
                        />
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-[#F5F7FA]">
                        ₹{m.contribution.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-[#17233D] text-blue-700 dark:text-[#6B93FF] font-extrabold font-mono text-xs border border-blue-200 dark:border-[#6B93FF]/30">
                          {m.lots % 1 === 0 ? m.lots : m.lots.toFixed(1)} Lot{m.lots > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-[#32C98B] text-sm sm:text-base">
                        ₹{individualProfit.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals Row */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-[#343943] bg-slate-50/70 dark:bg-[#14161A] font-extrabold text-slate-900 dark:text-[#F5F7FA]">
                  <td className="p-3.5" colSpan={2}>
                    TOTAL ({totalApplicants} Members)
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-900 dark:text-[#F5F7FA] font-black">
                    ₹{totalAppliedAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {totalAppliedLots % 1 === 0 ? totalAppliedLots : totalAppliedLots.toFixed(1)} Lots
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-700 dark:text-[#32C98B] text-sm sm:text-base">

                    ₹{numProfit.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
