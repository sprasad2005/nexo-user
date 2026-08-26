"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MetricCard, Card } from "../ui/Card";
import { formatINR } from "@/lib/mockData";
import { CustomSelect } from "../ui/CustomSelect";
import {
  Wallet,
  Users,
  TrendUp,
  Coins,
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  Sparkle,
  ArrowRight,
  ShieldCheck,
  Building,
  CalendarCheck,
  HandCoins,
  FileText,
  IdentificationCard,
} from "@phosphor-icons/react";

interface AppliedIpoSummary {
  ipoId: string;
  ipoName: string;
  category: string;
  status: string;
  appliedDate: string | Date;
  yourCapital: number;
  groupCapital: number;
  yourLots: number;
  groupLots: number;
  yourApplicationsCount: number;
  groupApplicationsCount: number;
  profit: number;
}

interface AllottedAccount {
  applicantName: string;
  username: string;
  pan: string;
  lots: number;
  status: string;
  isSelf: boolean;
  allottedDate?: string | Date;
}

interface GroupContributor {
  memberId?: string;
  memberName: string;
  username: string;
  capital: number;
  lots: number;
  percentage: number;
  isSelf: boolean;
}

interface PortfolioTransaction {
  id: string;
  ipoId: string;
  ipoName: string;
  type: string;
  amount: number;
  userAmount?: number;
  totalPoolAmount?: number;
  applicationNumber?: string;
  participants?: string[];
  pan?: string;
  status?: string;
  createdAt: string | Date;
}

interface PortfolioData {
  hasApplications: boolean;
  appliedIpos: AppliedIpoSummary[];
  selectedIpo: {
    id: string;
    name: string;
    category: string;
    status: string;
    appliedDate: string | Date;
    minInvestment: number;
    lotSize: number;
    allotmentDate: string;
    listingDate: string;
    isSolo: boolean;
  } | null;
  summary: {
    totalGroupCapital: number;
    groupApplicationsCount: number;
    yourCapital: number;
    yourApplicationsCount: number;
    thisIpoProfit: number;
    tillNowProfit: number;
    totalIposCount: number;
    allottedAccountsCount?: number;
  };
  allottedAccounts?: AllottedAccount[];
  groupBreakdown?: GroupContributor[];
  transactions: PortfolioTransaction[];
}

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

const formatLots = (lots: number) => {
  if (!lots || isNaN(lots)) return "0 Lots";
  const formatted = lots % 1 === 0 ? lots.toString() : (Math.round(lots * 100) / 100).toString();
  return `${formatted} Lot${lots > 1 || lots < 1 ? "s" : ""}`;
};

export function PortfolioView() {
  const [selectedIpoId, setSelectedIpoId] = useState<string>("");
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consolidated Fetch from /api/portfolio
  const fetchPortfolio = useCallback(async (ipoId?: string) => {
    try {
      setLoading(true);
      const url = ipIdValid(ipoId)
        ? `/api/portfolio?ipoId=${encodeURIComponent(ipoId!)}`
        : "/api/portfolio";

      const res = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      const json = await res.json();
      if (json.success) {
        setData(json);
        if (!ipoId && json.appliedIpos?.length > 0 && !selectedIpoId) {
          setSelectedIpoId(json.appliedIpos[0].ipoId);
        }
      } else {
        setError(json.error || "Failed to load portfolio");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [selectedIpoId]);

  function ipIdValid(id?: string): boolean {
    return Boolean(id && id.trim().length > 0);
  }

  useEffect(() => {
    fetchPortfolio(selectedIpoId);
  }, [fetchPortfolio, selectedIpoId]);

  const handleSelectIpo = (newIpoId: string) => {
    if (newIpoId !== selectedIpoId) {
      setSelectedIpoId(newIpoId);
    }
  };



  // 1. Loading Skeleton State
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse font-sans">
        <div className="h-12 bg-slate-800/40 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/40 rounded-2xl border border-line" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error || !data) {
    return (
      <div className="p-8 text-center bg-surface border border-rose-500/20 rounded-2xl text-rose-400 font-sans">
        <p className="font-bold">Unable to load portfolio</p>
        <p className="text-xs text-ink-secondary mt-1">{error || "No data received"}</p>
        <button
          onClick={() => fetchPortfolio(selectedIpoId)}
          className="mt-4 px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // 3. Clean Empty State (User has no IPO applications yet)
  if (!data.hasApplications || !data.appliedIpos || data.appliedIpos.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in font-sans select-none pb-12">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">Portfolio</h1>
            <p className="text-xs text-ink-secondary mt-1 font-medium">
              Track your active and previous IPO investments
            </p>
          </div>
        </div>

        <Card className="border-line text-center py-16 px-4">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4 shadow-sm">
              <Sparkle size={28} weight="fill" />
            </div>
            <h2 className="text-lg font-black text-ink">No IPO Applications Found</h2>
            <p className="text-xs text-ink-secondary mt-2 leading-relaxed">
              You haven&apos;t applied for any IPOs yet. Explore ongoing IPOs and start building your syndicate portfolio.
            </p>
            <a
              href="/"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <span>Explore Active IPOs</span>
              <ArrowRight size={14} weight="bold" />
            </a>
          </div>
        </Card>
      </div>
    );
  }

  const { appliedIpos, selectedIpo, summary, allottedAccounts = [], transactions } = data;

  // Selected IPO Select Dropdown Options
  const ipoOptions = appliedIpos.map((ipo) => ({
    value: ipo.ipoId,
    label: ipo.ipoName,
    badge: formatLots(ipo.yourLots),
  }));

  const activeIpo = selectedIpo || {
    id: appliedIpos[0]?.ipoId || "",
    name: appliedIpos[0]?.ipoName || "IPO",
    category: appliedIpos[0]?.category || "Mainboard",
    status: appliedIpos[0]?.status || "PENDING",
    appliedDate: appliedIpos[0]?.appliedDate || new Date(),
    minInvestment: 15000,
    lotSize: 1,
    allotmentDate: "01 Sep 2026",
    listingDate: "04 Sep 2026",
    isSolo: false,
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans select-none pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER WITH IPO SELECTOR CONTEXT
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
              Portfolio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
              IPO Centric
            </span>
          </div>
          <p className="text-xs text-ink-secondary mt-1 font-medium">
            Live capital allocation, multi-friend group distribution, and realized profits.
          </p>
        </div>

        {/* IPO Selector Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-extrabold text-ink-tertiary uppercase tracking-wider whitespace-nowrap hidden sm:inline">
            Select IPO:
          </span>
          <CustomSelect
            value={selectedIpoId || activeIpo.id}
            onChange={handleSelectIpo}
            options={ipoOptions}
            className="min-w-[200px] sm:min-w-[240px]"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP 4 FINANCIAL METRIC CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Applied Capital (All Users * Lot Price) */}
        <MetricCard
          label="TOTAL APPLIED CAPITAL"
          value={formatINR(summary.totalGroupCapital || 0)}
          subtitle={`${formatLots(summary.groupApplicationsCount || 0)} total applied`}
          icon={<Users size={20} className="text-purple-500" />}
        />

        {/* Card 2: Your Applied Capital (Solo + Multi-friend applied money) */}
        <MetricCard
          label="YOUR APPLIED CAPITAL"
          value={formatINR(summary.yourCapital || 0)}
          subtitle={`${formatLots(summary.yourApplicationsCount || 0)} applied`}
          icon={<Wallet size={20} className="text-blue-500" />}
        />

        {/* Card 3: This IPO Profit */}
        <MetricCard
          label="THIS IPO PROFIT"
          value={summary.thisIpoProfit > 0 ? formatINR(summary.thisIpoProfit, true) : "₹0"}
          subtitle={
            summary.thisIpoProfit > 0
              ? activeIpo.name
              : activeIpo.status === "ALLOTTED"
              ? "Allotted — Awaiting listing"
              : "Pending allotment"
          }
          icon={<TrendUp size={20} className="text-emerald-500" />}
        />

        {/* Card 4: Till Now Profit */}
        <MetricCard
          label="TILL NOW PROFIT"
          value={summary.tillNowProfit > 0 ? formatINR(summary.tillNowProfit, true) : "₹0"}
          subtitle={`Across ${summary.totalIposCount || 1} IPO(s)`}
          icon={<Coins size={20} className="text-amber-500" />}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SELECTED IPO HIGHLIGHT & MULTI-FRIEND GROUP SECTION
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Selected IPO Detail Card */}
        <Card className="border-line bg-surface/60 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-extrabold text-sm">
                <Building size={16} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-black text-ink tracking-tight line-clamp-1">
                  {activeIpo.name}
                </h3>
                <span className="text-[10px] font-bold text-ink-tertiary uppercase">
                  {activeIpo.category} Category
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-line/60 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary font-medium">Your Ownership / Lots:</span>
                <span className="font-extrabold text-ink">{formatLots(summary.yourApplicationsCount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary font-medium">Group Total Lots:</span>
                <span className="font-extrabold text-purple-400">{formatLots(summary.groupApplicationsCount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary font-medium">Allotment Date:</span>
                <span className="font-bold text-ink">{activeIpo.allotmentDate || "01 Sep 2026"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary font-medium">Expected Listing Date:</span>
                <span className="font-bold text-ink">{activeIpo.listingDate || "04 Sep 2026"}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between bg-surface-alt/50 -mx-4 -mb-4 p-3.5 rounded-b-2xl">
            <span className="text-xs font-bold text-ink-secondary">Realized IPO P&amp;L:</span>
            <span
              className={`text-sm font-black num-tabular ${
                summary.thisIpoProfit > 0 ? "text-emerald-500" : "text-ink-secondary"
              }`}
            >
              {summary.thisIpoProfit > 0 ? formatINR(summary.thisIpoProfit, true) : "₹0"}
            </span>
          </div>
        </Card>

        {/* Allotted Username & PAN Card Details Card */}
        <div className="lg:col-span-2">
          <Card className="border-line h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <IdentificationCard size={18} className="text-blue-500" />
                  <h3 className="text-sm font-black text-ink uppercase tracking-wider">
                    Allotted Username &amp; PAN Card
                  </h3>
                  {allottedAccounts.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {allottedAccounts.length} Allotted
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-ink-tertiary">
                  {activeIpo.name}
                </span>
              </div>

              {allottedAccounts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line text-ink-tertiary uppercase text-[10px] tracking-wider font-extrabold bg-surface-alt/60">
                        <th className="py-2.5 px-3">Applicant / Username</th>
                        <th className="py-2.5 px-3">Allotted PAN Card</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {allottedAccounts.map((acc, idx) => (
                        <tr
                          key={`${acc.pan}_${idx}`}
                          className={`transition-colors ${
                            acc.isSelf
                              ? "bg-emerald-500/5 hover:bg-emerald-500/10 font-bold"
                              : "hover:bg-surface-alt/40"
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-ink">{acc.applicantName}</span>
                              {acc.isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500 text-white dark:text-black">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[11px] font-extrabold tracking-wider text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              {acc.pan}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              <CheckCircle size={10} weight="bold" /> Allotted
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 px-4 flex flex-col items-center justify-center text-center bg-surface-alt/40 rounded-xl border border-line/50">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
                    <Clock size={20} weight="bold" />
                  </div>
                  <h4 className="text-sm font-extrabold text-ink">No Allotment Recorded</h4>
                  <p className="text-xs text-ink-secondary mt-1 max-w-sm">
                    No PAN cards or applicant accounts have been allotted for {activeIpo.name} yet.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. SELECTED IPO — TRANSACTIONS & DEDUCTIONS
      ───────────────────────────────────────────────────────────── */}
      <Card className="border-line">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-ink uppercase tracking-wider">
              {activeIpo.name} — Transactions &amp; Deductions
            </h3>
            {transactions.length > 0 && (
              <span className="text-[10px] font-extrabold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                {transactions.length}
              </span>
            )}
          </div>
          <span className="text-xs text-ink-tertiary font-medium">
            Financial ledger scoped to {activeIpo.name}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-center bg-surface-alt/30 rounded-xl border border-line/50">
            <Receipt size={24} className="text-ink-tertiary" />
            <p className="text-xs font-bold text-ink-secondary">
              No transactions recorded for {activeIpo.name}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line text-ink-tertiary uppercase text-[10px] tracking-wider font-extrabold bg-surface-alt/70">
                  <th className="py-3 px-3.5">Date &amp; Time</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Participants</th>
                  <th className="py-3 px-3">PAN Card</th>
                  <th className="py-3 px-3 text-right">Your Applied Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {transactions.map((txn, idx) => {
                  const d = new Date(txn.createdAt);
                  const dateStr = isValidDate(d)
                    ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "24 Aug 2026";
                  const timeStr = isValidDate(d)
                    ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "12:30 PM";

                  const rawList = Array.isArray(txn.participants) ? txn.participants : [];

                  return (
                    <tr key={`${txn.id}_${idx}`} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-ink">{dateStr}</div>
                        <div className="text-[10px] font-mono text-ink-tertiary">{timeStr}</div>
                      </td>
                      <td className="py-3 px-3">
                        {txn.type === "PROFIT_DISTRIBUTION" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <TrendUp size={10} weight="bold" /> Payout
                          </span>
                        ) : txn.type === "SOLO" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-500 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">
                            <Wallet size={10} weight="bold" /> Solo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-500 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
                            <Users size={10} weight="bold" /> Group
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">
                        {rawList.length > 0 ? rawList.join(", ") : "Self"}
                      </td>
                      <td className="py-3 px-3">
                        {txn.pan && txn.pan !== "—" ? (
                          <span className="font-mono text-[11px] font-extrabold tracking-wider text-ink-secondary bg-surface-alt px-2 py-0.5 rounded border border-line">
                            {txn.pan}
                          </span>
                        ) : (
                          <span className="text-ink-tertiary text-[11px] font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-ink num-tabular">
                        <div>{formatINR(txn.amount)}</div>
                        {txn.totalPoolAmount && txn.totalPoolAmount > txn.amount ? (
                          <div className="text-[10px] font-bold text-purple-400 leading-tight mt-0.5">
                            {formatINR(txn.totalPoolAmount)} Pool
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
