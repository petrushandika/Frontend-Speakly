"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Lightbulb, X, Loader2, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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

// Common Indonesian words to exclude from vocab chips
const ID_WORDS = new Set([
  "yang","dan","di","ke","dari","ini","itu","dengan","untuk","tidak","ada","saya",
  "kamu","dia","kami","kita","mereka","adalah","atau","juga","sudah","bisa","akan",
  "karena","tapi","jadi","kalau","seperti","artinya","berarti","contoh","kata",
  "kalimat","bahasa","inggris","indonesia","belajar","latihan","lebih","sangat",
  "masih","sudah","belum","sering","selalu","kadang","pernah","jangan","harus",
  "boleh","mau","perlu","ingat","tahu","lihat","bilang","pakai","sama","lagi",
  "satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh",
]);

function isEnglishWord(w: string): boolean {
  const lower = w.toLowerCase().trim();
  // Must contain at least one letter
  if (!/[a-z]/i.test(lower)) return false;
  // Must be mostly ASCII (no Indonesian-specific chars, though Indonesian uses mostly ASCII too)
  // Check against known Indonesian words list
  const firstToken = lower.split(/\s+/)[0];
  if (ID_WORDS.has(firstToken)) return false;
  // Reject if ALL tokens are Indonesian words (multi-word phrases)
  const tokens = lower.split(/\s+/);
  if (tokens.length > 1 && tokens.every((t) => ID_WORDS.has(t))) return false;
  // Reject pure numbers or punctuation
  if (/^[\d\s.,!?]+$/.test(lower)) return false;
  return true;
}

// Extract bold words (**word**) and quoted words ("word") from AI message — English only
function extractWords(text: string): string[] {
  // Remove the "Small note" correction section before extracting
  const mainText = text.replace(/[—–-]\s*Small note:.*/i, "").trim();
  const bold   = [...mainText.matchAll(/\*\*([^*\n]{1,60})\*\*/g)].map((m) => m[1].trim());
  const quoted = [...mainText.matchAll(/"([^"\n]{2,60})"/g)].map((m) => m[1].trim());
  const seen   = new Set<string>();
  const result: string[] = [];
  for (const w of [...bold, ...quoted]) {
    const key = w.toLowerCase();
    if (!seen.has(key) && isEnglishWord(w)) {
      seen.add(key);
      result.push(w);
    }
  }
  return result.slice(0, 8);
}

// ── Grammar correction chip ──────────────────────────────────────────────────

function CorrectionChip({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  // Parse "You said: "X" → Better: "Y" — explanation" format
  const youSaid  = text.match(/You said:\s*"([^"]+)"/i)?.[1];
  const better   = text.match(/Better:\s*"([^"]+)"/i)?.[1];
  const dashIdx  = better ? text.indexOf("—", text.indexOf(better)) : -1;
  const explain  = dashIdx !== -1 ? text.slice(dashIdx + 1).trim() : (youSaid && better ? "" : text);

  // If we can parse structured format, render it nicely; otherwise fall back to raw text
  const structured = youSaid && better;

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl text-xs max-w-full w-full">
      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className="font-bold text-amber-800 dark:text-amber-400 text-[11px] uppercase tracking-wide">Correction ✏️</span>
        {structured ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md line-through text-[11px] font-medium">{youSaid}</span>
              <span className="text-amber-600 font-bold">→</span>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-md font-bold text-[11px]">{better}</span>
            </div>
            {explain && <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">{explain}</p>}
          </>
        ) : (
          <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">{text}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded-md text-amber-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors mt-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── One-tap word chip ─────────────────────────────────────────────────────────

function WordChip({ word, onSaved }: { word: string; onSaved: () => void }) {
  const utils = trpc.useUtils();
  const [state, setState]   = useState<"idle" | "saving" | "saved">("idle");
  const [definition, setDefinition] = useState<string | null>(null);

  const add = trpc.vocabulary.add.useMutation({
    onSuccess: () => {
      utils.vocabulary.getAll.invalidate();
      utils.vocabulary.getStudyList.invalidate();
      setState("saved");
      toast.success(`"${word}" saved to vocabulary!`);
      onSaved();
    },
    onError: () => {
      setState("idle");
      toast.error("Failed to save word");
    },
  });

  const classify = trpc.ai.classifyWord.useMutation({
    onSuccess: (data) => {
      const def        = data?.definition ?? word;
      const example    = data?.exampleSentence;
      const cefrLevel  = data?.cefrLevel;
      setDefinition(def);
      add.mutate({ word, definition: def, example, cefrLevel });
    },
    onError: () => {
      add.mutate({ word, definition: word });
    },
  });

  function handleTap() {
    if (state !== "idle") return;
    setState("saving");
    classify.mutate({ word });
  }

  if (state === "saved") {
    return (
      <span className="inline-flex flex-col gap-0.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg max-w-[180px]">
        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
          <BookmarkCheck className="w-3 h-3 shrink-0" /> {word}
        </span>
        {definition && (
          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 leading-snug">{definition}</span>
        )}
      </span>
    );
  }

  return (
    <button
      onClick={handleTap}
      disabled={state === "saving"}
      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--surface)] border border-[var(--line)] hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-[var(--foreground)]/70 hover:text-primary-600 text-[10px] font-semibold rounded-lg transition-all disabled:opacity-60"
    >
      {state === "saving"
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <BookmarkPlus className="w-3 h-3" />}
      {word}
    </button>
  );
}

// ── Auto-save panel ───────────────────────────────────────────────────────────

function SavePanel({ text, onClose }: { text: string; onClose: () => void }) {
  const words = extractWords(text);
  const [savedCount, setSavedCount] = useState(0);

  if (words.length === 0) {
    return (
      <div className="mt-1 px-3 py-2.5 bg-[var(--surface)] border border-[var(--line)] rounded-xl text-xs text-[var(--foreground)]/50 flex items-center justify-between gap-2">
        <span>No highlighted words found in this message.</span>
        <button onClick={onClose} className="text-[var(--foreground)]/30 hover:text-[var(--foreground)]/60">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 p-3 bg-[var(--surface)] border border-[var(--line)] rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-[var(--foreground)]/50 uppercase tracking-wide">
          Tap to save — auto-fills definition
        </p>
        <button onClick={onClose} className="text-[var(--foreground)]/30 hover:text-[var(--foreground)]/60">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {words.map((w) => (
          <WordChip key={w} word={w} onSaved={() => setSavedCount((n) => n + 1)} />
        ))}
      </div>
      {savedCount > 0 && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{savedCount} word{savedCount > 1 ? "s" : ""} added to your vocabulary</p>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [correctionDismissed, setCorrectionDismissed] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);

  // Match "— Small note:" in any dash/em-dash variant, anywhere in the message
  const noteMatch = message.content.match(/[—–-]\s*Small note:\s*/i);
  const noteIndex = noteMatch?.index ?? -1;
  const mainText  = noteIndex !== -1 ? message.content.slice(0, noteIndex).trim() : message.content.trim();
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
          <CorrectionChip text={correctionText} onDismiss={() => setCorrectionDismissed(true)} />
        )}

        {/* Save word button — only on completed AI messages */}
        {!isUser && !message.isStreaming && (
          <button
            onClick={() => setShowSavePanel((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
              showSavePanel
                ? "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400"
                : "text-[var(--foreground)]/30 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-transparent hover:border-primary-100 dark:hover:border-primary-800"
            )}
          >
            <BookmarkPlus className="w-3 h-3" />
            Save words
          </button>
        )}

        {/* Auto-save panel */}
        {!isUser && showSavePanel && (
          <SavePanel text={message.content} onClose={() => setShowSavePanel(false)} />
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
