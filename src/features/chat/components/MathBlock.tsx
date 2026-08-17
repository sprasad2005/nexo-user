"use client";

import React from "react";

interface MathBlockProps {
  math: string;
  block?: boolean;
}

// Convert common LaTeX math notation to readable Unicode/HTML representation safely
function formatMathNotation(tex: string): React.ReactNode {
  // Common math symbol replacements
  let formatted = tex
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\pm/g, "±")
    .replace(/\\mp/g, "∓")
    .replace(/\\cdot/g, "·")
    .replace(/\\approx/g, "≈")
    .replace(/\\neq/g, "≠")
    .replace(/\\le|\\leq/g, "≤")
    .replace(/\\ge|\\geq/g, "≥")
    .replace(/\\infty/g, "∞")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\theta/g, "θ")
    .replace(/\\pi/g, "π")
    .replace(/\\sigma/g, "σ")
    .replace(/\\delta/g, "δ")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\sum/g, "∑")
    .replace(/\\prod/g, "∏")
    .replace(/\\int/g, "∫")
    .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
    .replace(/\^([0-9a-zA-Z+-]+)/g, "<sup>$1</sup>")
    .replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>")
    .replace(/_([0-9a-zA-Z+-]+)/g, "<sub>$1</sub>")
    .replace(/_\{([^}]+)\}/g, "<sub>$1</sub>")
    .replace(/\\quad/g, "   ")
    .replace(/\\qquad/g, "      ")
    .replace(/\\left|\\right/g, "");

  return (
    <span
      className="font-serif italic tracking-wide select-text"
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  );
}

export const MathBlock = React.memo(function MathBlock({
  math,
  block = false,
}: MathBlockProps) {
  const cleanMath = (math || "").trim();

  if (block) {
    return (
      <div className="my-2.5 px-4 py-2.5 rounded-xl bg-surface-alt/70 border border-line/60 overflow-x-auto text-center text-sm font-serif text-ink select-text shadow-2xs">
        {formatMathNotation(cleanMath)}
      </div>
    );
  }

  return (
    <span className="px-1 py-0.5 mx-0.5 rounded bg-surface-alt/80 border border-line/40 text-xs font-serif text-ink select-text inline-flex items-center">
      {formatMathNotation(cleanMath)}
    </span>
  );
}, (prev, next) => {
  return prev.math === next.math && prev.block === next.block;
});
