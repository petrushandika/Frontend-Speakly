"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  ChevronRight,
} from "lucide-react";

type ReviewState = "idle" | "reviewing" | "done";

const QUALITY_BUTTONS = [
  { quality: 0, label: "Forgot", color: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30" },
  { quality: 2, label: "Hard",   color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30" },
  { quality: 4, label: "Good",   color: "bg-primary-50 dark:bg-primary-900/30 border-primary-200 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40" },
  { quality: 5, label: "Easy",   color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" },
];

export default function FlashcardsPage() {
  const utils = trpc.useUtils();
  const [state, setState] = useState<ReviewState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  const { data: dueCards = [], isLoading } = trpc.srs.getDue.useQuery();
  const submitReview = trpc.srs.submitReview.useMutation();
  const addCard = trpc.srs.addCard.useMutation({
    onSuccess: () => {
      utils.srs.getDue.invalidate();
      toast.success("Card added!");
    },
    onError: () => toast.error("Failed to add card"),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [example, setExample] = useState("");

  const current = dueCards[currentIndex];
  const total = dueCards.length;

  function startReview() {
    setCurrentIndex(0);
    setFlipped(false);
    setCorrect(0);
    setIncorrect(0);
    setState("reviewing");
  }

  async function handleQuality(quality: number) {
    if (!current) return;
    try {
      await submitReview.mutateAsync({ cardId: current.id, quality });
    } catch {
      toast.error("Failed to save review. Please try again.");
      return;
    }

    if (quality >= 3) setCorrect((n) => n + 1);
    else setIncorrect((n) => n + 1);

    if (currentIndex + 1 >= total) {
      setState("done");
      utils.srs.getDue.invalidate();
      utils.progress.getDueFlashcardsCount.invalidate();
    } else {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    addCard.mutate({ front: front.trim(), back: back.trim(), example: example.trim() || undefined });
    setFront(""); setBack(""); setExample(""); setShowAdd(false);
  }

  // ── Done state ──
  if (state === "done") {
    const accuracy = total > 0 ? Math.round(((correct) / total) * 100) : 0;
    return (
      <div className="w-full p-3 md:p-8 space-y-4 md:space-y-6">
        <div className="w-full bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] p-8 shadow-sm space-y-6">
          {/* Title */}
          <div className="text-center space-y-1">
            <div className="w-14 h-14 rounded-[18px] bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Session Complete!</h1>
            <p className="text-sm text-[var(--foreground)]/55">You reviewed all {total} due cards.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 p-4 bg-[var(--surface)] border border-[var(--line)] rounded-[18px]">
              <span className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{total}</span>
              <span className="text-xs text-[var(--foreground)]/40 font-medium text-center">Cards reviewed</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-[18px]">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{correct}</span>
              <span className="text-xs text-emerald-500 font-medium text-center">Correct</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-[18px]">
              <span className="text-2xl font-bold text-red-500">{incorrect}</span>
              <span className="text-xs text-red-400 font-medium text-center">To retry</span>
            </div>
          </div>

          {/* Accuracy bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-[var(--foreground)]/55">
              <span>Accuracy</span>
              <span className={accuracy >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>{accuracy}%</span>
            </div>
            <div className="w-full h-2.5 bg-[var(--surface-strong)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${accuracy >= 70 ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{ width: `${accuracy}%` }}
              />
            </div>
            <p className="text-xs text-[var(--foreground)]/40">
              {accuracy >= 80
                ? "Excellent retention! Keep it up."
                : accuracy >= 60
                ? "Good work. Review the harder cards again tomorrow."
                : "Keep practicing — repetition builds memory."}
            </p>
          </div>

          <button
            onClick={() => setState("idle")}
            className="w-full py-3 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-bold rounded-xl text-sm transition-all shadow-sm active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Reviewing state ──
  if (state === "reviewing" && current) {
    const progressPercent = Math.round((currentIndex / total) * 100);
    return (
      <div className="w-full p-3 md:p-8 space-y-5">
        <div className="w-full space-y-5">
          {/* Progress bar */}
          <div className="flex items-center gap-3 bg-[var(--surface-strong)] px-4 py-3 border border-[var(--line)] rounded-[18px] shadow-sm">
            <div className="flex-1 h-2 bg-[var(--surface-strong)] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs font-bold text-[var(--foreground)]/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{correct}</span>
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span>{incorrect}</span>
              <span className="text-[var(--foreground)]/35">·</span>
              <span>{currentIndex + 1}/{total}</span>
            </div>
          </div>

          {/* Card */}
          <div
            onClick={() => setFlipped(!flipped)}
            className="cursor-pointer select-none min-h-[240px] bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] p-8 flex flex-col items-center justify-center gap-4 shadow-md hover:shadow-lg transition-all duration-200 group"
          >
            {!flipped ? (
              <>
                <span className="text-[10px] font-bold text-[var(--foreground)]/40 uppercase tracking-widest px-2.5 py-1 bg-[var(--surface)] border border-[var(--line)] rounded-full">
                  Tap to reveal answer
                </span>
                <p className="text-3xl font-bold text-[var(--foreground)] text-center leading-snug">
                  {current.front}
                </p>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 rounded-full">
                  Answer
                </span>
                <p className="text-xl sm:text-2xl font-bold text-[var(--foreground)] text-center leading-snug">
                  {current.back}
                </p>
                {current.example && (
                  <p className="text-xs text-[var(--foreground)]/40 italic text-center border-t border-[var(--line)] pt-3 max-w-sm">
                    "{current.example}"
                  </p>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          {flipped ? (
            <div className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] p-4 space-y-3 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]/40 text-center">
                How well did you recall?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUALITY_BUTTONS.map((b) => (
                  <button
                    key={b.quality}
                    onClick={() => handleQuality(b.quality)}
                    disabled={submitReview.isPending}
                    className={`py-3 border rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95 cursor-pointer ${b.color}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setFlipped(true)}
              className="w-full py-4 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-bold text-sm rounded-[18px] transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] cursor-pointer"
            >
              Reveal Answer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Idle state ──
  return (
    <div className="w-full p-3 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Flashcard Deck</h1>
            <p className="text-sm text-[var(--foreground)]/55">SM-2 spaced repetition system</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
        >
          {showAdd ? "Cancel" : "+ Card"}
        </button>
      </div>

      {/* Add card form */}
      {showAdd && (
        <form onSubmit={handleAddCard} className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] p-5 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Front</label>
              <input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Question or word" required className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-strong)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Back</label>
              <input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Answer or definition" required className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-strong)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Example (optional)</label>
              <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Example sentence" className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-strong)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-[var(--line-soft)] rounded-xl text-xs font-bold text-[var(--foreground)]/55 hover:bg-[var(--surface)] transition-all active:scale-95">
              Cancel
            </button>
            <button type="submit" disabled={addCard.isPending} className="px-5 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-xl text-xs font-bold disabled:opacity-50 transition-all active:scale-95 shadow-sm">
              {addCard.isPending ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      )}

      {/* CTA / status */}
      {isLoading ? (
        <div className="h-32 rounded-[22px] bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] animate-pulse" />
      ) : dueCards.length > 0 ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-[22px] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200">{dueCards.length} card{dueCards.length !== 1 ? "s" : ""} due for review</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Regular review keeps your memory strong.</p>
            </div>
          </div>
          <button
            onClick={startReview}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm active:scale-95 shrink-0"
          >
            Start Session
          </button>
        </div>
      ) : (
        <div className="text-center py-16 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] shadow-sm flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-[18px] bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="font-bold text-[var(--foreground)]">All caught up!</h3>
          <p className="text-[var(--foreground)]/40 text-sm max-w-xs">No cards due today. Come back tomorrow or add new cards.</p>
        </div>
      )}
    </div>
  );
}
