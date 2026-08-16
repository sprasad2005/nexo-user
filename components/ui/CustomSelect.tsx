"use client";

import React, { useState, useRef, useEffect } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select Option",
  className = "",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedOption = isMounted ? options.find((opt) => opt.value === value) : null;
  const isDisabled = isMounted ? Boolean(disabled) : false;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={isDisabled ? true : undefined}
        onClick={() => !isDisabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none active:scale-[0.99] ${
          isOpen
            ? "bg-slate-100 dark:bg-[#1A1D24] border-blue-500 shadow-xs ring-1 ring-blue-500/30 text-slate-900 dark:text-[#F5F7FA]"
            : "bg-white dark:bg-[#101114] border-slate-200 dark:border-[#252931] hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-[#F5F7FA] shadow-2xs"
        } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="truncate flex items-center gap-1.5 min-w-0">
          {selectedOption ? (
            <>
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[11px] font-mono text-slate-400 dark:text-[#858D99] font-normal shrink-0">
                  {selectedOption.sublabel}
                </span>
              )}
              {selectedOption.badge && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-[#17233D] text-blue-600 dark:text-[#6B93FF] shrink-0 border border-blue-200 dark:border-[#6B93FF]/30">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </span>
        <CaretDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-500" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[220px] max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-[#101114] border border-slate-200 dark:border-[#252931] shadow-2xl z-50 p-1 space-y-0.5 custom-scrollbar animate-fade-in">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-blue-50 dark:bg-[#17233D] text-blue-600 dark:text-[#6B93FF]"
                    : "text-slate-700 dark:text-[#C5C9D0] hover:bg-slate-100 dark:hover:bg-[#1A1D24] hover:text-slate-900 dark:hover:text-white"
                } ${option.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-[11px] font-mono text-slate-400 dark:text-[#858D99] font-normal shrink-0">
                      {option.sublabel}
                    </span>
                  )}
                  {option.badge && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                      {option.badge}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={14} className="shrink-0 text-blue-500 font-bold ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
