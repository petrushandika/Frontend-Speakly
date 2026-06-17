"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const MASTERY_LABEL = ["New", "Learning", "Familiar", "Good", "Strong", "Mastered"];
const MASTERY_COLOR = [
  "bg-gray-100 text-gray-500",
  "bg-blue-100 text-blue-600",
  "bg-indigo-100 text-indigo-600",
  "bg-amber-100 text-amber-600",
  "bg-green-100 text-green-600",
  "bg-emerald-100 text-emerald-700",
];

export default function VocabularyPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [addedToFlashcard, setAddedToFlashcard] = useState<Set<string>>(new Set());

  const { data: vocab = [], isLoading } = trpc.vocabulary.getAll.useQuery();
  const { data: searchResults } = trpc.vocabulary.search.useQuery(
    { query: search },
    { enabled: search.length >= 2 },
  );

  const add = trpc.vocabulary.add.useMutation({
    onSuccess: () => {
      utils.vocabulary.getAll.invalidate();
      setWord(""); setDefinition(""); setExample(""); setShowAdd(false);
    },
  });

  const remove = trpc.vocabulary.remove.useMutation({
    onSuccess: () => utils.vocabulary.getAll.invalidate(),
  });

  const addFlashcard = trpc.srs.addCard.useMutation({
    onSuccess: (_, vars) => {
      setAddedToFlashcard((prev) => new Set([...prev, vars.front]));
      utils.progress.getDueFlashcardsCount.invalidate();
      toast.success("Added to flashcards!");
    },
    onError: () => toast.error("Failed to add flashcard"),
  });

  const displayed = search.length >= 2 ? (searchResults ?? []) : vocab;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || !definition.trim()) return;
    add.mutate({ word: word.trim(), definition: definition.trim(), example: example.trim() || undefined });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vocabulary</h1>
          <p className="text-sm text-gray-500 mt-1">{vocab.length} words in your bank</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
        >
          + Add word
        </button>
      </div>

      {/* Add word form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3"
        >
          <h2 className="font-semibold text-gray-800">Add new word</h2>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Word or phrase"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <input
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Definition"
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
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={add.isPending}
              className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {add.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search your vocabulary…"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
      />

      {/* List */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && displayed.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p className="font-medium">
            {search.length >= 2 ? "No results found" : "No words yet"}
          </p>
          <p className="text-sm mt-1">
            {search.length >= 2
              ? "Try a different search"
              : "Add words as you learn them"}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {displayed.map((entry) => {
          const alreadyAdded = addedToFlashcard.has(entry.word);
          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-gray-900">{entry.word}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MASTERY_COLOR[entry.mastery ?? 0]}`}>
                    {MASTERY_LABEL[entry.mastery ?? 0]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{entry.definition}</p>
                {entry.example && (
                  <p className="text-xs text-gray-400 italic mt-1">"{entry.example}"</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <button
                  onClick={() =>
                    addFlashcard.mutate({
                      front: entry.word,
                      back: entry.definition,
                      example: entry.example ?? undefined,
                    })
                  }
                  disabled={addFlashcard.isPending || alreadyAdded}
                  title={alreadyAdded ? "Added to flashcards" : "Add to flashcards"}
                  className={`text-sm px-2.5 py-1 rounded-lg border transition-colors disabled:cursor-not-allowed ${
                    alreadyAdded
                      ? "border-green-200 text-green-600 bg-green-50"
                      : "border-gray-200 text-gray-400 hover:border-primary-400 hover:text-primary-600"
                  }`}
                >
                  {alreadyAdded ? "✓" : "🃏"}
                </button>
                <button
                  onClick={() => remove.mutate({ id: entry.id })}
                  disabled={remove.isPending}
                  className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none px-1"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
