"use client";

import React, { useState, useCallback } from "react";
import { Copy, Check } from "@phosphor-icons/react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

// Token types for lightweight, zero-dependency fast syntax highlighting
type TokenType = "keyword" | "string" | "number" | "comment" | "function" | "boolean" | "operator" | "punctuation" | "plain";

interface Token {
  type: TokenType;
  value: string;
}

function highlightSyntax(code: string, language: string = ""): React.ReactNode[] {
  const lang = (language || "").toLowerCase().trim();

  // Simple token regex matching common programming patterns
  const lines = code.split("\n");
  
  return lines.map((line, lineIdx) => {
    // Basic tokenizer per line
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    // Fast regex for tokens
    const regex = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|import|from|export|default|class|interface|type|extends|implements|async|await|try|catch|finally|throw|new|typeof|instanceof|switch|case|break|continue|def|elif|lambda|pass|print|select|insert|update|delete|where|table|from|join)\b)|(\b(?:true|false|null|undefined|None|True|False)\b)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\())|([+\-*/%=&|!<>?:^~]+)|([{}()[\],;.])/g;

    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(
          <span key={`plain_${lineIdx}_${keyIdx++}`} className="text-[#E6EDF3]">
            {line.slice(lastIndex, match.index)}
          </span>
        );
      }

      const [full, comment, str, keyword, boolVal, num, func, op, punc] = match;

      if (comment) {
        tokens.push(
          <span key={`com_${lineIdx}_${keyIdx++}`} className="text-[#8B949E] italic">
            {comment}
          </span>
        );
      } else if (str) {
        tokens.push(
          <span key={`str_${lineIdx}_${keyIdx++}`} className="text-[#A5D6FF]">
            {str}
          </span>
        );
      } else if (keyword) {
        tokens.push(
          <span key={`kw_${lineIdx}_${keyIdx++}`} className="text-[#FF7B72] font-semibold">
            {keyword}
          </span>
        );
      } else if (boolVal) {
        tokens.push(
          <span key={`bool_${lineIdx}_${keyIdx++}`} className="text-[#79C0FF] font-semibold">
            {boolVal}
          </span>
        );
      } else if (num) {
        tokens.push(
          <span key={`num_${lineIdx}_${keyIdx++}`} className="text-[#79C0FF]">
            {num}
          </span>
        );
      } else if (func) {
        tokens.push(
          <span key={`fn_${lineIdx}_${keyIdx++}`} className="text-[#D2A8FF]">
            {func}
          </span>
        );
      } else if (op) {
        tokens.push(
          <span key={`op_${lineIdx}_${keyIdx++}`} className="text-[#FF7B72]">
            {op}
          </span>
        );
      } else if (punc) {
        tokens.push(
          <span key={`punc_${lineIdx}_${keyIdx++}`} className="text-[#8B949E]">
            {punc}
          </span>
        );
      } else {
        tokens.push(
          <span key={`other_${lineIdx}_${keyIdx++}`} className="text-[#E6EDF3]">
            {full}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push(
        <span key={`end_${lineIdx}_${keyIdx++}`} className="text-[#E6EDF3]">
          {line.slice(lastIndex)}
        </span>
      );
    }

    return (
      <div key={`line_${lineIdx}`} className="table-row leading-relaxed">
        <span className="table-cell pr-4 text-right select-none text-[#484F58] font-mono text-[11px] w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell font-mono text-xs whitespace-pre">
          {tokens.length > 0 ? tokens : " "}
        </span>
      </div>
    );
  });
}

export const CodeBlock = React.memo(function CodeBlock({
  code,
  language = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  const displayLang = (language || "code").toUpperCase();

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-line/80 bg-[#0D1117] text-[#E6EDF3] font-mono text-xs shadow-md">
      {/* Code Block Header */}
      <div className="px-3.5 py-1.5 bg-[#161B22] border-b border-line/60 flex items-center justify-between select-none">
        <span className="text-[10px] font-bold tracking-wider text-[#8B949E] uppercase font-mono">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-sans font-medium text-[#8B949E] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" weight="bold" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content with Line Numbers */}
      <div className="p-3 overflow-x-auto max-h-96 table font-mono text-xs">
        {highlightSyntax(code, language)}
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.code === next.code && prev.language === next.language;
});
