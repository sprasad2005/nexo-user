"use client";

import React, { useState } from "react";
import { useAdmin } from "../context/AdminContext";
import { X, Warning, CalendarCheck, Plus, ArrowRight, ArrowLeft } from "@phosphor-icons/react";

interface AddIPODrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export function AddIPODrawer({ isOpen, onClose, onSuccess }: AddIPODrawerProps) {
  const { createIPO } = useAdmin();

  // Step State: 1 = Basic Details Page, 2 = Dates Page
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [name, setName] = useState("");
  const [minInvestment, setMinInvestment] = useState<number | "">(15000);
  const [issueSize, setIssueSize] = useState<number | "">(2400);
  const [gmpPercent, setGmpPercent] = useState<number | "">(18.5);
  const [description, setDescription] = useState("");
  
  // Date Fields
  const [openDate, setOpenDate] = useState("18 Aug 2026");
  const [closeDate, setCloseDate] = useState("28 Aug 2026");
  const [allotmentDate, setAllotmentDate] = useState("01 Sep 2026");
  const [listingDate, setListingDate] = useState("04 Sep 2026");
  const [fundUnblockDate, setFundUnblockDate] = useState("02 Sep 2026");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numMinInvestment = typeof minInvestment === "number" ? minInvestment : 0;
  const numIssueSize = typeof issueSize === "number" ? issueSize : 0;
  const numGmpPercent = typeof gmpPercent === "number" ? gmpPercent : 0;

  // Step 1 Validation
  const isNameValid = name.trim().length > 0;
  const isMinInvValid = numMinInvestment > 0;
  const isIssueSizeValid = numIssueSize > 0;
  const isDescriptionValid = description.trim().length > 0;
  const isStep1Valid = isNameValid && isMinInvValid && isIssueSizeValid && isDescriptionValid;

  // Step 2 Validation
  const isOpenDateValid = openDate.trim().length > 0;
  const isCloseDateValid = closeDate.trim().length > 0;
  const isAllotmentDateValid = allotmentDate.trim().length > 0;
  const isListingDateValid = listingDate.trim().length > 0;
  const isFundUnblockDateValid = fundUnblockDate.trim().length > 0;
  const isStep2Valid =
    isOpenDateValid &&
    isCloseDateValid &&
    isAllotmentDateValid &&
    isListingDateValid &&
    isFundUnblockDateValid;

  const handleNextToDates = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isStep1Valid) {
      setErrorMsg("Please fill in all required basic fields before proceeding.");
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isStep1Valid || !isStep2Valid) {
      setErrorMsg("Please complete all required fields and valid dates.");
      return;
    }

    const res = await createIPO({
      name: name.trim(),
      minInvestment: numMinInvestment,
      issueSize: numIssueSize,
      gmpPercent: numGmpPercent,
      description: description.trim(),
      openDate: openDate.trim(),
      closeDate: closeDate.trim(),
      allotmentDate: allotmentDate.trim(),
      listingDate: listingDate.trim(),
      fundUnblockDate: fundUnblockDate.trim(),
    });

    if (res.success) {
      if (onSuccess) {
        onSuccess(res.message || `✓ IPO added successfully. ${name} is now visible on the user website.`);
      }
      // Reset form & step
      setName("");
      setMinInvestment(15000);
      setIssueSize(2400);
      setGmpPercent(18.5);
      setDescription("");
      setOpenDate("18 Aug 2026");
      setCloseDate("28 Aug 2026");
      setAllotmentDate("01 Sep 2026");
      setListingDate("04 Sep 2026");
      setFundUnblockDate("02 Sep 2026");
      setStep(1);
      onClose();
    } else {
      setErrorMsg(res.message || "Failed to create IPO.");
    }
  };

  const handleModalClose = () => {
    setStep(1);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-5 sm:pt-6 pb-4 px-3 sm:px-4 md:px-6 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in font-sans">
      {/* Centered Modal Card with Large Font & Spacious Padding */}
      <div className="w-full max-w-2xl bg-white dark:bg-[#14161A] border border-slate-200 dark:border-[#343943] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between max-h-[92vh] text-slate-900 dark:text-[#F5F7FA]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-[#252931] bg-slate-50/80 dark:bg-[#101114] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 dark:bg-[#6B93FF] text-white dark:text-[#101114] flex items-center justify-center font-black text-lg shadow-md shrink-0">
              <Plus size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-[#17233D] text-blue-600 dark:text-[#6B93FF] border border-blue-200 dark:border-[#6B93FF]/30 font-mono">
                  {step === 1 ? "STEP 1 OF 2 • BASIC INFO" : "STEP 2 OF 2 • SCHEDULE DATES"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-[#F5F7FA] tracking-tight">
                {step === 1 ? "Add New IPO" : "Add IPO Schedule Dates"}
              </h2>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-2 rounded-xl text-slate-400 dark:text-[#858D99] hover:text-slate-700 dark:hover:text-[#F5F7FA] hover:bg-slate-200/60 dark:hover:bg-[#1D2026] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 p-6 sm:p-7 overflow-y-auto space-y-5 text-sm font-semibold text-slate-900 dark:text-[#F5F7FA]">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fade-in">
              <Warning size={18} className="shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PAGE 1: BASIC IPO DETAILS */}
          {step === 1 && (
            <form onSubmit={handleNextToDates} className="space-y-5 animate-fade-in">
              {/* 1. IPO Name & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-sm mb-1.5">
                    IPO Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC Industries IPO"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder-slate-600 placeholder:font-medium shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-sm mb-1.5">
                    Category
                  </label>
                  <div className="w-full bg-slate-100 dark:bg-[#101114]/30 border border-slate-200 dark:border-[#252931]/60 rounded-xl px-4 py-3 text-sm font-black text-slate-800 dark:text-slate-200 flex items-center justify-between shadow-2xs">
                    <span>MAINBOARD</span>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-[#6B93FF] px-2 py-0.5 rounded font-mono border border-blue-200 dark:border-blue-800/30 font-bold">
                      Fixed
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Minimum Investment, Issue Size & GMP Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-sm mb-1.5">
                    Minimum Investment <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 dark:text-slate-500 font-mono font-bold text-base">₹</span>
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
                      className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl pl-9 pr-4 py-3 text-sm font-mono font-extrabold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-sm mb-1.5">
                    Issue Size <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 dark:text-slate-500 font-mono font-bold text-base">₹</span>
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
                      className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl pl-9 pr-11 py-3 text-sm font-mono font-extrabold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none transition-all shadow-xs"
                    />
                    <span className="absolute right-4 text-sm font-mono font-bold text-slate-500">Cr</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-sm mb-1.5">
                    GMP Premium (%)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="18.5"
                      value={gmpPercent}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setGmpPercent(val);
                      }}
                      className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl pl-4 pr-10 py-3 text-sm font-mono font-extrabold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none transition-all shadow-xs"
                    />
                    <span className="absolute right-4 text-sm font-mono font-extrabold text-emerald-600">%</span>
                  </div>
                </div>
              </div>

              {/* 3. Description / Group Decision */}
              <div>
                <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-sm mb-1.5">
                  Description / Group Decision <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Leading automotive component manufacturer with strong domestic and export presence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl p-4 text-sm font-medium text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none transition-all leading-relaxed placeholder:text-slate-400 dark:placeholder-slate-600 shadow-xs"
                />
              </div>
            </form>
          )}

          {/* PAGE 2: SCHEDULE & DATES PAGE */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="space-y-5 animate-fade-in">
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl flex items-center gap-3 text-blue-900 dark:text-[#6B93FF]">
                <CalendarCheck size={22} className="text-blue-600 dark:text-[#6B93FF] shrink-0" />
                <div>
                  <h4 className="text-sm font-extrabold">Schedule Dates Page</h4>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    Set key lifecycle dates for <strong className="font-extrabold text-blue-900 dark:text-[#6B93FF]">{name || "this IPO"}</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-xs sm:text-sm mb-1.5">
                    Open Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 18 Aug 2026"
                    value={openDate}
                    onChange={(e) => setOpenDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-xs sm:text-sm mb-1.5">
                    Close Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 28 Aug 2026"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-xs sm:text-sm mb-1.5">
                    Allotment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01 Sep 2026"
                    value={allotmentDate}
                    onChange={(e) => setAllotmentDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-xs sm:text-sm mb-1.5">
                    Listing Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 04 Sep 2026"
                    value={listingDate}
                    onChange={(e) => setListingDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none shadow-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-900 dark:text-slate-300 font-extrabold text-xs sm:text-sm mb-1.5">
                    Fund Unblock Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 02 Sep 2026"
                    value={fundUnblockDate}
                    onChange={(e) => setFundUnblockDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#101114] border border-slate-300 dark:border-[#252931] rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-[#F5F7FA] focus:bg-white dark:focus:bg-[#101114] focus:border-blue-600 dark:focus:border-[#6B93FF] focus:outline-none shadow-xs"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-[#252931] bg-slate-50/80 dark:bg-[#101114] flex items-center justify-between gap-4">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={handleModalClose}
                className="px-5 py-3 rounded-xl border border-slate-300 dark:border-[#252931] text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNextToDates}
                disabled={!isStep1Valid}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-md ${
                  isStep1Valid
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                    : "bg-slate-200 dark:bg-[#252931] text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                }`}
              >
                <span>Add Dates</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-[#252931] text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} weight="bold" />
                <span>Back to Details</span>
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!isStep2Valid}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-md ${
                  isStep2Valid
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                    : "bg-slate-200 dark:bg-[#252931] text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                }`}
              >
                <Plus size={16} weight="bold" />
                <span>Add IPO</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
