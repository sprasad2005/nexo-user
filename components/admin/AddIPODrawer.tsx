"use client";

import React, { useState } from "react";
import { useNexo } from "@/context/NexoContext";
import { X, Warning, ArrowLeft, ArrowRight, FloppyDisk, Plus, CalendarBlank } from "@phosphor-icons/react";

interface AddIPODrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export function AddIPODrawer({ isOpen, onClose, onSuccess }: AddIPODrawerProps) {
  const { createIPO } = useNexo();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Core Details
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Mainboard" | "SME">("Mainboard");
  const [minInvestment, setMinInvestment] = useState<number | "">(15000);
  const [issueSize, setIssueSize] = useState<number | "">(2400);
  const [gmp, setGmp] = useState<number | "">(35);
  const [description, setDescription] = useState("");
  const [recommendation, setRecommendation] = useState<"APPLY" | "WATCH" | "SKIP">("APPLY");
  const [registrarUrl, setRegistrarUrl] = useState("");

  // Step 2: Schedule Dates
  const [openDate, setOpenDate] = useState("18 Aug 2026");
  const [closeDate, setCloseDate] = useState("28 Aug 2026");
  const [allotmentDate, setAllotmentDate] = useState("01 Sep 2026");
  const [listingDate, setListingDate] = useState("04 Sep 2026");
  const [fundUnblockDate, setFundUnblockDate] = useState("02 Sep 2026");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lock background scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numMinInvestment = typeof minInvestment === "number" ? minInvestment : 0;
  const numIssueSize = typeof issueSize === "number" ? issueSize : 0;

  const isStep1Valid = name.trim().length > 0 && numMinInvestment > 0 && numIssueSize > 0;
  const isStep2Valid = closeDate.trim().length > 0;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isStep1Valid) {
      setErrorMsg("Please fill in the IPO name, minimum investment, and issue size.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isStep1Valid || !isStep2Valid) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    const res = createIPO({
      name: name.trim(),
      minInvestment: numMinInvestment,
      issueSize: numIssueSize,
      description: description.trim() || "Active group research and valuation approved for participation.",
      closeDate: closeDate.trim(),
    });

    if (res.success) {
      if (onSuccess) {
        onSuccess(res.message || `✓ IPO added successfully. ${name} is now published.`);
      }
      setName("");
      setCategory("Mainboard");
      setMinInvestment(15000);
      setIssueSize(2400);
      setDescription("");
      setCloseDate("28 Aug 2026");
      setStep(1);
      onClose();
    } else {
      setErrorMsg(res.message || "Failed to create IPO.");
    }
  };

  const handleClose = () => {
    setStep(1);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-5 sm:pt-6 pb-4 px-3 sm:px-4 md:px-6 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={handleClose} />

      {/* Centered Modal Container with Uniform Height */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-surface border border-line rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden animate-scale-in">
        {/* Step Progress Line Bar */}
        <div className="w-full h-1 bg-surface-alt shrink-0">
          <div
            className={`h-full bg-blue-600 transition-all duration-300 ${
              step === 1 ? "w-1/2" : "w-full"
            }`}
          />
        </div>

        {/* Fixed Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-line bg-surface/95 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              {step === 1 ? <Plus size={22} weight="bold" /> : <CalendarBlank size={22} weight="bold" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
                  {step === 1 ? "ADD IPO • STEP 1 OF 2" : "ADD IPO • STEP 2 OF 2"}
                </span>
                <span className="text-[11px] font-medium text-ink-muted hidden sm:inline">
                  {step === 1 ? "Basic Details" : "Timeline"}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-ink tracking-tight">
                {step === 1 ? "Add IPO Opportunity" : "Set Schedule Dates"}
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-ink-tertiary hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body - Identical Uniform Height */}
        {step === 1 ? (
          <form onSubmit={handleNextStep} className="flex-1 flex flex-col justify-between p-5 sm:p-6 text-xs overflow-y-auto">
            <div className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
                  <Warning size={18} className="shrink-0 text-rose-500" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
              )}

              {/* 1. IPO Name */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                  IPO Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Industries IPO"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-alt/70 border border-line rounded-xl px-4 py-2.5 text-xs font-bold text-ink placeholder:text-ink-muted focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>

              {/* 2. Category Selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2.5 p-1 bg-surface-alt/50 border border-line rounded-2xl">
                  {(["Mainboard", "SME"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        category === cat
                          ? "bg-surface border-blue-500/30 text-blue-500 font-black shadow-sm"
                          : "border-transparent text-ink-tertiary hover:text-ink hover:bg-surface-alt"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Min Investment & Issue Size */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Min Investment <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-ink-tertiary font-mono font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="15000"
                      value={minInvestment}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setMinInvestment(val);
                      }}
                      className="w-full bg-surface-alt/70 border border-line rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-mono font-bold text-ink focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Issue Size <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-ink-tertiary font-mono font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="2400"
                      value={issueSize}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setIssueSize(val);
                      }}
                      className="w-full bg-surface-alt/70 border border-line rounded-xl pl-8 pr-10 py-2.5 text-xs font-mono font-bold text-ink focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
                    <span className="absolute right-3.5 text-[11px] font-mono font-bold text-ink-tertiary">Cr</span>
                  </div>
                </div>
              </div>

              {/* 4. Description / Thesis */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                  Description / Thesis <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Leading manufacturer with strong domestic market share and robust financials..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-alt/70 border border-line rounded-xl p-3.5 text-xs font-medium text-ink placeholder:text-ink-muted focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* Fixed Footer within Form */}
            <div className="pt-4 mt-4 border-t border-line flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <span>Next: Schedule Dates</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between p-5 sm:p-6 text-xs overflow-y-auto">
            <div className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
                  <Warning size={18} className="shrink-0 text-rose-500" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Open Date */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Open Date
                  </label>
                  <input
                    type="text"
                    placeholder="18 Aug 2026"
                    value={openDate}
                    onChange={(e) => setOpenDate(e.target.value)}
                    className="w-full bg-surface-alt/70 border border-line rounded-xl px-4 py-2.5 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Close Date */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Close Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="28 Aug 2026"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full bg-surface-alt/70 border border-line rounded-xl px-4 py-2.5 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Allotment Date */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Allotment Date
                  </label>
                  <input
                    type="text"
                    placeholder="01 Sep 2026"
                    value={allotmentDate}
                    onChange={(e) => setAllotmentDate(e.target.value)}
                    className="w-full bg-surface-alt/70 border border-line rounded-xl px-4 py-2.5 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Listing Date */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Listing Date
                  </label>
                  <input
                    type="text"
                    placeholder="04 Sep 2026"
                    value={listingDate}
                    onChange={(e) => setListingDate(e.target.value)}
                    className="w-full bg-surface-alt/70 border border-line rounded-xl px-4 py-2.5 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Fund Unblock Date */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                  Fund Unblock Date
                </label>
                <input
                  type="text"
                  placeholder="02 Sep 2026"
                  value={fundUnblockDate}
                  onChange={(e) => setFundUnblockDate(e.target.value)}
                  className="w-full bg-surface-alt/70 border border-line rounded-xl px-4 py-2.5 text-xs font-semibold text-ink focus:bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Footer Buttons - Exactly Identical Position */}
            <div className="pt-4 mt-4 border-t border-line flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink-secondary hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft size={15} weight="bold" />
                <span>Back to Details</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20 active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <FloppyDisk size={16} weight="bold" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
