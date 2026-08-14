"use client";

import React, { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}

export function CopyButton({ text, label, className = "", iconOnly = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (iconOnly) {
    return (
      <button
        onClick={handleCopy}
        title={copied ? "Copied!" : `Copy ${text}`}
        className={`p-1.5 rounded-lg border transition-all cursor-pointer active:scale-90 ${
          copied
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
            : "bg-surface-alt/80 border-line hover:bg-surface-hover text-ink-tertiary hover:text-ink"
        } ${className}`}
      >
        {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${text}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer active:scale-95 ${
        copied
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
          : "bg-surface-alt/80 border-line hover:bg-surface-hover text-ink-secondary hover:text-ink"
      } ${className}`}
    >
      {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
      <span>{copied ? "Copied!" : label || "Copy"}</span>
    </button>
  );
}
