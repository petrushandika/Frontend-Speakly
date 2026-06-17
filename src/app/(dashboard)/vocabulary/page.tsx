"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BookMarked, Plus, Search, Mic, Square, RotateCcw, Layers } from "lucide-react";

type Tab = "study" | "bank";
type PracticeState = "idle" | "recording" | "checking" | "correct" | "wrong";

const MASTERY_LABEL = ["New", "Learning", "Familiar", "Good", "Strong", "Mastered"];
const MASTERY_COLOR = [
  "bg-slate-100 border-slate-200 text-slate-500",
  "bg-blue-50 border-blue-200 text-blue-600",
  "bg-indigo-50 border-indigo-200 text-indigo-600",
  "bg-amber-50 border-amber-200 text-amber-600",
  "bg-emerald-50 border-emerald-200 text-emerald-600",
  "bg-green-50 border-green-200 text-green-700",
];

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z\s]/g, "").trim();
}

function checkPronunciation(spoken: string, target: string): boolean {
  const spokenWords = normalize(spoken).split(/\s+/);
  const targetWord = normalize(target);
  return spokenWords.some((w) => w === targetWord || w.startsWith(targetWord.slice(0, -1)));
}

export default function VocabularyPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("study");

  // Study tab
  const { data: studyList = [] } = trpc.vocabulary.getStudyList.useQuery();
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [practiceState, setPracticeState] = useState<PracticeState>("idle");
  const [spokenText, setSpokenText] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Bank tab
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
      toast.success("Word saved!");
    },
    onError: () => toast.error("Failed to save word"),
  });

  const remove = trpc.vocabulary.remove.useMutation({
    onSuccess: () => {
      utils.vocabulary.getAll.invalidate();
      toast.success("Word removed");
    },
  });

  const addFlashcard = trpc.srs.addCard.useMutation({
    onSuccess: (_, vars) => {
      setAddedToFlashcard((prev) => new Set([...prev, vars.front]));
      utils.progress.getDueFlashcardsCount.invalidate();
      toast.success("Added to flashcards!");
    },
  });

  // Speaking practice
  const startPractice = useCallback(async (targetWord: string) => {
    setPracticeId(targetWord);
    setPracticeState("recording");
    setSpokenText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setPracticeState("checking");

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const token = localStorage.getItem("sb-access-token") ?? "";
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/transcribe`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const data = await res.json();
          const transcript: string = data.transcript ?? "";
          setSpokenText(transcript);
          setPracticeState(checkPronunciation(transcript, targetWord) ? "correct" : "wrong");
        } catch {
          setPracticeState("idle");
          toast.error("Could not transcribe. Check your microphone.");
        }
      };

      recorder.start();
      mediaRef.current = recorder;
      setTimeout(() => {
        if (mediaRef.current?.state === "recording") {
          mediaRef.current.stop();
          mediaRef.current = null;
        }
      }, 4000);
    } catch {
      setPracticeState("idle");
      toast.error("Microphone access denied.");
    }
  }, []);

  function stopRecording() {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
      mediaRef.current = null;
    }
  }

  function resetPractice() {
    setPracticeId(null);
    setPracticeState("idle");
    setSpokenText("");
  }

  const displayed = search.length >= 2 ? (searchResults ?? []) : vocab;

  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
          <BookMarked className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vocabulary</h1>
          <p className="text-sm text-slate-500">Learn words and practice pronunciation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["study", "bank"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "study" ? "📖 Study List" : "📝 My Bank"}
          </button>
        ))}
      </div>

      {/* ── STUDY LIST TAB ── */}
      {tab === "study" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            {studyList.length} words matched to your level — tap <strong>Practice</strong> to say each word aloud.
          </p>

          {studyList.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-sm text-slate-400">No study words found for your level.</p>
            </div>
          )}

          {studyList.map((item) => {
            const isActive = practiceId === item.word;
            return (
              <div
                key={item.word}
                className={`bg-white rounded-2xl border transition-all ${
                  isActive ? "border-primary-300 shadow-md" : "border-slate-100 hover:border-slate-200"
                }`}
              >
                {/* Word row */}
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-900">{item.word}</span>
                      <span className="text-sm text-slate-400 font-mono">{item.phonetic}</span>
                      <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full font-semibold">
                        {item.cefrLevel}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{item.definition}</p>
                    <p className="text-xs text-slate-400 italic mt-0.5">"{item.example}"</p>
                  </div>

                  <div className="flex gap-2 shrink-0 items-start">
                    <button
                      onClick={() => addFlashcard.mutate({ front: item.word, back: item.definition, example: item.example })}
                      disabled={addedToFlashcard.has(item.word)}
                      title="Add to flashcards"
                      className={`p-2 rounded-lg border text-xs transition-colors ${
                        addedToFlashcard.has(item.word)
                          ? "border-green-200 bg-green-50 text-green-600"
                          : "border-slate-200 text-slate-400 hover:border-primary-400 hover:text-primary-600"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>

                    {!isActive ? (
                      <button
                        onClick={() => startPractice(item.word)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <Mic className="w-3.5 h-3.5" /> Practice
                      </button>
                    ) : (
                      <button
                        onClick={resetPractice}
                        className="px-3 py-2 border border-slate-200 text-slate-500 text-xs rounded-lg hover:bg-slate-50"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>

                {/* Practice panel */}
                {isActive && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50/50 rounded-b-2xl space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Say this word aloud:
                    </p>
                    <div>
                      <p className="text-4xl font-bold text-primary-600 tracking-wide">{item.word}</p>
                      <p className="text-sm text-slate-400 font-mono mt-0.5">{item.phonetic}</p>
                    </div>

                    {practiceState === "idle" && (
                      <button
                        onClick={() => startPractice(item.word)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                      >
                        <Mic className="w-4 h-4" /> Start recording
                      </button>
                    )}

                    {practiceState === "recording" && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={stopRecording}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 animate-pulse"
                        >
                          <Square className="w-4 h-4" /> Stop
                        </button>
                        <span className="text-xs text-slate-400">Recording… auto-stops in 4s</span>
                      </div>
                    )}

                    {practiceState === "checking" && (
                      <p className="text-sm text-slate-400">Checking pronunciation…</p>
                    )}

                    {practiceState === "correct" && (
                      <div className="space-y-1.5">
                        <p className="font-semibold text-green-600 flex items-center gap-2">
                          <span>✅</span> Correct! Well done.
                        </p>
                        {spokenText && <p className="text-xs text-slate-400">You said: "{spokenText}"</p>}
                        <button onClick={() => { setPracticeState("idle"); setSpokenText(""); }} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                          <RotateCcw className="w-3 h-3" /> Try again
                        </button>
                      </div>
                    )}

                    {practiceState === "wrong" && (
                      <div className="space-y-1.5">
                        <p className="font-semibold text-orange-500 flex items-center gap-2">
                          <span>🔄</span> Not quite — try again!
                        </p>
                        {spokenText && <p className="text-xs text-slate-400">You said: "{spokenText}"</p>}
                        <p className="text-xs text-slate-400">
                          Target: <span className="font-semibold text-slate-600">{item.word}</span> {item.phonetic}
                        </p>
                        <button onClick={() => { setPracticeState("idle"); setSpokenText(""); }} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                          <RotateCcw className="w-3 h-3" /> Try again
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MY BANK TAB ── */}
      {tab === "bank" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{vocab.length} saved words</p>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {showAdd ? "Cancel" : "Add word"}
            </button>
          </div>

          {showAdd && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!word.trim() || !definition.trim()) return;
                add.mutate({ word: word.trim(), definition: definition.trim(), example: example.trim() || undefined });
              }}
              className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Word or phrase" required className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="Definition" required className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Example sentence (optional)" className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={add.isPending} className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
                  {add.isPending ? "Saving…" : "Save word"}
                </button>
              </div>
            </form>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && displayed.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl text-slate-400">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-sm">{search.length >= 2 ? "No results found" : "No words yet — add your first word above"}</p>
            </div>
          )}

          <div className="space-y-2">
            {displayed.map((entry) => {
              const alreadyAdded = addedToFlashcard.has(entry.word);
              return (
                <div key={entry.id} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-slate-900">{entry.word}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${MASTERY_COLOR[entry.mastery ?? 0]}`}>
                        {MASTERY_LABEL[entry.mastery ?? 0]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{entry.definition}</p>
                    {entry.example && <p className="text-xs text-slate-400 italic mt-0.5">"{entry.example}"</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => addFlashcard.mutate({ front: entry.word, back: entry.definition, example: entry.example ?? undefined })}
                      disabled={alreadyAdded}
                      title={alreadyAdded ? "Added to flashcards" : "Add to flashcards"}
                      className={`p-2 rounded-lg border transition-colors ${
                        alreadyAdded ? "border-green-200 bg-green-50 text-green-600" : "border-slate-200 text-slate-400 hover:border-primary-400 hover:text-primary-600"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove.mutate({ id: entry.id })}
                      disabled={remove.isPending}
                      className="p-2 rounded-lg border border-slate-200 text-slate-300 hover:border-red-300 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
