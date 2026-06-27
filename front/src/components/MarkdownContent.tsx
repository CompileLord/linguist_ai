import React from "react";

// ---------- inline renderer ----------
function renderInline(text: string, baseKey: string): React.ReactNode[] {
  // Process bold, italic, inline code, and plain text in a single pass
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${baseKey}-${match.index}`;
    if (match[2]) {
      nodes.push(<strong key={key} className="font-bold text-on-surface">{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(<em key={key} className="italic text-on-surface-variant">{match[3]}</em>);
    } else if (match[4]) {
      nodes.push(
        <code key={key} className="font-mono text-[13px] bg-primary/10 text-primary px-1.5 py-0.5 rounded mx-0.5">
          {match[4]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

// ---------- block parser ----------
type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "ordered"; items: string[] }
  | { kind: "blockquote"; text: string }
  | { kind: "hr" }
  | { kind: "code"; lang: string; text: string }
  | { kind: "table"; headers: string[]; align: string[]; rows: string[][] };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") { i++; continue; }

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // closing ```
      blocks.push({ kind: "code", lang, text: codeLines.join("\n") });
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // ATX Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ kind: "heading", level: headingMatch[1].length, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i].startsWith(">"))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Table: line starts with | and next non-empty line is a separator
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2 && /^\|[-| :]+\|/.test(tableLines[1])) {
        const parseRow = (row: string) =>
          row.split("|").slice(1, -1).map((c) => c.trim());

        const headers = parseRow(tableLines[0]);
        const alignRow = parseRow(tableLines[1]);
        const align = alignRow.map((c) => {
          if (c.startsWith(":") && c.endsWith(":")) return "center";
          if (c.endsWith(":")) return "right";
          return "left";
        });
        const rows = tableLines.slice(2).map(parseRow);
        blocks.push({ kind: "table", headers, align, rows });
      } else {
        // Not a valid table, treat as paragraphs
        tableLines.forEach((l) => blocks.push({ kind: "paragraph", text: l }));
      }
      continue;
    }

    // Unordered list
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+] /, "").trim());
        i++;
      }
      blocks.push({ kind: "bullet", items });
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, "").trim());
        i++;
      }
      blocks.push({ kind: "ordered", items });
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("|") &&
      !lines[i].startsWith("```") &&
      !/^[-*+] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push({ kind: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

// ---------- renderer ----------
function renderBlock(block: Block, idx: number): React.ReactNode {
  const key = `b-${idx}`;

  switch (block.kind) {
    case "heading": {
      const cls = {
        1: "text-xl font-bold text-on-surface mt-4 mb-2",
        2: "text-lg font-bold text-on-surface mt-3 mb-1.5",
        3: "text-base font-semibold text-primary mt-2 mb-1",
      }[block.level] ?? "text-base font-semibold text-on-surface mt-2 mb-1";
      const Tag = ({ 1: "h1", 2: "h2", 3: "h3" } as const)[block.level as 1 | 2 | 3] ?? "h3";
      return <Tag key={key} className={cls}>{renderInline(block.text, key)}</Tag>;
    }

    case "paragraph":
      return (
        <p key={key} className="text-on-surface leading-relaxed mb-2">
          {renderInline(block.text, key)}
        </p>
      );

    case "bullet":
      return (
        <ul key={key} className="list-disc pl-5 mb-3 space-y-1">
          {block.items.map((item, j) => (
            <li key={j} className="text-on-surface leading-relaxed">
              {renderInline(item, `${key}-${j}`)}
            </li>
          ))}
        </ul>
      );

    case "ordered":
      return (
        <ol key={key} className="list-decimal pl-5 mb-3 space-y-1">
          {block.items.map((item, j) => (
            <li key={j} className="text-on-surface leading-relaxed">
              {renderInline(item, `${key}-${j}`)}
            </li>
          ))}
        </ol>
      );

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-4 border-primary/40 pl-4 py-1 my-3 bg-primary/5 rounded-r-lg italic text-on-surface-variant"
        >
          {renderInline(block.text, key)}
        </blockquote>
      );

    case "hr":
      return <hr key={key} className="border-[#2A2A32] my-4" />;

    case "code":
      return (
        <pre key={key} className="bg-[#1E1E24] border border-[#2A2A32] rounded-lg p-4 my-3 overflow-x-auto text-sm font-mono text-on-surface leading-relaxed">
          <code>{block.text}</code>
        </pre>
      );

    case "table":
      return (
        <div key={key} className="overflow-x-auto my-4 rounded-xl border border-[#2A2A32]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1E1E24] border-b border-[#2A2A32]">
                {block.headers.map((h, j) => (
                  <th
                    key={j}
                    className="px-4 py-2.5 font-semibold text-on-surface text-left whitespace-nowrap"
                    style={{ textAlign: (block.align[j] as any) || "left" }}
                  >
                    {renderInline(h, `${key}-h${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={`border-b border-[#2A2A32] last:border-0 ${ri % 2 === 0 ? "" : "bg-[#15151A]"}`}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-2.5 text-on-surface-variant"
                      style={{ textAlign: (block.align[ci] as any) || "left" }}
                    >
                      {renderInline(cell, `${key}-r${ri}c${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

// ---------- public component ----------
export function MarkdownContent({ content, className = "" }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);
  return (
    <div className={`prose-md ${className}`}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
