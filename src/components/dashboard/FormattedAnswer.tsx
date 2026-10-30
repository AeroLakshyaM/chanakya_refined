import type { ReactNode } from "react";

type AnswerBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

function parseAnswer(source: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: "list", ...list });
    list = null;
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }
    const item = line.match(/^(?:[-*+]\s+|(\d+)[.)]\s+)(.+)$/);
    if (item) {
      flushParagraph();
      const ordered = Boolean(item[1]);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push(item[2]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph(); flushList();
  return blocks;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="bg-secondary px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function FormattedAnswer({ content }: { content: string }) {
  return <div className="space-y-3 text-sm leading-7">
    {parseAnswer(content).map((block, index) => {
      if (block.type === "heading") return <h3 key={index} className={`${block.level <= 2 ? "pt-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground" : "text-sm font-semibold text-foreground"}`}>{inline(block.text)}</h3>;
      if (block.type === "list") {
        const List = block.ordered ? "ol" : "ul";
        return <List key={index} className={`space-y-1.5 pl-5 marker:text-primary ${block.ordered ? "list-decimal" : "list-disc"}`}>{block.items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{inline(item)}</li>)}</List>;
      }
      return <p key={index} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{inline(block.text)}</p>;
    })}
  </div>;
}
