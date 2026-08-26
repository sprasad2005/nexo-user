import React, { useState, useEffect } from "react";
import { useNexo } from "@/context/NexoContext";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, X, Moon, Sun, SquaresFour, TrendUp, ChartPie, Users, Shield, Megaphone } from "@phosphor-icons/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { GMPBadge } from "./Badge";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpen }: CommandPaletteProps) {
  const router = useRouter();
  const { ipos, members, currentUser, setActiveTab, openIpoDetail } = useNexo();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else if (onOpen) {
          onOpen();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onOpen]);

  if (!isOpen) return null;

  const filteredIpos = ipos.filter(
    (i) =>
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      i.company.toLowerCase().includes(query.toLowerCase())
  );

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    (m.username && m.username.toLowerCase().includes(query.toLowerCase())) ||
    (m.panMasked && m.panMasked.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-overlay backdrop-blur-xs p-4 animate-fade-in font-sans">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Container Card */}
      <div className="relative z-10 w-full max-w-[580px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search input header */}
        <div className="p-3.5 sm:p-4 border-b border-line flex items-center gap-3 bg-surface-alt/60">
          <MagnifyingGlass size={18} className="text-ink-tertiary shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search IPOs, members, PAN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-body font-semibold text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <button
            onClick={onClose}
            className="sm:hidden p-1.5 text-ink-muted hover:text-ink"
          >
            <X size={18} />
          </button>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-sans font-bold rounded-md bg-surface text-ink-tertiary border border-line shadow-3xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-3 max-h-[380px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
          {/* Quick Nav Section */}
          {!query && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-caption font-semibold text-ink-tertiary uppercase tracking-wider">
                Quick Navigation
              </div>
              <button
                onClick={() => {
                  toggleTheme();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-hover text-ink font-semibold text-small transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
                </div>
                <kbd className="hidden sm:inline-block text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-surface-alt border border-line text-ink-tertiary">
                  Ctrl+Shift+D
                </kbd>
              </button>

              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-hover text-ink font-semibold text-small transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <SquaresFour size={16} />
                  <span>Go to Dashboard</span>
                </div>
                <kbd className="hidden sm:inline-block text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-surface-alt border border-line text-ink-tertiary">
                  ⌘1
                </kbd>
              </button>

              <button
                onClick={() => {
                  setActiveTab("ipos");
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-hover text-ink font-semibold text-small transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <TrendUp size={16} />
                  <span>Open IPO Workspace</span>
                </div>
                <kbd className="hidden sm:inline-block text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-surface-alt border border-line text-ink-tertiary">
                  ⌘2
                </kbd>
              </button>

              <button
                onClick={() => {
                  setActiveTab("portfolio");
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-hover text-ink font-semibold text-small transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ChartPie size={16} />
                  <span>Open Portfolio</span>
                </div>
                <kbd className="hidden sm:inline-block text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-surface-alt border border-line text-ink-tertiary">
                  ⌘3
                </kbd>
              </button>
            </div>
          )}

          {/* IPO Matches */}
          {filteredIpos.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-caption font-semibold text-ink-tertiary uppercase tracking-wider">
                IPOs ({filteredIpos.length})
              </div>
              {filteredIpos.map((ipo) => (
                <button
                  key={ipo.id}
                  onClick={() => {
                    openIpoDetail(ipo);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent font-bold text-xs flex items-center justify-center shrink-0 border border-accent/20">
                      {ipo.logo}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-small truncate">
                        {ipo.name}
                      </div>
                      <div className="text-caption text-ink-tertiary font-medium truncate">
                        {ipo.company}
                      </div>
                    </div>
                  </div>

                  <GMPBadge gmpPercent={ipo.metrics?.gmpPercent ?? 18.5} size="sm" />
                </button>
              ))}
            </div>
          )}

          {/* Member Matches */}
          {filteredMembers.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="px-3 py-1 text-caption font-semibold text-ink-tertiary uppercase tracking-wider">
                Members ({filteredMembers.length})
              </div>
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    setActiveTab("members");
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-accent/20"
                    />
                    <div>
                      <div className="font-semibold text-ink text-small">
                        {member.name}
                      </div>
                      <div className="text-caption text-ink-tertiary font-mono font-medium">
                        @{member.username || member.name.toLowerCase()} {member.panMasked && `· PAN: ${member.panMasked}`}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-accent uppercase tracking-wider bg-accent-soft px-2 py-0.5 rounded border border-accent/20">
                    {member.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
