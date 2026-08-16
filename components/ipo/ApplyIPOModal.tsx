"use client";

import React, { useState, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { IPOOpportunity } from "@/types/nexo";
import { formatINR, formatApplicantNames } from "@/lib/mockData";
import {
  X,
  CheckCircle,
  User,
  IdentificationCard,
  ShieldCheck,
  Crown,
  Sparkle,
  CaretRight,
  CircleNotch,
  UsersThree,
  Plus,
  Trash,
  Scales,
  Coins,
} from "@phosphor-icons/react";



interface ApplyIPOModalProps {
  ipo: IPOOpportunity;
  isOpen: boolean;
  onClose: () => void;
}

interface ContributorEntry {
  memberId: string;
  memberName: string;
  amount: number | "";
}

// Color palette for friend progress bar segments
const BAR_COLORS = [
  "bg-accent",
  "bg-positive-soft0",
  "bg-caution-soft0",
  "bg-indigo-600",
  "bg-negative-soft0",
  "bg-violet-600",
];

export function ApplyIPOModal({ ipo, isOpen, onClose }: ApplyIPOModalProps) {
  const { ipos, members, currentUser, createApplication, openPremiumModal, isPremiumUser } = useNexo();

  const [applicantMode, setApplicantMode] = useState<"SOLO" | "JOINT">("SOLO");
  const [applicantName, setApplicantName] = useState<string>("");

  const [numberOfIpos, setNumberOfIpos] = useState<number | "">(1);
  const effectiveIpos = Math.max(1, typeof numberOfIpos === "number" ? numberOfIpos : 1);
  const minInvest = ipo.metrics?.minInvestment || 14964;
  const targetRequiredCapital = minInvest * effectiveIpos;

  const activeUserName = currentUser?.name || members[0]?.name || "Member";

  // Dynamic Contributors State
  const [contributors, setContributors] = useState<ContributorEntry[]>([
    { memberId: currentUser?.id || members[0]?.id || "mem_1", memberName: activeUserName, amount: Math.floor(targetRequiredCapital / 2) },
    { memberId: members[1]?.id || "mem_2", memberName: members[1]?.name || "Partner", amount: targetRequiredCapital - Math.floor(targetRequiredCapital / 2) },
  ]);

  const [panNumbers, setPanNumbers] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set of existing PAN card numbers for the current IPO application list
  const existingIpoPans = React.useMemo(() => {
    const set = new Set<string>();
    const targetIpo = ipos.find((i) => i.id === ipo.id) || ipo;
    if (targetIpo?.applications) {
      targetIpo.applications.forEach((app) => {
        if (app.panMasked) set.add(app.panMasked.trim().toUpperCase());
        if (Array.isArray(app.panNumbers)) {
          app.panNumbers.forEach((p) => {
            if (p) set.add(p.trim().toUpperCase());
          });
        }
        if (Array.isArray(app.participants)) {
          app.participants.forEach((p) => {
            if (p.panMasked) set.add(p.panMasked.trim().toUpperCase());
            if (p.panFull) set.add(p.panFull.trim().toUpperCase());
          });
        }
      });
    }
    return set;
  }, [ipos, ipo]);

  // Clear error msg & sync user name when modal status changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setApplicantName(currentUser?.name || members[0]?.name || "Member");
    }
  }, [isOpen, currentUser, members]);

  // Synchronize array length: 1 PAN per IPO
  useEffect(() => {
    setPanNumbers((prev) => {
      const updated = [...prev];
      if (effectiveIpos > updated.length) {
        while (updated.length < effectiveIpos) {
          updated.push("");
        }
      } else if (effectiveIpos < updated.length) {
        return updated.slice(0, effectiveIpos);
      }
      return updated;
    });
  }, [effectiveIpos]);

  // Auto-fetch friend names into Primary Applicant Name when in Multi-Friend mode
  useEffect(() => {
    if (applicantMode === "JOINT") {
      const validNames = contributors
        .map((c) => c.memberName?.trim())
        .filter(Boolean);
      if (validNames.length > 0) {
        setApplicantName(formatApplicantNames(validNames));
      }
    } else {
      if (!applicantName || applicantName.includes(",") || applicantName.includes(" and ") || applicantName.includes(" & ")) {
        const rawUname = currentUser?.username || currentUser?.name || members[0]?.username || members[0]?.name || "Member";
        const formatted = rawUname.trim().startsWith("@") ? rawUname.trim() : `@${rawUname.trim()}`;
        setApplicantName(formatted);
      }
    }
  }, [applicantMode, contributors, members, currentUser]);

  const handleEqualSplit = () => {
    const count = contributors.length || 1;
    const equalShare = Math.floor(targetRequiredCapital / count);
    const remainder = targetRequiredCapital - equalShare * count;

    setContributors((prev) =>
      prev.map((c, idx) => ({
        ...c,
        amount: idx === 0 ? equalShare + remainder : equalShare,
      }))
    );
  };

  // Sync initial equal split when target capital changes
  useEffect(() => {
    handleEqualSplit();
  }, [targetRequiredCapital]);

  if (!isOpen) return null;

  const totalPooledCapital = contributors.reduce(
    (sum, c) => sum + (typeof c.amount === "number" ? c.amount : 0),
    0
  );

  const handleAddContributor = () => {
    const remainingNeeded = Math.max(0, targetRequiredCapital - totalPooledCapital);
    const nextIdx = contributors.length + 1;
    const defaultFriendName = members[contributors.length]?.name || `Friend #${nextIdx}`;

    setContributors((prev) => [
      ...prev,
      {
        memberId: `mem_custom_${Date.now()}`,
        memberName: defaultFriendName,
        amount: remainingNeeded > 0 ? remainingNeeded : 0,
      },
    ]);
  };

  const handleRemoveContributor = (index: number) => {
    if (contributors.length > 1) {
      setContributors((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleContributorNameChange = (index: number, name: string) => {
    setContributors((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], memberName: name };
      return updated;
    });
  };

  const handleContributorAmountChange = (index: number, valStr: string) => {
    setContributors((prev) => {
      const updated = [...prev];
      let parsed: number | "" = "";
      if (valStr !== "") {
        const num = parseInt(valStr, 10);
        parsed = isNaN(num) ? "" : Math.max(0, num);
      }

      updated[index] = { ...updated[index], amount: parsed };

      // Smart Auto-Balancing: Auto-fetch remaining amount into next/other box
      const count = updated.length;
      if (count >= 2) {
        const targetAdjustIdx = index < count - 1 ? index + 1 : count - 2;

        const sumOthers = updated.reduce((sum, c, idx) => {
          if (idx === targetAdjustIdx) return sum;
          return sum + (typeof c.amount === "number" ? c.amount : 0);
        }, 0);

        const remainingNeeded = Math.max(0, targetRequiredCapital - sumOthers);
        updated[targetAdjustIdx] = { ...updated[targetAdjustIdx], amount: remainingNeeded };
      }

      return updated;
    });
  };

  const handlePanChange = (index: number, value: string) => {
    setErrorMsg(null);
    const updated = [...panNumbers];
    updated[index] = value.toUpperCase().slice(0, 10);
    setPanNumbers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate PAN card numbers (must be exactly 10 characters matching standard regex format)
    const anyInvalid = panNumbers.some((pan) => !isValidPan(pan));
    if (anyInvalid) {
      setErrorMsg("Please enter a valid 10-character PAN card number for all entries.");
      return;
    }

    // 1. Intra-form duplicate check
    const normalizedPanList = panNumbers.map((p) => p.trim().toUpperCase());
    const seenPans = new Set<string>();
    for (const pan of normalizedPanList) {
      if (seenPans.has(pan)) {
        setErrorMsg(`Duplicate PAN card number "${pan}" found in form entries. Each PAN card entry must be unique.`);
        return;
      }
      seenPans.add(pan);
    }

    // 2. Current IPO Application List uniqueness check
    for (const pan of normalizedPanList) {
      if (existingIpoPans.has(pan)) {
        setErrorMsg(`PAN card "${pan}" has already been used in an application for ${ipo.name}. Each PAN card can only apply once per IPO.`);
        return;
      }
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const primaryMember =
        members.find((m) => m.name.toLowerCase() === applicantName.trim().toLowerCase()) ||
        members[0];

      let participantContributions;

      if (applicantMode === "JOINT") {
        participantContributions = contributors.map((c) => ({
          memberId: c.memberId,
          memberName: c.memberName.trim() || "Friend",
          contribution: typeof c.amount === "number" ? c.amount : 0,
        }));
      } else {
        participantContributions = Array.from({ length: effectiveIpos }).map(() => ({
          memberId: primaryMember.id,
          memberName: primaryMember.name,
          contribution: minInvest,
        }));
      }

      createApplication(
        ipo.id,
        applicantMode === "JOINT" ? "COMBO" : effectiveIpos > 1 ? "COMBO" : "SOLO",
        participantContributions,
        undefined,
        primaryMember.id,
        applicantName,
        panNumbers
      );

      setIsSubmitting(false);
      onClose();
    }, 1200);
  };

  const isValidPan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="w-full max-w-[560px] bg-surface border border-line/90 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between max-h-[92vh] transition-all">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-accent/30 text-accent flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
              {ipo.logo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink tracking-tight">
                  Apply for {ipo.name}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold text-positive bg-positive-soft border border-emerald-200/60 rounded-full">
                  Open
                </span>
              </div>
              <p className="text-xs text-ink-tertiary font-medium">
                Official IPO Application Form
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-ink-muted hover:text-ink-secondary hover:bg-surface-alt flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-90px)]">
            {errorMsg && (
              <div className="p-3.5 bg-negative-soft border border-negative/30 text-negative rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-modal-pop-in">
                <svg className="w-4 h-4 text-negative shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}
            {/* VIP Premium Boost Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-caution/30 text-white flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-caution-soft0/20 text-amber-400 border border-caution/30 flex items-center justify-center shrink-0">
                  <Crown size={20} weight="fill" />
                </div>
                <div>
                  <span className="font-bold text-amber-300 block text-xs flex items-center gap-1">
                    <Sparkle size={13} weight="fill" className="text-amber-400 animate-pulse" /> Nexo Pro VIP Allotment Boost
                  </span>
                  <span className="text-[11px] text-ink-muted font-medium">
                    {isPremiumUser ? "4.8x Allotment Multiplier Active" : "Boost allotment probability from 18% → 88%"}
                  </span>
                </div>
              </div>

              {!isPremiumUser && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openPremiumModal(ipo);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-[11px] hover:from-amber-300 hover:to-amber-400 transition-all shadow-md cursor-pointer whitespace-nowrap flex items-center gap-1 active:scale-95"
                >
                  Upgrade <CaretRight size={12} weight="bold" />
                </button>
              )}
            </div>

            {/* CAPITAL FUNDING STRUCTURE SWITCHER */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                Capital Funding Structure
              </label>
              <div className="grid grid-cols-2 gap-2 bg-surface-alt/80 p-1 rounded-2xl border border-line/80">
                <button
                  type="button"
                  onClick={() => setApplicantMode("SOLO")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    applicantMode === "SOLO"
                      ? "bg-surface text-ink shadow-xs border border-line/80"
                      : "text-ink-secondary hover:text-ink"
                  }`}
                >
                  <User size={15} className={applicantMode === "SOLO" ? "text-accent" : ""} />
                  <span>Solo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApplicantMode("JOINT")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    applicantMode === "JOINT"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-secondary hover:text-ink"
                  }`}
                >
                  <UsersThree size={16} />
                  <span>Multi-Friend</span>
                </button>
              </div>
            </div>

            {/* 1. Primary Applicant Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink flex items-center gap-1.5">
                <User size={15} className="text-accent" /> Primary Applicant Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter applicant name"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full bg-surface-alt/80 border border-line hover:border-line-strong rounded-xl px-4 py-2.5 text-sm font-semibold text-ink tracking-tight focus:bg-surface focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none transition-all placeholder:text-ink-muted"
              />
            </div>

            {/* FRIEND NAME | AMOUNT TABLE WITH VISUAL PROGRESS BAR & SUM MATCHING */}
            {applicantMode === "JOINT" && (
              <div className="p-4 rounded-2xl bg-accent-soft/70 border border-accent/30 space-y-3.5 animate-fade-in shadow-2xs">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Coins size={16} className="text-accent" /> Capital Allocation Pool
                  </span>
                </div>

                {/* Table Header: FRIEND NAME | AMOUNT (₹) */}
                <div className="grid grid-cols-12 gap-2 px-3 text-[11px] font-extrabold text-ink-tertiary uppercase tracking-wider">
                  <div className="col-span-6">Friend Name</div>
                  <div className="col-span-5 text-right">Amount (₹)</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Dynamic Clean Input Rows */}
                <div className="space-y-2">
                  {contributors.map((c, idx) => {
                    const numAmt = typeof c.amount === "number" ? c.amount : 0;
                    const pctStr =
                      totalPooledCapital > 0
                        ? ((numAmt / totalPooledCapital) * 100).toFixed(1) + "%"
                        : "0%";

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-surface border border-line rounded-xl shadow-2xs hover:border-line-strong transition-all"
                      >
                        {/* # Badge */}
                        <span
                          className={`w-5 h-5 rounded-full ${
                            BAR_COLORS[idx % BAR_COLORS.length]
                          } text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          #{idx + 1}
                        </span>

                        {/* Clean Friend Name Input */}
                        <input
                          type="text"
                          required
                          placeholder={`Friend #${idx + 1} Name`}
                          value={c.memberName}
                          onChange={(e) => handleContributorNameChange(idx, e.target.value)}
                          className="flex-1 min-w-0 bg-surface-alt/80 border border-line focus:bg-surface focus:border-accent rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink outline-none transition-all placeholder:text-ink-muted placeholder:font-normal"
                        />

                        {/* Clean Custom Amount Input */}
                        <div className="flex items-center gap-1 w-28 shrink-0">
                          <span className="text-xs font-bold text-ink-muted">₹</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={c.amount}
                            onChange={(e) => handleContributorAmountChange(idx, e.target.value)}
                            className="w-full bg-surface-alt/80 border border-line focus:bg-surface focus:border-accent rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-ink text-right outline-none transition-all"
                          />
                        </div>

                        {/* Investment Percentage Badge */}
                        <span className="text-[11px] font-mono font-bold text-accent bg-accent-soft px-2 py-1 rounded-md border border-blue-100/80 shrink-0 w-14 text-center">
                          {pctStr}
                        </span>

                        {/* Delete Button */}
                        <div className="w-5 shrink-0 flex justify-end">
                          {contributors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveContributor(idx)}
                              className="p-1 rounded text-ink-muted hover:text-negative hover:bg-negative-soft transition-colors cursor-pointer"
                              title="Remove Friend"
                            >
                              <Trash size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* VISUAL MULTI-COLOR CAPITAL SHARE PROGRESS BAR */}
                {totalPooledCapital > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="h-2 w-full bg-surface-alt rounded-full overflow-hidden flex border border-line/60 shadow-inner">
                      {contributors.map((c, idx) => {
                        const amt = typeof c.amount === "number" ? c.amount : 0;
                        const pct = Math.min(100, Math.max(0, (amt / totalPooledCapital) * 100));
                        if (pct === 0) return null;
                        return (
                          <div
                            key={idx}
                            style={{ width: `${pct}%` }}
                            className={`${BAR_COLORS[idx % BAR_COLORS.length]} transition-all duration-300 h-full`}
                            title={`${c.memberName}: ${formatINR(amt)} (${pct.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer: Add Friend Button + Target Sum Validation */}
                <div className="flex items-center justify-between pt-2 border-t border-blue-200/60">
                  <button
                    type="button"
                    onClick={handleAddContributor}
                    className="px-3.5 py-1.5 rounded-xl bg-surface border border-blue-300 text-accent hover:bg-blue-100 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus size={14} weight="bold" /> Add Friend
                  </button>

                  <div className="text-right text-xs">
                    <div className="font-mono font-bold text-ink">
                      Total:{" "}
                      <span
                        className={
                          totalPooledCapital === targetRequiredCapital
                            ? "text-positive"
                            : "text-caution"
                        }
                      >
                        {formatINR(totalPooledCapital)}
                      </span>{" "}
                      / {formatINR(targetRequiredCapital)}
                    </div>
                    {totalPooledCapital === targetRequiredCapital ? (
                      <span className="text-[10px] font-semibold text-positive flex items-center justify-end gap-1">
                        <CheckCircle size={12} weight="fill" /> Matches Required Capital
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-caution">
                        {totalPooledCapital < targetRequiredCapital
                          ? `Need ${formatINR(targetRequiredCapital - totalPooledCapital)} more`
                          : `Exceeds by ${formatINR(totalPooledCapital - targetRequiredCapital)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Number of PAN Cards */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-ink flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-accent" /> Number of PAN Cards <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-ink-tertiary font-mono">
                  1 PAN per Application
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={numberOfIpos}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  setNumberOfIpos(isNaN(parsed) ? 1 : Math.max(1, Math.min(50, parsed)));
                }}
                className="w-full bg-surface-alt/80 border border-line hover:border-line-strong rounded-xl px-4 py-2.5 text-sm font-semibold text-ink tracking-tight focus:bg-surface focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none transition-all placeholder:text-ink-muted"
                placeholder="Enter number of PAN cards (e.g. 5)"
              />
            </div>

            {/* 3. Dynamic PAN Cards Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-ink flex items-center gap-1.5">
                  <IdentificationCard size={15} className="text-accent" /> PAN Card Numbers ({panNumbers.length} Required) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-ink-muted font-medium">
                  Auto-formatted Uppercase
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {panNumbers.map((pan, idx) => {
                  const valid = isValidPan(pan);
                  const norm = pan.trim().toUpperCase();
                  const isFormDuplicate = norm.length === 10 && panNumbers.filter((p) => p.trim().toUpperCase() === norm).length > 1;
                  const isIpoDuplicate = norm.length === 10 && existingIpoPans.has(norm);
                  const hasDuplicateError = isFormDuplicate || isIpoDuplicate;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 p-2 rounded-2xl transition-all ${
                        hasDuplicateError
                          ? "bg-rose-500/10 border border-rose-500/50"
                          : "bg-surface-alt/80 border border-line/80 hover:border-line-strong"
                      }`}
                    >
                      <span className="text-[11px] font-bold text-ink-tertiary w-16 shrink-0 font-mono text-center bg-surface py-1.5 px-2 rounded-xl border border-line shadow-2xs">
                        PAN #{idx + 1}
                      </span>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          required
                          maxLength={10}
                          autoCapitalize="characters"
                          autoCorrect="off"
                          spellCheck={false}
                          autoComplete="off"
                          placeholder={`e.g. ABCDE274${(idx % 9) + 1}D`}
                          value={pan}
                          onChange={(e) => handlePanChange(idx, e.target.value)}
                          className={`w-full bg-surface border rounded-xl px-3.5 py-2 text-xs font-mono font-bold tracking-widest uppercase focus:outline-none transition-all placeholder:font-sans placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-muted ${
                            hasDuplicateError
                              ? "border-rose-500 text-rose-600 focus:ring-2 focus:ring-rose-500/20"
                              : "border-line hover:border-line-strong text-ink focus:border-accent focus:ring-3 focus:ring-accent/10"
                          }`}
                        />
                        {valid && !hasDuplicateError && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-positive animate-fade-in">
                            <CheckCircle size={16} weight="fill" />
                          </div>
                        )}
                      </div>
                      {hasDuplicateError && (
                        <span className="text-[10px] font-bold text-rose-500 shrink-0 bg-rose-100 dark:bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800/40">
                          {isIpoDuplicate ? "Already Applied" : "Duplicate in Form"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-ink-secondary hover:bg-surface-alt hover:text-ink transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 hover:from-slate-800 hover:to-blue-800 disabled:opacity-75 text-white font-bold text-xs shadow-lg shadow-blue-950/20 flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch size={18} className="animate-spin" /> Filing Application...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} weight="bold" /> Submit {applicantMode === "JOINT" ? `${contributors.length} Friends Split` : ""} {effectiveIpos} IPO Application(s)
                  </>
                )}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
