"use client";

import React, { useState, useMemo } from "react";
import { Coins, CheckCircle, ArrowRight, User, Users, Calculator, Package, Wallet } from "@phosphor-icons/react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useAdmin } from "../context/AdminContext";

export function DistributeProfitView() {
  const { ipos, publishProfitDistribution } = useAdmin();

  // Show all IPOs (active + historical/hidden) for profit distribution
  const activeIpos = ipos;

  const [selectedIpoId, setSelectedIpoId] = useState(activeIpos[0]?.id || "");
  const [allottedLots, setAllottedLots] = useState<number | "">(1);
  const [totalProfit, setTotalProfit] = useState<number | "">("");
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [realApplications, setRealApplications] = useState<any[]>([]);
  const [isFetchingApps, setIsFetchingApps] = useState(false);

  const selectedIpo = activeIpos.find((ipo) => ipo.id === selectedIpoId) || activeIpos[0];

  // Fetch real applications from API whenever selected IPO changes
  React.useEffect(() => {
    if (!selectedIpoId) return;
    setIsFetchingApps(true);
    fetch(`/api/admin/allotment?ipoId=${selectedIpoId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.applications)) {
          setRealApplications(data.applications);
        } else {
          setRealApplications([]);
        }
      })
      .catch(() => setRealApplications([]))
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

  // ── Auto-fetch individual member contributions & lots ──
  const memberApplications = useMemo(() => {
    const rawApps = realApplications.length > 0 ? realApplications : selectedIpo?.applications || [];
    if (!rawApps || rawApps.length === 0) {
      return [];
    }

    const minInv = selectedIpo.metrics?.minInvestment || 15000;
    const formatHandle = (str: string) => {
      const trimmed = str.trim();
      if (!trimmed) return "@member";
      return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    };

    const membersMap = new Map<string, { id: string; name: string; lots: number; contribution: number; pan: string }>();

    rawApps.forEach((app: any) => {
      // Combined pool application with multiple participants
      if (Array.isArray(app.participants) && app.participants.length > 0) {
        app.participants.forEach((p: any) => {
          let pName = p.memberName || p.name || app.applicantName || "Member";
          if (pName.includes(",")) {
            pName = pName.split(",")[0].trim();
          }
          const formattedName = formatHandle(pName);
          const pKey = (p.memberId || formattedName.replace(/^@/, "")).toLowerCase().trim();
          const pPan = app.pan || app.panMasked || p.panMasked || p.panFull || "ABCDE1234F";
          const pContrib = p.contribution || (app.totalContribution ? app.totalContribution / app.participants.length : minInv);
          const lotVal = pContrib / minInv;

          if (membersMap.has(pKey)) {
            const existing = membersMap.get(pKey)!;
            existing.lots += lotVal;
            existing.contribution += pContrib;
          } else {
            membersMap.set(pKey, {
              id: p.memberId || `mem_${Date.now()}_${Math.random()}`,
              name: formattedName,
              lots: lotVal,
              contribution: pContrib,
              pan: pPan,
            });
          }
        });
      } else {
        // Single applicant or comma-separated names
        const rawName = app.applicantName || app.username || "Member";
        const lotVal = app.lotsApplied || app.lotCount || 1;
        const appContrib = app.totalContribution || (lotVal * minInv);
        const aPan = app.pan || app.panMasked || (Array.isArray(app.panNumbers) && app.panNumbers[0]) || "ABCDE1234F";

        if (rawName.includes(",")) {
          const splitNames = rawName.split(",").map((s: string) => s.trim()).filter(Boolean);
          const splitLot = lotVal / splitNames.length;
          const splitContrib = appContrib / splitNames.length;
          splitNames.forEach((sName: string) => {
            const formattedName = formatHandle(sName);
            const sKey = formattedName.replace(/^@/, "").toLowerCase();
            if (membersMap.has(sKey)) {
              const existing = membersMap.get(sKey)!;
              existing.lots += splitLot;
              existing.contribution += splitContrib;
            } else {
              membersMap.set(sKey, {
                id: `mem_${sKey}`,
                name: formattedName,
                lots: splitLot,
                contribution: splitContrib,
                pan: aPan,
              });
            }
          });
        } else {
          const formattedName = formatHandle(rawName);
          const aKey = (app.username || app.memberId || formattedName.replace(/^@/, "")).toLowerCase().trim();
          if (membersMap.has(aKey)) {
            const existing = membersMap.get(aKey)!;
            existing.lots += lotVal;
            existing.contribution += appContrib;
          } else {
            membersMap.set(aKey, {
              id: app.memberId || app.id,
              name: formattedName,
              lots: lotVal,
              contribution: appContrib,
              pan: aPan,
            });
          }
        }
      }
    });

    return Array.from(membersMap.values());
  }, [selectedIpo, realApplications]);

  // ── Auto-calculated values ──
  const totalApplicants = memberApplications.length;
  const totalAppliedLots = memberApplications.reduce((acc, m) => acc + m.lots, 0);
  const totalAppliedAmount = memberApplications.reduce((acc, m) => acc + m.contribution, 0);
  const perLotProfit = totalAppliedLots > 0 ? Math.round(numProfit / totalAppliedLots) : 0;

  const handlePublish = async () => {
    if (!selectedIpo || numProfit <= 0 || !hasApplicants) return;

    if (publishProfitDistribution) {
      await publishProfitDistribution(
        selectedIpo.id,
        numProfit,
        totalAppliedLots,
        typeof numAllottedLots === "number" ? numAllottedLots : 1
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-[#1B1E23] pb-3 gap-3">
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

        {!hasApplicants ? (
          <div className="p-10 text-center space-y-2">
            <Users size={36} className="text-slate-300 dark:text-[#626A75] mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-[#F5F7FA]">No Applicants Found</h4>
            <p className="text-xs text-slate-500 dark:text-[#858D99]">
              No applications have been submitted for this IPO yet on the user-side website.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#252931] bg-slate-50 dark:bg-[#14161A] text-slate-500 dark:text-[#626A75] uppercase text-[10px] font-extrabold tracking-wider">
                  <th className="p-3.5 rounded-l-xl">Member Name</th>
                  <th className="p-3.5">PAN</th>
                  <th className="p-3.5 text-right">Money Applied (₹)</th>
                  <th className="p-3.5 text-center">Applied Lots</th>
                  <th className="p-3.5 text-right rounded-r-xl">Individual Profit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1B1E23] font-medium text-slate-800 dark:text-[#F5F7FA]">
                {memberApplications.map((m, idx) => {
                  const individualProfit = Math.round(m.lots * perLotProfit);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-[#14161A] transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-[#F5F7FA] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#1D2026] text-slate-700 dark:text-[#AEB5C0] flex items-center justify-center text-xs shrink-0 font-bold uppercase">
                          <User size={16} />
                        </div>
                        <span>{m.name.startsWith("@") ? m.name : `@${m.name}`}</span>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-slate-500 dark:text-[#858D99]">{m.pan}</td>
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
