"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Lightbulb, X, Loader2 } from "lucide-react";
import type { Message } from "@/hooks/useAIChat";

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-[var(--foreground)]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function FormattedText({ text, isUser }: { text: string; isUser: boolean }) {
  if (isUser) return <p className="font-medium leading-relaxed">{text}</p>;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];

  function flushUL() {
    if (!ulItems.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="list-disc list-outside ml-4 space-y-0.5 my-1.5">
        {ulItems.map((item, i) => (
          <li key={i} className="text-[var(--foreground)]/80 leading-relaxed">{renderInline(item)}</li>
        ))}
      </ul>
    );
    ulItems = [];
  }

  function flushOL() {
    if (!olItems.length) return;
    elements.push(
      <ol key={`ol-${elements.length}`} className="list-decimal list-outside ml-4 space-y-0.5 my-1.5">
        {olItems.map((item, i) => (
          <li key={i} className="text-[var(--foreground)]/80 leading-relaxed">{renderInline(item)}</li>
        ))}
      </ol>
    );
    olItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const raw  = lines[i];
    const line = raw.trim();

    const bulletMatch = line.match(/^[-*•]\s+(.+)/);
    if (bulletMatch) { flushOL(); ulItems.push(bulletMatch[1]); continue; }

    const numMatch = line.match(/^\d+[.)]\s+(.+)/);
    if (numMatch) { flushUL(); olItems.push(numMatch[1]); continue; }

    flushUL();
    flushOL();

    if (line === "") {
      if (elements.length > 0) elements.push(<div key={`gap-${i}`} className="h-1" />);
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="leading-relaxed text-[var(--foreground)]">
        {renderInline(line)}
      </p>
    );
  }

  flushUL();
  flushOL();

  return <div className="space-y-1">{elements}</div>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [correctionDismissed, setCorrectionDismissed] = useState(false);

  const noteIndex      = message.content.indexOf("— Small note:");
  const mainText       = noteIndex !== -1 ? message.content.slice(0, noteIndex).trim() : message.content.trim();
  const correctionText = noteIndex !== -1
    ? message.content.slice(noteIndex).replace(/^[—–-]\s*Small note:\s*/i, "").trim()
    : null;

  return (
    <div className={cn("flex gap-3 my-3", isUser ? "justify-end" : "justify-start")}>

      {/* Aria avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 shadow-sm">
          AI
        </div>
      )}

      <div className={cn("flex flex-col gap-2 max-w-[78%]", isUser ? "items-end" : "items-start")}>

        {/* Main bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-stone-900 text-white rounded-tr-sm"
            : "bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] text-[var(--foreground)] rounded-tl-sm"
        )}>
          <FormattedText text={mainText || message.content} isUser={isUser} />

          {message.isStreaming && !isUser && (
            <span className="inline-flex items-center gap-1 mt-2">
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </div>

        {/* Grammar correction chip */}
        {!isUser && correctionText && !message.isStreaming && !correctionDismissed && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl text-xs max-w-full">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-amber-800 dark:text-amber-400 block mb-0.5">Grammar note</span>
              <FormattedText text={correctionText} isUser={false} />
            </div>
            <button
              onClick={() => setCorrectionDismissed(true)}
              className="shrink-0 p-0.5 rounded-md text-amber-400 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors mt-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Streaming status */}
        {!isUser && message.isStreaming && (
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-[var(--foreground)]/40">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Aria is typing…</span>
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-[var(--surface-strong)] border border-[var(--line)] flex items-center justify-center text-[var(--foreground)]/70 text-xs font-bold shrink-0 mt-1">
          You
        </div>
      )}
    </div>
  );
}
