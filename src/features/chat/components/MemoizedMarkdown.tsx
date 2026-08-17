"use client";

import React, { useMemo } from "react";
import { CodeBlock } from "./CodeBlock";
import { MathBlock } from "./MathBlock";

interface MemoizedMarkdownProps {
  content: string;
}

// Parses inline tokens (bold, italic, strikethrough, inline code, inline math, links)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match:
  // 1. Inline Math: $...$ (not preceded or followed by $)
  // 2. Inline Code: `...`
  // 3. Bold: **...** or __...__
  // 4. Strikethrough: ~~...~~
  // 5. Italic: *...* or _..._
  // 6. Link: [label](url)
  // 7. Auto URL: https://...
  const inlineRegex = /(\$(?!\$)[^$\n]+(?<!\$)\$)|(`[^`\n]+`)|(\*\*[^*]+?\*\*|__[^_]+?__)|(~~[^~]+?~~)|(\*[^*\n]+?\*|_[^_\n]+?_)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIdx = 0;

  let match: RegExpExecArray | null;
  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const [full, math, code, bold, strike, italic, link, linkText, linkUrl, autoUrl] = match;

    if (math) {
      const mathContent = math.slice(1, -1);
      result.push(<MathBlock key={`math_${keyIdx++}`} math={mathContent} block={false} />);
    } else if (code) {
      const codeContent = code.slice(1, -1);
      result.push(
        <code
          key={`code_${keyIdx++}`}
          className="px-1.5 py-0.5 rounded-md bg-surface border border-line/60 font-mono text-[11px] text-accent font-semibold select-text"
        >
          {codeContent}
        </code>
      );
    } else if (bold) {
      const inner = bold.slice(2, -2);
      result.push(
        <strong key={`b_${keyIdx++}`} className="font-extrabold text-ink">
          {parseInlineMarkdown(inner)}
        </strong>
      );
    } else if (strike) {
      const inner = strike.slice(2, -2);
      result.push(
        <del key={`del_${keyIdx++}`} className="line-through text-ink-tertiary">
          {parseInlineMarkdown(inner)}
        </del>
      );
    } else if (italic) {
      const inner = italic.slice(1, -1);
      result.push(
        <em key={`em_${keyIdx++}`} className="italic">
          {parseInlineMarkdown(inner)}
        </em>
      );
    } else if (link && linkText && linkUrl) {
      result.push(
        <a
          key={`link_${keyIdx++}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline font-medium break-all"
        >
          {linkText}
        </a>
      );
    } else if (autoUrl) {
      result.push(
        <a
          key={`aurl_${keyIdx++}`}
          href={autoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline font-medium break-all"
        >
          {autoUrl}
        </a>
      );
    }

    lastIndex = inlineRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

// Parses block-level markdown structures
function parseMarkdownBlocks(rawText: string): React.ReactNode[] {
  if (!rawText) return [];

  // Normalize newlines
  const text = rawText.replace(/\r\n/g, "\n");
  const nodes: React.ReactNode[] = [];
  let blockKey = 0;

  // Split out fenced code blocks (```...```) and block math ($$...$$) first
  const blockRegex = /(```(\w*)\n([\s\S]*?)```)|(\$\$([\s\S]*?)\$\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    // Process text before the block
    if (match.index > lastIndex) {
      const chunk = text.slice(lastIndex, match.index);
      renderStandardMarkdownBlocks(chunk, nodes, blockKey);
      blockKey += 50;
    }

    const [full, codeBlock, codeLang, codeContent, mathBlock, mathContent] = match;

    if (codeBlock) {
      nodes.push(
        <CodeBlock
          key={`codeblock_${blockKey++}`}
          code={(codeContent || "").replace(/\n$/, "")}
          language={codeLang || ""}
        />
      );
    } else if (mathBlock) {
      nodes.push(
        <MathBlock
          key={`mathblock_${blockKey++}`}
          math={(mathContent || "").trim()}
          block={true}
        />
      );
    }

    lastIndex = blockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const trailingChunk = text.slice(lastIndex);
    renderStandardMarkdownBlocks(trailingChunk, nodes, blockKey);
  }

  return nodes;
}

function renderStandardMarkdownBlocks(
  text: string,
  nodes: React.ReactNode[],
  startKey: number
) {
  const lines = text.split("\n");
  let i = 0;
  let keyCounter = startKey;

  while (i < lines.length) {
    const line = lines[i];

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading #
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2];
      if (level === 1) {
        nodes.push(
          <h1 key={`h1_${keyCounter++}`} className="text-base font-black text-ink my-2">
            {parseInlineMarkdown(headingContent)}
          </h1>
        );
      } else if (level === 2) {
        nodes.push(
          <h2 key={`h2_${keyCounter++}`} className="text-sm font-bold text-ink my-1.5">
            {parseInlineMarkdown(headingContent)}
          </h2>
        );
      } else {
        nodes.push(
          <h3 key={`h3_${keyCounter++}`} className="text-xs font-bold text-ink my-1">
            {parseInlineMarkdown(headingContent)}
          </h3>
        );
      }
      i++;
      continue;
    }

    // Blockquote >
    if (line.startsWith("> ") || line === ">") {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      nodes.push(
        <blockquote
          key={`quote_${keyCounter++}`}
          className="border-l-2 border-accent pl-3 py-1 my-1.5 text-xs text-ink-secondary italic bg-surface-alt/40 rounded-r-lg"
        >
          {parseInlineMarkdown(quoteLines.join("\n"))}
        </blockquote>
      );
      continue;
    }

    // Table detection: line with |
    if (line.includes("|") && lines[i + 1] && /^[\s|:-]+$/.test(lines[i + 1])) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      nodes.push(renderMarkdownTable(tableLines, `tbl_${keyCounter++}`));
      continue;
    }

    // Unordered List - or *
    if (/^\s*[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={`ul_${keyCounter++}`} className="list-disc list-inside my-1.5 space-y-0.5 text-xs">
          {listItems.map((item, itemIdx) => (
            <li key={`li_${itemIdx}`} className="leading-relaxed">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List 1. 2.
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol_${keyCounter++}`} className="list-decimal list-inside my-1.5 space-y-0.5 text-xs">
          {listItems.map((item, itemIdx) => (
            <li key={`oli_${itemIdx}`} className="leading-relaxed">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard Paragraph
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("$$")
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    nodes.push(
      <p key={`p_${keyCounter++}`} className="my-0.5 leading-relaxed break-words font-sans">
        {parseInlineMarkdown(paragraphLines.join("\n"))}
      </p>
    );
  }
}

function renderMarkdownTable(lines: string[], key: string): React.ReactNode {
  if (lines.length < 2) return null;
  const headerRow = lines[0].split("|").map((c) => c.trim()).filter(Boolean);
  const dataRows = lines.slice(2).map((r) => r.split("|").map((c) => c.trim()).filter(Boolean));

  return (
    <div key={key} className="my-2 overflow-x-auto rounded-xl border border-line/80 shadow-2xs">
      <table className="min-w-full divide-y divide-line/70 text-xs font-sans">
        <thead className="bg-surface-alt/70">
          <tr>
            {headerRow.map((h, idx) => (
              <th key={`th_${idx}`} className="px-3 py-1.5 text-left font-extrabold text-ink uppercase text-[10px]">
                {parseInlineMarkdown(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40 bg-surface">
          {dataRows.map((row, rIdx) => (
            <tr key={`tr_${rIdx}`} className="hover:bg-surface-hover/50">
              {row.map((cell, cIdx) => (
                <td key={`td_${cIdx}`} className="px-3 py-1.5 text-ink whitespace-nowrap">
                  {parseInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const MemoizedMarkdown = React.memo(function MemoizedMarkdown({
  content,
}: MemoizedMarkdownProps) {
  const renderedContent = useMemo(() => {
    return parseMarkdownBlocks(content);
  }, [content]);

  return <div className="text-[13px] font-sans leading-relaxed break-words select-text">{renderedContent}</div>;
}, (prev, next) => {
  return prev.content === next.content;
});
