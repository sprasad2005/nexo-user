"use client";

import React, { useState, useRef, useEffect } from "react";
import { Member } from "@/types/nexo";
import { MagnifyingGlass, Check, CaretDown } from "@phosphor-icons/react";

interface SearchableUserSelectProps {
  members: Member[];
  selectedMemberId?: string;
  selectedUsername?: string;
  onSelect: (member: Member) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableUserSelect({
  members,
  selectedMemberId,
  selectedUsername,
  onSelect,
  placeholder = "Search username or name...",
  className = "",
}: SearchableUserSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently active selected member
  const currentSelected =
    members.find(
      (m) =>
        (selectedMemberId && m.id === selectedMemberId) ||
        (selectedUsername &&
          (m.username === selectedUsername ||
            m.name === selectedUsername ||
            `@${m.username}` === selectedUsername))
    ) || members[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMembers = members.filter((m) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const uName = (m.username || "").toLowerCase();
    const fName = (m.name || "").toLowerCase();
    return uName.includes(q) || fName.includes(q) || `@${uName}`.includes(q);
  });

  const displayVal = currentSelected
    ? `@${(currentSelected.username || currentSelected.name).toLowerCase().replace(/^@+/, "")} (${currentSelected.name})`
    : "Select member...";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selector Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 dark:bg-[#14161A] border border-slate-200 dark:border-[#252931] hover:border-slate-300 dark:hover:border-[#333742] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-[#F5F7FA] flex items-center justify-between cursor-pointer select-none transition-all shadow-2xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          {currentSelected && (
            <img
              src={currentSelected.avatar || "/oggy.png"}
              alt={currentSelected.name}
              className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
            />
          )}
          <span className="truncate">{displayVal}</span>
        </div>
        <CaretDown size={14} className="text-slate-400 dark:text-[#858D99] shrink-0 ml-1.5" />
      </div>

      {/* Floating Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-[#121418] border border-slate-200 dark:border-[#252931] rounded-2xl shadow-2xl overflow-hidden p-2 animate-in fade-in zoom-in-95 font-sans">
          {/* Real-time Filter Search Input */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#181B22] border border-slate-200 dark:border-[#252931] rounded-xl mb-2">
            <MagnifyingGlass size={15} className="text-blue-500 dark:text-[#6B93FF] shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Members List */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => {
                const isSelected = currentSelected?.id === m.id;
                const uName = (m.username || m.name).toLowerCase().replace(/^@+/, "");
                return (
                  <div
                    key={m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(m);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50 dark:bg-[#4F75FF]/20 text-blue-600 dark:text-[#6B93FF] font-bold border border-blue-200 dark:border-[#4F75FF]/30"
                        : "hover:bg-slate-100 dark:hover:bg-[#1B1F2A] text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.avatar || "/oggy.png"}
                        alt={m.name}
                        className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
                      />
                      <div className="min-w-0">
                        <span className="font-mono font-bold block truncate">@{uName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal block truncate">{m.name}</span>
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-blue-600 dark:text-[#6B93FF] shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 font-medium">
                No matching member found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
