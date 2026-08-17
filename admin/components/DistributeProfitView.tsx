"use client";

import React, { useState, useMemo, useEffect, Component, ErrorInfo, ReactNode } from "react";
import {
  Coins,
  CheckCircle,
  ArrowRight,
  User,
  Users,
  Calculator,
  Package,
  Wallet,
  MagnifyingGlass,
  X,
  WarningCircle,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CopyButton } from "@/components/ui/CopyButton";
import { useAdmin } from "../context/AdminContext";

// ─────────────────────────────────────────────────────────────────────────────
// SAFE NUMERIC & STRING HELPERS (100% crash-proof against NaN/Infinity/null)
// ─────────────────────────────────────────────────────────────────────────────

function safeNum(val: any, fallback = 0): number {
  if (typeof val === "number") {
    return isFinite(val) && !isNaN(val) ? val : fallback;
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isFinite(parsed) && !isNaN(parsed) ? parsed : fallback;
  }
  return fallback;
}

function safeFormatINR(val: number | string | undefined | null): string {
  const n = safeNum(val, 0);
  return n.toLocaleString("en-IN");
}

function formatHandle(str: any): string {
  if (typeof str !== "string") return "@member";
  const trimmed = str.replace(/^@+/, "").trim();
  return trimmed ? `@${trimmed}` : "@member";
}

function splitMultiNames(str: any): string[] {
  if (typeof str !== "string" || !str.trim()) return [];
  return str
    .split(/,|\band\b|&|\+/i)
    .map((s) => (typeof s === "string" ? s.replace(/^@+/, "").trim() : ""))
    .filter(Boolean);
}

function cleanPanNumber(panStr: any): string {
  if (typeof panStr !== "string") return "ABCDE1234F";
  const upper = panStr.trim().toUpperCase();
  if (upper.length === 10 && !upper.includes("X")) return upper;
  return upper || "ABCDE1234F";
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DistributeProfitErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DistributeProfitView] Caught crash:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-[#101114] border border-rose-200 dark:border-rose-900/40 rounded-3xl p-8 shadow-sm space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/30">
            <WarningCircle size={28} weight="bold" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">
              Distributive Profit Encountered an Issue
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#858D99] max-w-md mx-auto">
              A temporary rendering or data error occurred. Click retry below to reload the calculations safely.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-[#101114] font-extrabold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
          >
            <ArrowClockwise size={15} weight="bold" />
            <span>Retry Distributive Profit</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DISTRIBUTE PROFIT VIEW
// ─────────────────────────────────────────────────────────────────────────────

function DistributeProfitInner() {
  const adminCtx = useAdmin();
  const rawIpos = adminCtx?.ipos;
  const publishProfitDistribution = adminCtx?.publishProfitDistribution;

  // Ensure activeIpos is always an array
  const activeIpos = Array.isArray(rawIpos) ? rawIpos : [];

  const [selectedIpoId, setSelectedIpoId] = useState<string>("");
  const [allottedLots, setAllottedLots] = useState<number | "">(1);
  const [totalProfit, setTotalProfit] = useState<number | "">("");
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [realApplications, setRealApplications] = useState<any[]>([]);
  const [isFetchingApps, setIsFetchingApps] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [autoAllottedBadge, setAutoAllottedBadge] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize selected IPO from storage or fallback
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeIpos.length === 0) return;

    try {
      const stored = localStorage.getItem("nexo_distribute_selected_ipo_id");
      if (stored && activeIpos.some((i) => i && i.id === stored)) {
        setSelectedIpoId(stored);
      } else if (activeIpos[0]?.id && !selectedIpoId) {
        setSelectedIpoId(activeIpos[0].id);
      }
    } catch {
      if (activeIpos[0]?.id && !selectedIpoId) {
        setSelectedIpoId(activeIpos[0].id);
      }
    }
  }, [activeIpos, selectedIpoId]);

  // Selected IPO object
  const selectedIpo = useMemo(() => {
    if (activeIpos.length === 0) return null;
    return activeIpos.find((ipo) => ipo && ipo.id === selectedIpoId) || activeIpos[0] || null;
  }, [activeIpos, selectedIpoId]);

  // Fetch real applications from API whenever selected IPO changes with AbortController
  useEffect(() => {
    if (!selectedIpoId) {
      setRealApplications([]);
      setIsFetchingApps(false);
      return;
    }

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

    const controller = new AbortController();
    setIsFetchingApps(true);
    setFetchError(null);

    fetch(`/api/admin/allotment?ipoId=${encodeURIComponent(selectedIpoId)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.applications)) {
          setRealApplications(data.applications);
          try {
            localStorage.setItem(`nexo_admin_apps_${selectedIpoId}`, JSON.stringify(data.applications));
          } catch {}

          // Auto-calculate allotted lots from the allotment section
          let autoCount = 0;
          data.applications.forEach((app: any) => {
            if (!app) return;
            if (Array.isArray(app.allottedIndices) && app.allottedIndices.length > 0) {
              autoCount += app.allottedIndices.length;
            } else if (app.allotmentStatus === "ALLOTTED") {
              autoCount += safeNum(app.lotsApplied || app.lotCount, 1);
            }
          });

          if (autoCount > 0) {
            setAllottedLots(autoCount);
            setAutoAllottedBadge(`✓ Auto-fetched ${autoCount} Allotted Lot${autoCount > 1 ? "s" : ""} from Allotment Section`);
          } else {
            const totalApplied = data.applications.reduce(
              (sum: number, app: any) => sum + safeNum(app?.lotsApplied || app?.lotCount, 1),
              0
            );
            setAllottedLots(totalApplied > 0 ? totalApplied : 1);
            setAutoAllottedBadge("ℹ No lots marked Allotted yet in Allotment Section (showing total applied)");
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("[DistributeProfitView] Applications fetch warning:", err);
          setFetchError("Unable to fetch fresh application data. Displaying cached records.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingApps(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedIpoId]);

  // Sync state with published profit distribution or local draft whenever selected IPO changes
  useEffect(() => {
    if (!selectedIpo) return;

    // Check draft first
    try {
      const draftsStr = localStorage.getItem("nexo_distribute_drafts");
      if (draftsStr) {
        const drafts = JSON.parse(draftsStr);
        if (drafts && drafts[selectedIpo.id]) {
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
  }, [selectedIpo]);

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

  const numProfit = safeNum(totalProfit, 0);
  const numAllottedLots = safeNum(allottedLots, 1);

  // ── Auto-fetch individual member contributions & lots ──
  const memberApplications = useMemo(() => {
    const rawApps = realApplications.length > 0 ? realApplications : selectedIpo?.applications || [];
    if (!Array.isArray(rawApps) || rawApps.length === 0) {
      return [];
    }

    const minInv = safeNum(selectedIpo?.metrics?.minInvestment, 15000) || 15000;
    const membersMap = new Map<string, { id: string; name: string; lots: number; contribution: number; pan: string }>();

    const addMemberEntry = (memberId: string | undefined, nameStr: any, lots: number, contribution: number, panStr: any) => {
      const cleanName = formatHandle(nameStr);
      const key = (memberId || cleanName.replace(/^@/, "")).toLowerCase().trim();
      const cleanPan = cleanPanNumber(panStr);
      const safeLots = safeNum(lots, 0);
      const safeContrib = safeNum(contribution, 0);

      if (membersMap.has(key)) {
        const existing = membersMap.get(key)!;
        existing.lots += safeLots;
        existing.contribution += safeContrib;
        if ((!existing.pan || existing.pan === "ABCDE1234F" || existing.pan.includes("X")) && cleanPan && cleanPan !== "ABCDE1234F") {
          existing.pan = cleanPan;
        }
      } else {
        membersMap.set(key, {
          id: memberId || `mem_${key}`,
          name: cleanName,
          lots: safeLots,
          contribution: safeContrib,
          pan: cleanPan,
        });
      }
    };

    rawApps.forEach((app: any) => {
      if (!app) return;
      const pansList = Array.isArray(app.panNumbers) && app.panNumbers.length > 0
        ? app.panNumbers
        : [app.pan || app.panMasked || app.panFull || "ABCDE1234F"];

      const appLots = safeNum(app.lotsApplied || app.lotCount || pansList.length, 1);
      const appContrib = safeNum(app.totalContribution, appLots * minInv);

      // Check participants / contributors first
      const pool = (Array.isArray(app.participants) && app.participants.length > 0)
        ? app.participants
        : (Array.isArray(app.contributors) && app.contributors.length > 0)
        ? app.contributors
        : null;

      if (pool && pool.length > 0) {
        const poolLen = Math.max(1, pool.length);
        pool.forEach((p: any, idx: number) => {
          if (!p) return;
          const rawPName = p.memberName || p.name || p.username || "";
          const subNames = splitMultiNames(rawPName);
          const pPan = p.panMasked || p.panFull || p.pan || pansList[idx] || pansList[0] || "ABCDE1234F";
          const pContrib = safeNum(p.contribution || p.amount, appContrib / poolLen);
          const pLots = safeNum(p.lots, minInv > 0 ? pContrib / minInv : appLots / poolLen);

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
    if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim()) {
      return memberApplications;
    }
    const q = searchQuery.toLowerCase().trim();
    return memberApplications.filter((m) => {
      if (!m) return false;
      const nameMatch = typeof m.name === "string" && m.name.toLowerCase().includes(q);
      const panMatch = typeof m.pan === "string" && m.pan.toLowerCase().includes(q);
      return nameMatch || panMatch;
    });
  }, [memberApplications, searchQuery]);

  // ── Auto-calculated values ──
  const totalApplicants = memberApplications.length;
  const totalAppliedLots = memberApplications.reduce((acc, m) => acc + safeNum(m?.lots, 0), 0);
  const totalAppliedAmount = memberApplications.reduce((acc, m) => acc + safeNum(m?.contribution, 0), 0);
  const perLotProfit = totalAppliedLots > 0 ? Math.max(0, Math.round(numProfit / totalAppliedLots)) : 0;
  const hasApplicants = memberApplications.length > 0;

  const handlePublish = async () => {
    if (!selectedIpo || numProfit <= 0 || !hasApplicants) return;

    const payouts = memberApplications.map((m) => ({
      memberId: m.id,
      name: m.name,
      pan: m.pan,
      contribution: m.contribution,
      lots: m.lots,
      profit: Math.max(0, Math.round(safeNum(m.lots, 0) * perLotProfit)),
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

  // ── EMPTY STATE IF 0 IPOS ──
  if (activeIpos.length === 0) {
    return (
      <div className="bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] rounded-3xl p-10 text-center space-y-3 shadow-2xs font-sans">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-[#2A200B] text-amber-600 dark:text-[#E5B544] flex items-center justify-center mx-auto border border-amber-200 dark:border-[#E5B544]/30">
          <Coins size={28} weight="bold" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F5F7FA]">
          No IPOs Available for Profit Distribution
        </h3>
        <p className="text-xs text-slate-500 dark:text-[#858D99] max-w-md mx-auto">
          There are currently no active or historical IPOs in your workspace. Add an IPO in the IPO Management section to calculate and distribute syndicate profits.
        </p>
      </div>
    );
  }

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

      {/* Fetch Warning if any */}
      {fetchError && (
        <div className="p-3.5 bg-amber-50 dark:bg-[#2A200B]/60 border border-amber-200 dark:border-[#E5B544]/30 rounded-2xl text-amber-800 dark:text-[#E5B544] text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarningCircle size={17} weight="fill" className="text-amber-600 dark:text-[#E5B544] shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => setSelectedIpoId((prev) => prev)}
            className="text-[11px] underline font-extrabold cursor-pointer"
          >
            Retry
          </button>
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
              ₹{safeFormatINR(totalAppliedAmount)}
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
              ₹{safeFormatINR(perLotProfit)}
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
              Total Profit: <strong className="font-mono text-emerald-600 dark:text-[#32C98B] font-extrabold">₹{safeFormatINR(numProfit)}</strong>
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-[#858D99]">
              Per Lot Profit: <strong className="font-mono text-blue-600 dark:text-[#6B93FF] font-extrabold">₹{safeFormatINR(perLotProfit)}</strong>
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

        {isFetchingApps && !hasApplicants ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 dark:text-[#858D99]">
              Loading application and allotment records…
            </p>
          </div>
        ) : !hasApplicants ? (
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
                  const individualProfit = Math.max(0, Math.round(safeNum(m.lots, 0) * perLotProfit));
                  return (
                    <tr key={m.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-[#14161A] transition-colors">
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
                        ₹{safeFormatINR(m.contribution)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-[#17233D] text-blue-700 dark:text-[#6B93FF] font-extrabold font-mono text-xs border border-blue-200 dark:border-[#6B93FF]/30">
                          {m.lots % 1 === 0 ? m.lots : m.lots.toFixed(1)} Lot{m.lots > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-[#32C98B] text-sm sm:text-base">
                        ₹{safeFormatINR(individualProfit)}
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
                    ₹{safeFormatINR(totalAppliedAmount)}
                  </td>
                  <td className="p-3.5 text-center font-mono">
                    {totalAppliedLots % 1 === 0 ? totalAppliedLots : totalAppliedLots.toFixed(1)} Lots
                  </td>
                  <td className="p-3.5 text-right font-mono text-emerald-700 dark:text-[#32C98B] text-sm sm:text-base">
                    ₹{safeFormatINR(numProfit)}
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

export function DistributeProfitView() {
  return (
    <DistributeProfitErrorBoundary>
      <DistributeProfitInner />
    </DistributeProfitErrorBoundary>
  );
}
