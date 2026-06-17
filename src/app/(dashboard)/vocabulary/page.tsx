"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  BookMarked,
  Plus,
  Search,
  Mic,
  Square,
  RotateCcw,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

type Tab = "study" | "bank";
type PracticeState = "idle" | "recording" | "checking" | "correct" | "wrong";

interface PronunciationScore {
  score: number;
  correct: boolean;
  feedback: string;
  mismatchedWords: Array<{ expected: string; said: string | null }>;
}

const MASTERY_LABEL = ["New", "Learning", "Familiar", "Good", "Strong", "Mastered"];
const MASTERY_COLOR = [
  "bg-slate-100 border-[var(--line-soft)] text-slate-500",
  "bg-blue-50 border-blue-200 text-blue-600",
  "bg-indigo-50 border-indigo-200 text-indigo-600",
  "bg-amber-50 border-amber-200 text-amber-600",
  "bg-emerald-50 border-emerald-200 text-emerald-600",
  "bg-green-50 border-green-200 text-green-700",
];

export default function VocabularyPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("study");
  const { data: profile } = trpc.users.getProfile.useQuery();
  const cefrLevel = profile?.cefrLevel ?? "B1";
  const isBeginnerLevel = cefrLevel === "A1" || cefrLevel === "A2";
  // For B1+: track which word cards have their definition revealed
  const [revealedDefs, setRevealedDefs] = useState<Set<string>>(new Set());
  function toggleDef(word: string) {
    setRevealedDefs((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  }

  // Study tab
  const { data: studyList = [] } = trpc.vocabulary.getStudyList.useQuery();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [practiceState, setPracticeState] = useState<PracticeState>("idle");
  const [spokenText, setSpokenText] = useState("");
  const [pronScore, setPronScore] = useState<PronunciationScore | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeWord = activeIndex !== null ? studyList[activeIndex] : null;

  function openWord(idx: number) {
    setActiveIndex(idx);
    setPracticeState("idle");
    setSpokenText("");
  }

  function goNext() {
    if (activeIndex === null) return;
    const next = activeIndex + 1;
    if (next < studyList.length) openWord(next);
    else {
      setActiveIndex(null);
      setPracticeState("idle");
      toast.success("You've completed all words in this list!");
    }
  }

  function goPrev() {
    if (activeIndex !== null && activeIndex > 0) openWord(activeIndex - 1);
  }

  // Auto-advance to next word after correct
  useEffect(() => {
    if (practiceState !== "correct") return;
    const timer = setTimeout(() => goNext(), 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceState, activeIndex, studyList]);

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

          // WER-based pronunciation scoring via backend
          const scoreRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/trpc/ai.scorePronunciation?input=${encodeURIComponent(JSON.stringify({ expected: targetWord, transcript }))}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const scoreData = await scoreRes.json();
          const result: PronunciationScore = scoreData?.result?.data ?? { score: 0, correct: false, feedback: "", mismatchedWords: [] };
          setPronScore(result);
          setPracticeState(result.correct ? "correct" : "wrong");
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
    setPracticeState("idle");
    setSpokenText("");
    setPronScore(null);
  }

  const displayed = search.length >= 2 ? (searchResults ?? []) : vocab;

  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
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
            {t === "study" ? "Study List" : "My Bank"}
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
            <div className="text-center py-16 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] flex flex-col items-center gap-2">
              <BookMarked className="w-8 h-8 text-slate-200" />
              <p className="text-sm text-slate-400">No study words found for your level.</p>
            </div>
          )}

          {/* Active practice card — shown at top when a word is selected */}
          {activeWord && activeIndex !== null && (
            <div className="bg-white rounded-[18px] border border-primary-300 shadow-md">
              {/* Navigation header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <button
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs font-semibold text-slate-400">{activeIndex + 1} / {studyList.length}</span>
                <button
                  onClick={goNext}
                  disabled={activeIndex === studyList.length - 1}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Word info */}
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-slate-900">{activeWord.word}</span>
                    <span className="text-sm text-slate-400 font-mono">{activeWord.phonetic}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full font-semibold">{activeWord.cefrLevel}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{activeWord.definition}</p>
                  <p className="text-xs text-primary-600 font-semibold mt-0.5">{activeWord.indonesian}</p>
                  <p className="text-xs text-slate-400 italic mt-0.5">"{activeWord.example}"</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => addFlashcard.mutate({ 
                      front: activeWord.word, 
                      back: activeWord.indonesian ? `${activeWord.indonesian} — ${activeWord.definition}` : activeWord.definition, 
                      example: activeWord.example 
                    })}
                    disabled={addedToFlashcard.has(activeWord.word)}
                    title={addedToFlashcard.has(activeWord.word) ? "Added" : "Add to flashcards"}
                    className={`p-2 rounded-lg border transition-colors ${addedToFlashcard.has(activeWord.word) ? "border-green-200 bg-green-50 text-green-600" : "border-[var(--line-soft)] text-slate-400 hover:border-primary-400 hover:text-primary-600"}`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setActiveIndex(null); setPracticeState("idle"); setSpokenText(""); }}
                    className="p-2 rounded-lg border border-[var(--line-soft)] text-slate-400 hover:bg-[var(--surface)] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Practice panel */}
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-[var(--surface)]/50 rounded-b-2xl space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Say this word aloud:</p>
                <div>
                  <p className="text-4xl font-bold text-primary-600 tracking-wide">{activeWord.word}</p>
                  <p className="text-sm text-slate-400 font-mono mt-0.5">{activeWord.phonetic}</p>
                </div>

                {practiceState === "idle" && (
                  <button
                    onClick={() => startPractice(activeWord.word)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    <Mic className="w-4 h-4" /> Start recording
                  </button>
                )}
                {practiceState === "recording" && (
                  <div className="flex items-center gap-3">
                    <button onClick={stopRecording} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 animate-pulse">
                      <Square className="w-4 h-4" /> Stop
                    </button>
                    <span className="text-xs text-slate-400">Recording… auto-stops in 4s</span>
                  </div>
                )}
                {practiceState === "checking" && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking pronunciation…
                  </div>
                )}
                {practiceState === "correct" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-green-600 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Correct! Moving to next word…
                      </p>
                      {pronScore && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
                          {pronScore.score}% accuracy
                        </span>
                      )}
                    </div>
                    {pronScore?.feedback && <p className="text-xs text-slate-500 italic">{pronScore.feedback}</p>}
                  </div>
                )}
                {practiceState === "wrong" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-orange-500 flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Not quite — try again!
                      </p>
                      {pronScore && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg">
                          {pronScore.score}% accuracy
                        </span>
                      )}
                    </div>
                    {pronScore?.feedback && <p className="text-xs text-slate-500 italic">{pronScore.feedback}</p>}
                    {spokenText && <p className="text-xs text-slate-400">You said: "<span className="font-medium">{spokenText}</span>"</p>}
                    <p className="text-xs text-slate-400">Target: <span className="font-semibold text-slate-600">{activeWord.word}</span></p>
                    <button onClick={() => resetPractice()} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                      <RotateCcw className="w-3 h-3" /> Try again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Immersion hint for B1+ */}
          {!isBeginnerLevel && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-100 rounded-xl text-xs text-primary-700 font-medium">
              <Eye className="w-3.5 h-3.5 shrink-0" />
              Mode immersion aktif — definisi tersembunyi. Tap kata untuk reveal.
            </div>
          )}

          {/* Word list */}
          {studyList.map((item, idx) => {
            const isActive = activeIndex === idx;
            const defRevealed = isBeginnerLevel || revealedDefs.has(item.word);
            return (
              <div
                key={item.word}
                className={`bg-white rounded-[18px] border transition-all ${
                  isActive ? "border-primary-200 opacity-60" : "border-slate-100 hover:border-[var(--line-soft)]"
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-900">{item.word}</span>
                      <span className="text-sm text-slate-400 font-mono">{item.phonetic}</span>
                      <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full font-semibold">
                        {item.cefrLevel}
                      </span>
                    </div>
                    {defRevealed ? (
                      <>
                        <p className="text-sm text-slate-600 mt-1">{item.definition}</p>
                        <p className="text-xs text-primary-600 font-semibold mt-0.5">{item.indonesian}</p>
                        <p className="text-xs text-slate-400 italic mt-0.5">"{item.example}"</p>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleDef(item.word)}
                        className="mt-1.5 text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Lihat definisi
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0 items-start">
                    <button
                      onClick={() => addFlashcard.mutate({ 
                        front: item.word, 
                        back: item.indonesian ? `${item.indonesian} — ${item.definition}` : item.definition, 
                        example: item.example 
                      })}
                      disabled={addedToFlashcard.has(item.word)}
                      title={addedToFlashcard.has(item.word) ? "Added to flashcards" : "Add to flashcards"}
                      className={`p-2 rounded-lg border transition-colors ${
                        addedToFlashcard.has(item.word)
                          ? "border-green-200 bg-green-50 text-green-600"
                          : "border-[var(--line-soft)] text-slate-400 hover:border-primary-400 hover:text-primary-600"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>

                    {!isActive ? (
                      <button
                        onClick={() => openWord(idx)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <Mic className="w-3.5 h-3.5" /> Practice
                      </button>
                    ) : (
                      <span className="text-xs text-primary-500 font-semibold px-3 py-2">Active ↑</span>
                    )}
                  </div>
                </div>
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
              {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
              className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] p-5 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Word or phrase" required className="px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="Definition" required className="px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Example sentence (optional)" className="px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={add.isPending} className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
                  {add.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "Save word"}
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--line-soft)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-[18px] bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && displayed.length === 0 && (
            <div className="text-center py-16 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] text-slate-400 flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-slate-200" />
              <p className="text-sm">{search.length >= 2 ? "No results found" : "No words yet — add your first word above"}</p>
            </div>
          )}

          <div className="space-y-2">
            {displayed.map((entry) => {
              const alreadyAdded = addedToFlashcard.has(entry.word);
              return (
                <div key={entry.id} className="flex items-start gap-3 p-4 bg-white rounded-[18px] border border-slate-100">
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
                        alreadyAdded ? "border-green-200 bg-green-50 text-green-600" : "border-[var(--line-soft)] text-slate-400 hover:border-primary-400 hover:text-primary-600"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove.mutate({ id: entry.id })}
                      disabled={remove.isPending}
                      className="p-2 rounded-lg border border-[var(--line-soft)] text-slate-300 hover:border-red-300 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
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
