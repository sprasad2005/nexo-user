"use client";

import React, { useState } from "react";
import { useNexo } from "@/context/NexoContext";
import { MetricCard, Card } from "../ui/Card";
import { StatusBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatINR } from "@/lib/mockData";
import { CopyButton } from "../ui/CopyButton";
import {
  Wallet,
  FileText,
  TrendUp,
  PencilSimple,
  Plus,
  X,
  CheckCircle,
  Receipt,
  Users,
  Trash,
  Coins,
  ArrowRight,
  ShieldCheck,
  WarningCircle,
  Copy,
} from "@phosphor-icons/react";
import { IPOOpportunity } from "@/types/nexo";

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

export function PortfolioView() {
  const {
    ipos,
    individualSavings,
    updateIndividualSavings,
    userContributions,
    updateUserContribution,
    transactions,
    clearTransactions,
    deleteTransaction,
    updateTransaction,
  } = useNexo();

  // Edit Savings Modal State
  const [isEditSavingsModalOpen, setIsEditSavingsModalOpen] = useState(false);
  const [savingsInput, setSavingsInput] = useState<string>("");
  const [quickAddFeedback, setQuickAddFeedback] = useState("");

  // Edit Transaction Modal State
  const [editingTxn, setEditingTxn] = useState<import("@/types/nexo").Transaction | null>(null);
  const [editTxnName, setEditTxnName] = useState("");
  const [editTxnAmount, setEditTxnAmount] = useState<number>(15000);
  const [editTxnPan, setEditTxnPan] = useState("");

  // Edit IPO Contribution Modal State
  const [editingIpo, setEditingIpo] = useState<IPOOpportunity | null>(null);
  const [contributionInput, setContributionInput] = useState("");

  // Delete confirmation: which txn ID is pending confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteNotification, setDeleteNotification] = useState<string | null>(null);

  // Calculate individual holdings strictly from user-added/edited contributions and transactions
  const myHoldings = ipos.map((ipo) => {
    const explicitContrib = userContributions[ipo.id] ?? 0;
    const txnContrib = transactions
      .filter((t) => t.ipoId === ipo.id && t.status !== "REFUNDED" && t.status !== "REJECTED")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIpoApplied = Math.max(explicitContrib, txnContrib);

    // Only calculate profit when allotment/listing status & gain is pushed by admin
    const isAdminPushed =
      ipo.status === "ALLOTTED" ||
      ipo.status === "SOLD" ||
      ipo.status === "HOLDING" ||
      ipo.status === "LISTED";

    let myProfit = 0;
    if (isAdminPushed && totalIpoApplied > 0 && ipo.listingGainPercent) {
      myProfit = Math.round((totalIpoApplied * ipo.listingGainPercent) / 100);
    }

    return {
      ipo,
      myContribution: totalIpoApplied,
      myProfit,
      hasContribution: totalIpoApplied > 0,
    };
  });

  // Calculate profit across transactions ONLY when allotment status is pushed by admin
  const transactionProfits = transactions
    .filter((t) => t.status === "ALLOTTED")
    .map((txn) => {
      const ipo = ipos.find((i) => i.id === txn.ipoId);
      const gainPct = ipo?.listingGainPercent ?? 0;
      return Math.round((txn.amount * gainPct) / 100);
    });

  // Sum applied from transactions (all types)
  const txnTotalApplied = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Total applied capital (sum of transaction amounts + explicit contributions)
  const myTotalApplied = Math.max(
    txnTotalApplied,
    myHoldings.reduce((sum, h) => sum + h.myContribution, 0)
  );

  // Dynamic Available Balance = Total Savings - Total Applied Capital
  const availableBalance = Math.max(0, individualSavings - myTotalApplied);

  // Total profit sum from all transactions or holdings
  const totalTxnProfit = transactionProfits.reduce((sum, p) => sum + p, 0);
  const totalHoldingsProfit = myHoldings.reduce((sum, h) => sum + h.myProfit, 0);
  const myTotalProfit = Math.max(totalTxnProfit, totalHoldingsProfit);

  const handleSaveSavings = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(savingsInput);
    if (!isNaN(val) && val >= 0) {
      updateIndividualSavings(val);
      setIsEditSavingsModalOpen(false);
      setQuickAddFeedback("");
    }
  };

  const handleQuickAddSavings = (amountToAdd: number) => {
    const currentVal = parseFloat(savingsInput) || 0;
    const newVal = currentVal + amountToAdd;
    setSavingsInput(newVal.toString());
    setQuickAddFeedback(`+ ₹${amountToAdd.toLocaleString("en-IN")} added! Click Save to apply.`);
    setTimeout(() => setQuickAddFeedback(""), 3000);
  };

  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIpo) return;
    const val = parseFloat(contributionInput);
    if (!isNaN(val) && val >= 0) {
      updateUserContribution(editingIpo.id, val);
      setEditingIpo(null);
      setContributionInput("");
    }
  };

  const handleDeleteTxn = (txnId: string, txnAmount: number, ipoName: string) => {
    deleteTransaction(txnId);
    setConfirmDeleteId(null);
    setDeleteNotification(
      `Cancelled ${ipoName} application. ₹${txnAmount.toLocaleString("en-IN")} refunded to your balance!`
    );
    setTimeout(() => setDeleteNotification(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Dynamic Refund Toast Notification */}
      {deleteNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
            <span>{deleteNotification}</span>
          </div>
          <button
            onClick={() => setDeleteNotification(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 p-1"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}



      {/* 3 Financial Metrics Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Available Balance */}
        <MetricCard
          label="Available Balance"
          value={formatINR(availableBalance)}
          subtitle={
            individualSavings > 0
              ? `₹${(availableBalance / 1000).toFixed(0)}k ready for IPOs`
              : "Set savings balance"
          }
          icon={<Wallet size={20} className="text-blue-600" />}
          action={
            <button
              onClick={() => {
                setSavingsInput(individualSavings.toString());
                setIsEditSavingsModalOpen(true);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-blue-200 cursor-pointer"
              title="Add funds or edit balance"
            >
              <Plus size={13} weight="bold" /> Add Funds
            </button>
          }
        />

        {/* Card 2: Total Applied Capital */}
        <MetricCard
          label="Total Applied Capital"
          value={myTotalApplied > 0 ? formatINR(myTotalApplied) : "₹0"}
          subtitle={`${transactions.length} active application(s)`}
          icon={<FileText size={20} className="text-amber-600" />}
        />

        {/* Card 3: Total Profit (PnL) */}
        <MetricCard
          label="Total Profit (PnL)"
          value={myTotalProfit > 0 ? formatINR(myTotalProfit, true) : "₹0"}
          subtitle="Allotted IPO listing gains"
          icon={<TrendUp size={20} className="text-emerald-600" />}
        />
      </div>

      {/* Transactions Section */}
      <Card className="border-line">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-extrabold text-ink">My IPO Transactions &amp; Deductions</h3>
            {transactions.length > 0 && (
              <span className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                {transactions.length}
              </span>
            )}
          </div>
          <span className="text-xs text-ink-secondary font-medium">All active applications — Solo &amp; Group</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-alt flex items-center justify-center">
              <Receipt size={24} className="text-ink-tertiary" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-secondary">No transactions recorded yet</p>
              <p className="text-xs text-ink-tertiary mt-1">
                Apply to any IPO (Solo or Multi-Friend Group) to see capital deductions listed here
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line text-ink-secondary uppercase text-[10px] tracking-wider font-bold bg-surface-alt">
                  <th className="py-3 px-3.5">IPO Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Participants</th>
                  <th className="py-3 px-3">Deducted Amount</th>
                  <th className="py-3 px-3">Date &amp; Time</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {transactions.map((txn, idx) => {
                  const d = new Date(txn.createdAt);
                  const dateStr = isValidDate(d)
                    ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "13 Aug 2026";
                  const timeStr = isValidDate(d)
                    ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "12:30 PM";

                  // Flatten and split participant names by comma
                  const rawList = Array.isArray(txn.participants) ? txn.participants : [];
                  const parsedParticipants = rawList
                    .flatMap((p) => (typeof p === "string" ? p.split(",") : [p]))
                    .map((p) => (typeof p === "string" ? p.trim() : ""))
                    .filter(Boolean);

                  const statusStr = (txn.status || "SUBMITTED").toUpperCase();

                  return (
                    <tr key={`${txn.id}_${idx}`} className="hover:bg-surface-alt/60 transition-colors group">
                      <td className="py-3.5 px-3.5">
                        <div className="font-extrabold text-ink text-sm group-hover:text-accent transition-colors">
                          {txn.ipoName}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {txn.type === "SOLO" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Wallet size={11} weight="bold" /> Solo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Users size={11} weight="bold" /> Group
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-ink-secondary font-medium">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {parsedParticipants.length === 0 ? (
                            <span className="text-ink-tertiary text-xs italic">Solo</span>
                          ) : (
                            parsedParticipants.map((p, pIdx) => {
                              const isPrimary = p.toLowerCase().includes("ankit");
                              return (
                                <span
                                  key={pIdx}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight shadow-2xs transition-colors ${
                                    isPrimary
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : "bg-surface-alt text-ink border border-line"
                                  }`}
                                >
                                  {p}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-ink num-tabular">
                        <div className="text-sm font-extrabold text-ink">
                          {formatINR(txn.amount)}
                        </div>
                        {txn.groupTotalPool && txn.groupTotalPool > txn.amount ? (
                          <div className="text-[10px] font-bold text-purple-600 leading-none mt-0.5">
                            {formatINR(txn.groupTotalPool)} Total Pool
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-3 text-ink-secondary">
                        <div className="font-semibold text-ink text-xs">{dateStr}</div>
                        <div className="text-[10px] font-mono text-ink-tertiary">{timeStr}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {statusStr === "ALLOTTED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <CheckCircle size={12} weight="fill" className="text-emerald-500" /> Allotted
                          </span>
                        )}
                        {statusStr === "REFUNDED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-secondary bg-surface-alt border border-line px-2.5 py-0.5 rounded-full shadow-2xs">
                            Refunded
                          </span>
                        )}
                        {(statusStr === "REJECTED" || statusStr === "NOT_ALLOTTED") && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <X size={12} weight="bold" className="text-rose-500" /> Rejected
                          </span>
                        )}
                        {statusStr !== "ALLOTTED" && statusStr !== "REFUNDED" && statusStr !== "REJECTED" && statusStr !== "NOT_ALLOTTED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <CheckCircle size={12} weight="fill" className="text-amber-500" /> Submitted
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingTxn(txn);
                              const parsedName = parsedParticipants[0] || "Ankit";
                              setEditTxnName(parsedName);
                              setEditTxnAmount(txn.amount);
                              setEditTxnPan(txn.panMasked || "XXXXXXXX41");
                            }}
                            title="Edit application & transaction details"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <PencilSimple size={12} weight="bold" />
                            Edit
                          </button>

                          {confirmDeleteId === txn.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteTxn(txn.id, txn.amount, txn.ipoName)}
                                className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs"
                              >
                                Confirm Cancel
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[11px] font-bold text-ink-secondary bg-surface-alt hover:bg-surface-hover px-2 py-1 rounded-lg transition-all cursor-pointer border border-line"
                              >
                                Back
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(txn.id)}
                              title="Cancel application"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                            >
                              <Trash size={12} weight="bold" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* EDIT / ADD SAVINGS MODAL */}
      {isEditSavingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl border border-line relative">
            <button
              onClick={() => {
                setIsEditSavingsModalOpen(false);
                setQuickAddFeedback("");
              }}
              className="absolute top-4 right-4 text-ink-tertiary hover:text-ink p-1 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800/60">
                <Wallet size={24} weight="bold" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  Edit Total Savings Pool
                </h3>
                <p className="text-xs text-ink-secondary">
                  Update your overall personal savings pool. Applied IPO capital will automatically deduct from this amount.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSavings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                  Total Personal Savings (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-extrabold text-ink-secondary">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={savingsInput}
                    onChange={(e) => setSavingsInput(e.target.value)}
                    placeholder="Enter total savings amount"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-line focus:border-accent focus:ring-2 focus:ring-accent/20 text-base font-bold text-ink outline-none transition-all"
                    required
                    min="0"
                  />
                </div>
              </div>

              {/* Quick Add Preset Buttons */}
              <div>
                <span className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-2">
                  Quick Add Funds Presets
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[10000, 25000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAddSavings(amt)}
                      className="py-1.5 px-2 bg-surface-alt hover:bg-blue-50 dark:bg-blue-950/40 border border-line hover:border-blue-200 dark:border-blue-800/60 rounded-lg text-xs font-bold text-blue-900 dark:text-blue-200 transition-all flex items-center justify-center gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <Plus size={12} weight="bold" />₹{amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {quickAddFeedback && (
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle size={14} weight="fill" />
                  {quickAddFeedback}
                </div>
              )}

              {/* Calculation Preview */}
              <div className="p-3 bg-surface-alt rounded-xl border border-line text-xs space-y-1.5 text-ink-secondary">
                <div className="flex justify-between">
                  <span>Total Applied (Capital Deployed):</span>
                  <span className="font-bold text-ink">{formatINR(myTotalApplied)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-1">
                  <span className="font-semibold text-ink">Available Funds (Remaining):</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400">
                    {formatINR(
                      Math.max(
                        0,
                        (parseFloat(savingsInput) || 0) - myTotalApplied
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditSavingsModalOpen(false);
                    setQuickAddFeedback("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Balance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSACTION MODAL (NAME, PRICE & PAN ONLY) */}
      {editingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PencilSimple size={18} className="text-blue-600" /> Edit Application Details
              </h3>
              <button
                onClick={() => setEditingTxn(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* 1. APPLICANT NAME */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  value={editTxnName}
                  onChange={(e) => setEditTxnName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:border-blue-600 focus:bg-surface outline-none"
                  placeholder="e.g. Ankit 1"
                />
              </div>

              {/* 2. PRICE / AMOUNT */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Price / Contribution Amount (₹)
                </label>
                <input
                  type="number"
                  value={editTxnAmount}
                  onChange={(e) => setEditTxnAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-extrabold focus:border-blue-600 focus:bg-surface outline-none"
                />
              </div>

              {/* 3. PAN CARD NUMBER */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  PAN Card Number
                </label>
                <input
                  type="text"
                  value={editTxnPan}
                  onChange={(e) => setEditTxnPan(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono font-bold focus:border-blue-600 focus:bg-surface outline-none tracking-wider"
                  placeholder="e.g. ABCDE1234F or XXXXXXXX41"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTxn(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingTxn && updateTransaction) {
                    updateTransaction(editingTxn.id, {
                      applicantName: editTxnName.trim(),
                      amount: Number(editTxnAmount) || 0,
                      panMasked: editTxnPan.trim(),
                    });
                    setEditingTxn(null);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT IPO CONTRIBUTION MODAL */}
      {editingIpo && (() => {
        const ipoLotVal =
          editingIpo.metrics.minInvestment ||
          editingIpo.metrics.lotSize * editingIpo.metrics.priceBand.max;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl border border-line relative">
              <button
                onClick={() => {
                  setEditingIpo(null);
                  setContributionInput("");
                }}
                className="absolute top-4 right-4 text-ink-tertiary hover:text-ink p-1 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <FileText size={24} weight="bold" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-ink">
                    Edit Contribution: {editingIpo.name}
                  </h3>
                  <p className="text-xs text-ink-secondary">
                    1 Lot minimum investment ={" "}
                    <span className="font-bold text-ink">{formatINR(ipoLotVal)}</span> (
                    {editingIpo.metrics.lotSize} shares @ ₹{editingIpo.metrics.priceBand.max})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveContribution} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                    My Individual Contribution Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-extrabold text-ink-secondary">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={contributionInput}
                      onChange={(e) => setContributionInput(e.target.value)}
                      placeholder={`Enter amount (1 Lot = ₹${ipoLotVal})`}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-line focus:border-accent focus:ring-2 focus:ring-accent/20 text-base font-bold text-ink outline-none transition-all"
                      required
                      min="0"
                    />
                  </div>
                </div>

                {/* Preset Contribution Pills */}
                <div>
                  <span className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-2">
                    Quick Lot Presets
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "₹0", val: 0 },
                      { label: "1 Lot", val: ipoLotVal },
                      { label: "2 Lots", val: ipoLotVal * 2 },
                      { label: "3 Lots", val: ipoLotVal * 3 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setContributionInput(item.val.toString())}
                        className="py-1.5 px-2 bg-surface-alt hover:bg-amber-50 dark:bg-amber-950/40 border border-line hover:border-amber-300 dark:hover:border-amber-700 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 transition-all flex flex-col items-center justify-center active:scale-95 cursor-pointer"
                      >
                        <span>{item.label}</span>
                        {item.val > 0 && (
                          <span className="text-[10px] text-ink-secondary font-semibold">
                            ₹{(item.val / 1000).toFixed(1)}k
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingIpo(null);
                      setContributionInput("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Save Contribution
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
