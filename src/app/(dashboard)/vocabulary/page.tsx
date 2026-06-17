"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const MASTERY_LABEL = ["New", "Learning", "Familiar", "Good", "Strong", "Mastered"];
const MASTERY_COLOR = [
  "bg-slate-100 border-slate-200 text-slate-500",
  "bg-blue-50 border-blue-200 text-blue-600",
  "bg-indigo-50 border-indigo-200 text-indigo-600",
  "bg-amber-50 border-amber-200 text-amber-600",
  "bg-emerald-50 border-emerald-200 text-emerald-600",
  "bg-green-50 border-green-200 text-green-700",
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
      toast.success("Word added successfully!");
    },
    onError: () => toast.error("Failed to add word"),
  });

  const remove = trpc.vocabulary.remove.useMutation({
    onSuccess: () => {
      utils.vocabulary.getAll.invalidate();
      toast.success("Word removed");
    },
    onError: () => toast.error("Failed to remove word"),
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
    <div className="w-full px-6 md:px-8 space-y-6">
      {/* Header Panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Vocabulary Bank</h1>
          <p className="text-slate-500 text-sm font-medium">
            You have stored <span className="text-primary-600 font-bold">{vocab.length} words</span> in your active dictionary.
          </p>
        </div>
        
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-95 cursor-pointer shrink-0"
        >
          {showAdd ? "Close Panel" : "+ Add New Word"}
        </button>
      </div>

      {/* Add word form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-white border border-slate-150 rounded-2xl p-6 space-y-4 shadow-md shadow-slate-100/50 animate-float-disabled"
        >
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-800 text-base">Add Word to Dictionary</h2>
            <p className="text-xs text-slate-400">Expand your custom database for lessons and spaced repetition reviews.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Word / Phrase</label>
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g. Ephemeral"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Definition</label>
              <input
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="e.g. Lasting for a very short time"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Example Sentence</label>
              <input
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="e.g. Fashions are ephemeral."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={add.isPending}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              {add.isPending ? "Saving..." : "Save Word"}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 text-sm pointer-events-none">
          🔍
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vocabulary words or definitions..."
          className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* Loading list */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayed.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <p className="text-5xl mb-4">📝</p>
          <h3 className="font-extrabold text-slate-900 text-lg">
            {search.length >= 2 ? "No Results Found" : "Your Word Bank is Empty"}
          </h3>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-sm mx-auto">
            {search.length >= 2
              ? "Try searching for another phrase or clear your search input."
              : "Store new phrases or expressions manually or via lessons to build your dictionary."}
          </p>
        </div>
      )}

      {/* Vocabulary List */}
      <div className="grid grid-cols-1 gap-3">
        {displayed.map((entry) => {
          const alreadyAdded = addedToFlashcard.has(entry.word);
          const mastery = entry.mastery ?? 0;
          
          return (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-primary-150 hover:shadow-md transition-all duration-300 group"
            >
              {/* Left Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-base group-hover:text-primary-600 transition-colors">
                    {entry.word}
                  </span>
                  
                  <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider ${MASTERY_COLOR[mastery]}`}>
                    {MASTERY_LABEL[mastery]}
                  </span>
                </div>
                
                <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                  {entry.definition}
                </p>
                
                {entry.example && (
                  <div className="pl-3 border-l-2 border-slate-200 mt-2 text-xs text-slate-400 italic">
                    &ldquo;{entry.example}&rdquo;
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 mt-1">
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
                  className={`text-xs px-3.5 py-2 rounded-xl border font-bold transition-all disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer active:scale-95 ${
                    alreadyAdded
                      ? "border-green-200 text-green-600 bg-green-50 shadow-inner"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-primary-300 hover:bg-white hover:text-primary-600"
                  }`}
                >
                  {alreadyAdded ? "✓ Added" : "🃏 Review"}
                </button>
                
                <button
                  onClick={() => {
                    if (confirm(`Remove "${entry.word}" from vocabulary?`)) {
                      remove.mutate({ id: entry.id });
                    }
                  }}
                  disabled={remove.isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all font-semibold cursor-pointer active:scale-95"
                  title="Delete word"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
