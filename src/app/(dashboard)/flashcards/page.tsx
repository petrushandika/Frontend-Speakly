"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type ReviewState = "idle" | "reviewing" | "done";

const QUALITY_BUTTONS = [
  { quality: 0, label: "Forgot 🔴",   color: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100/70" },
  { quality: 2, label: "Hard 🟡",     color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70" },
  { quality: 4, label: "Good 🔵",     color: "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70" },
  { quality: 5, label: "Easy 🟢",     color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70" },
];

export default function FlashcardsPage() {
  const utils = trpc.useUtils();
  const [state, setState] = useState<ReviewState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const { data: dueCards = [], isLoading } = trpc.srs.getDue.useQuery();
  const submitReview = trpc.srs.submitReview.useMutation();
  const addCard = trpc.srs.addCard.useMutation({
    onSuccess: () => {
      utils.srs.getDue.invalidate();
      toast.success("Card added successfully!");
    },
    onError: () => toast.error("Failed to add card"),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [example, setExample] = useState("");

  const current = dueCards[currentIndex];

  function startReview() {
    setCurrentIndex(0);
    setFlipped(false);
    setReviewed(0);
    setState("reviewing");
  }

  async function handleQuality(quality: number) {
    if (!current) return;
    await submitReview.mutateAsync({ cardId: current.id, quality });
    setReviewed((r) => r + 1);

    if (currentIndex + 1 >= dueCards.length) {
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
    addCard.mutate({
      front: front.trim(),
      back: back.trim(),
      example: example.trim() || undefined,
    });
    setFront(""); setBack(""); setExample(""); setShowAdd(false);
  }

  // ── Done state ──
  if (state === "done") {
    return (
      <div className="w-full p-6 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-xl text-center space-y-6 bg-white border border-slate-100 rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="text-6xl animate-float">🎉</div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Session Complete!</h1>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              Excellent work! You reviewed <span className="text-indigo-600 font-bold">{reviewed} flashcard{reviewed !== 1 ? "s" : ""}</span> and refreshed your memory.
            </p>
          </div>
          
          <button
            onClick={() => setState("idle")}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary-500/10 active:scale-95 cursor-pointer w-full"
          >
            Back to Flashcards
          </button>
        </div>
      </div>
    );
  }

  // ── Reviewing state ──
  if (state === "reviewing" && current) {
    const progressPercent = Math.round((currentIndex / dueCards.length) * 100);
    return (
      <div className="w-full p-6 md:p-8 space-y-6 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-6">
        {/* Progress Tracker */}
        <div className="flex items-center gap-4 bg-white px-5 py-3.5 border border-slate-100 rounded-2xl shadow-sm">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-400 shrink-0">
            {currentIndex + 1} / {dueCards.length}
          </span>
        </div>

        {/* Physical-style Card Container */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="cursor-pointer select-none min-h-[260px] bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-between shadow-md hover:shadow-lg transition-all duration-300 relative group overflow-hidden"
        >
          {/* Subtle styling cue on top */}
          <div className="w-12 h-1 bg-slate-100 group-hover:bg-primary-100 rounded-full transition-colors" />

          {!flipped ? (
            <div className="text-center space-y-3 py-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-0.5 bg-slate-50 border border-slate-150 rounded-full">
                Front (Tap to flip)
              </span>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {current.front}
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4 py-4 w-full">
              <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest px-2.5 py-0.5 bg-primary-50 border border-primary-100 rounded-full">
                Back (Answer)
              </span>
              <p className="text-2xl font-extrabold text-indigo-950 tracking-tight leading-snug">
                {current.back}
              </p>
              {current.example && (
                <div className="max-w-md mx-auto p-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs text-slate-500 leading-relaxed italic mt-3">
                  &ldquo;{current.example}&rdquo;
                </div>
              )}
            </div>
          )}

          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
            <span>🔄</span> Click card to flip
          </div>
        </div>

        {/* Action Controls */}
        {flipped ? (
          <div className="space-y-4 bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
              How well did you recall?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUALITY_BUTTONS.map((b) => (
                <button
                  key={b.quality}
                  onClick={() => handleQuality(b.quality)}
                  disabled={submitReview.isPending}
                  className={`py-3 px-2 border rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95 cursor-pointer ${b.color}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-sm md:text-base rounded-2xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] cursor-pointer"
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
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Header Panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Flashcard Deck</h1>
          <p className="text-slate-500 text-sm font-medium">
            Train your memory using Spaced Repetition (SM-2) intervals.
          </p>
        </div>
        
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-95 cursor-pointer shrink-0"
        >
          {showAdd ? "Close Panel" : "+ Create New Card"}
        </button>
      </div>

      {/* Add card form */}
      {showAdd && (
        <form onSubmit={handleAddCard} className="bg-white border border-slate-150 rounded-2xl p-6 space-y-4 shadow-md shadow-slate-100/50">
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-800 text-base">Create Flashcard</h2>
            <p className="text-xs text-slate-400">Add custom questions, concepts or words to review later.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Front (Prompt)</label>
              <input
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="e.g. have Went (grammar error)"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Back (Answer)</label>
              <input
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="e.g. went (simple past)"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Context Example</label>
              <input
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="e.g. I went to school yesterday."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={addCard.isPending}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all active:scale-95 cursor-pointer shadow-sm">
              {addCard.isPending ? "Creating..." : "Save Card"}
            </button>
          </div>
        </form>
      )}

      {/* Due Cards Notification Banner / CTA */}
      {isLoading ? (
        <div className="h-32 rounded-3xl bg-white border border-slate-100 animate-pulse" />
      ) : dueCards.length > 0 ? (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-extrabold text-amber-800 text-lg flex items-center gap-2">
              <span>🃏</span> {dueCards.length} review{dueCards.length !== 1 ? "s" : ""} pending!
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-semibold">
              Take a few minutes to review your due cards and boost your long-term memory score.
            </p>
          </div>
          <button
            onClick={startReview}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer shrink-0"
          >
            Start Review Session
          </button>
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-3">
          <p className="text-5xl animate-float-disabled">✅</p>
          <h3 className="font-extrabold text-slate-900 text-lg">You&apos;re All Caught Up!</h3>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            No cards are due for review today. Keep checking your lessons or add new cards manually!
          </p>
        </div>
      )}
    </div>
  );
}
