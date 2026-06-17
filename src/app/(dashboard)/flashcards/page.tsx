"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

type ReviewState = "idle" | "reviewing" | "done";

const QUALITY_BUTTONS = [
  { quality: 0, label: "Forgot",   color: "bg-red-100 text-red-700 hover:bg-red-200" },
  { quality: 2, label: "Hard",     color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  { quality: 4, label: "Good",     color: "bg-green-100 text-green-700 hover:bg-green-200" },
  { quality: 5, label: "Easy",     color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
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
    onSuccess: () => utils.srs.getDue.invalidate(),
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
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900">Session complete!</h1>
        <p className="text-gray-500">You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.</p>
        <button
          onClick={() => setState("idle")}
          className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
        >
          Back to flashcards
        </button>
      </div>
    );
  }

  // ── Reviewing state ──
  if (state === "reviewing" && current) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${(currentIndex / dueCards.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {currentIndex + 1} / {dueCards.length}
          </span>
        </div>

        {/* Card */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="cursor-pointer select-none min-h-52 bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          {!flipped ? (
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Front — tap to reveal</p>
              <p className="text-2xl font-bold text-gray-900">{current.front}</p>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Back</p>
              <p className="text-xl font-semibold text-gray-800">{current.back}</p>
              {current.example && (
                <p className="text-sm text-gray-400 italic mt-2">"{current.example}"</p>
              )}
            </div>
          )}
        </div>

        {/* Quality buttons */}
        {flipped ? (
          <div>
            <p className="text-xs text-center text-gray-400 mb-3">How well did you remember?</p>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_BUTTONS.map((b) => (
                <button
                  key={b.quality}
                  onClick={() => handleQuality(b.quality)}
                  disabled={submitReview.isPending}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${b.color}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-2xl hover:bg-primary-700 transition-colors"
          >
            Reveal answer
          </button>
        )}
      </div>
    );
  }

  // ── Idle state ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
          <p className="text-sm text-gray-500 mt-1">Spaced repetition review</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
        >
          + Add card
        </button>
      </div>

      {/* Add card form */}
      {showAdd && (
        <form onSubmit={handleAddCard} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">New flashcard</h2>
          <input
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front (word / question)"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <input
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back (definition / answer)"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Example sentence (optional)"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={addCard.isPending}
              className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {addCard.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* Due cards CTA */}
      {isLoading ? (
        <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
      ) : dueCards.length > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-800 text-lg">
              {dueCards.length} card{dueCards.length !== 1 ? "s" : ""} due
            </p>
            <p className="text-sm text-amber-600 mt-0.5">Review them now to retain your memory</p>
          </div>
          <button
            onClick={startReview}
            className="px-5 py-2.5 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
          >
            Start review
          </button>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium text-gray-600">All caught up!</p>
          <p className="text-sm mt-1">No cards due right now. Add new ones above.</p>
        </div>
      )}
    </div>
  );
}
