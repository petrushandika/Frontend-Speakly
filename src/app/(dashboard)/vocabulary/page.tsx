"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { trpc, trpcClient } from "@/lib/trpc";
import { getSupportedMimeType, blobType, blobFilename } from "@/lib/audio";
import { useSpeak } from "@/hooks/useSpeak";
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
  Volume2,
  Sparkles,
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
  "bg-[var(--surface-strong)] border-[var(--line-soft)] text-[var(--foreground)]/55",
  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600",
  "bg-primary-50 dark:bg-primary-900/30 border-primary-200 text-primary-600",
  "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400",
  "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400",
  "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",
];

export default function VocabularyPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("study");
  const { data: profile } = trpc.users.getProfile.useQuery();
  const speakText = useSpeak();
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
  // Shuffled queue — reshuffles each round so there's always a next word
  const [queue, setQueue] = useState<typeof studyList>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [practiceState, setPracticeState] = useState<PracticeState>("idle");
  const [spokenText, setSpokenText] = useState("");
  const [pronScore, setPronScore] = useState<PronunciationScore | null>(null);
  const [round, setRound] = useState(1);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const recCapRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unmount cleanup — clear all timers and stop any active recording
  useEffect(() => {
    return () => {
      if (recTimerRef.current)   clearInterval(recTimerRef.current);
      if (recCapRef.current)     clearTimeout(recCapRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    };
  }, []);

  // Seed the queue when the study list loads
  useEffect(() => {
    if (studyList.length > 0 && queue.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQueue(shuffle(studyList));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyList]);

  const activeWord = activeIndex !== null ? queue[activeIndex] : null;

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function openWord(idx: number) {
    setActiveIndex(idx);
    setPracticeState("idle");
    setSpokenText("");
    setPronScore(null);
  }

  function goNext() {
    if (activeIndex === null) return;
    const next = activeIndex + 1;
    if (next < queue.length) {
      openWord(next);
    } else {
      // End of round — reshuffle and start a new round
      const newQueue = shuffle(studyList);
      setQueue(newQueue);
      setRound((r) => r + 1);
      setActiveIndex(0);
      setPracticeState("idle");
      setSpokenText("");
      setPronScore(null);
      toast.success("Round complete! Starting next round — or generate AI words for more variety.", {
        action: {
          label: "Generate words",
          onClick: () => generateWords.mutate({ count: 10 }),
        },
        duration: 6000,
      });
    }
  }

  function goPrev() {
    if (activeIndex !== null && activeIndex > 0) openWord(activeIndex - 1);
  }

  // Auto-advance to next word after correct — use ref so only one timer runs at a time
  useEffect(() => {
    if (practiceState !== "correct") return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      goNext();
    }, 1500);
    return () => {
      if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceState, activeIndex, queue]);

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

  const updateMastery = trpc.vocabulary.updateMastery.useMutation({
    onSuccess: () => {
      utils.vocabulary.getAll.invalidate();
      utils.vocabulary.getStudyList.invalidate();
    },
  });

  const generateWords = trpc.vocabulary.generateWords.useMutation({
    onSuccess: (data) => {
      utils.vocabulary.getStudyList.invalidate();
      utils.vocabulary.getAll.invalidate();
      toast.success(`${data.saved} new words added to your study list!`);
      // Rebuild queue with fresh words
      setQueue([]);
    },
    onError: () => toast.error("Failed to generate words. Please try again."),
  });

  // Speaking practice
  const startPractice = useCallback(async (targetWord: string) => {
    setPracticeState("recording");
    setSpokenText("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
        if (recCapRef.current) { clearTimeout(recCapRef.current); recCapRef.current = null; }
        setPracticeState("checking");

        const blob = new Blob(chunksRef.current, { type: blobType(mimeType) });
        const token = localStorage.getItem("sb-access-token") ?? "";
        const formData = new FormData();
        formData.append("audio", blob, blobFilename(mimeType));

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8099"}/speech/transcribe`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const data = await res.json();
          const transcript: string = data.transcript ?? "";
          setSpokenText(transcript);

          // WER-based pronunciation scoring via backend
          const result: PronunciationScore = await trpcClient.ai.scorePronunciation.query({
            expected: targetWord,
            transcript,
          }).catch(() => ({ score: 0, correct: false, feedback: "Scoring unavailable", mismatchedWords: [] }));
          setPronScore(result);
          setPracticeState(result.correct ? "correct" : "wrong");

          // Auto-save mastery progress to DB
          if (activeWord) {
            updateMastery.mutate({
              word:       activeWord.word,
              definition: activeWord.definition,
              example:    activeWord.example || undefined,
              cefrLevel:  activeWord.cefrLevel,
              correct:    result.correct,
            });
          }
        } catch {
          setPracticeState("idle");
          toast.error("Could not transcribe. Check your microphone.");
        }
      };

      recorder.start();
      mediaRef.current = recorder;
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
      recCapRef.current = setTimeout(() => {
        if (mediaRef.current?.state === "recording") {
          mediaRef.current.stop();
          mediaRef.current = null;
        }
      }, 30_000);
    } catch {
      setPracticeState("idle");
      toast.error("Microphone access denied.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopRecording() {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (recCapRef.current) { clearTimeout(recCapRef.current); recCapRef.current = null; }
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
    <div className="w-full p-3 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
          <BookMarked className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Vocabulary</h1>
          <p className="text-sm text-[var(--foreground)]/55">Learn words and practice pronunciation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface-strong)] p-1 rounded-xl w-fit">
        {(["study", "bank"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? "bg-[var(--surface-strong)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground)]/55 hover:text-[var(--foreground)]/80"
            }`}
          >
            {t === "study" ? "Study List" : "My Bank"}
          </button>
        ))}
      </div>

      {/* ── STUDY LIST TAB ── */}
      {tab === "study" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[var(--foreground)]/40">
              {queue.length} words matched to your level — tap <strong>Practice</strong> to say each word aloud.
            </p>
            <button
              onClick={() => generateWords.mutate({ count: 10 })}
              disabled={generateWords.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generateWords.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                : <><Sparkles className="w-3.5 h-3.5" /> Generate AI words</>}
            </button>
          </div>

          {studyList.length === 0 && (
            <div className="text-center py-16 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] flex flex-col items-center gap-2">
              <BookMarked className="w-8 h-8 text-[var(--foreground)]/25" />
              <p className="text-sm text-[var(--foreground)]/40">No study words yet.</p>
              <button
                onClick={() => generateWords.mutate({ count: 10 })}
                disabled={generateWords.isPending}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {generateWords.isPending ? "Generating…" : "Generate my first words"}
              </button>
            </div>
          )}

          {/* Active practice card — shown at top when a word is selected */}
          {activeWord && activeIndex !== null && (
            <div className="bg-[var(--surface-strong)] rounded-[18px] border border-primary-300 shadow-md">
              {/* Navigation header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)]">
                <button
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]/40 hover:text-[var(--foreground)]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs font-semibold text-[var(--foreground)]/40">
                  {activeIndex + 1} / {queue.length}
                  {round > 1 && <span className="ml-1 text-primary-500">R{round}</span>}
                </span>
                <button
                  onClick={goNext}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]/40 hover:text-[var(--foreground)]/80 transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Word info */}
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-[var(--foreground)]">{activeWord.word}</span>
                    <span className="text-sm text-[var(--foreground)]/40 font-mono">{activeWord.phonetic}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-full font-semibold">{activeWord.cefrLevel}</span>
                    <button
                      onClick={() => speakText(activeWord.word)}
                      title="Hear pronunciation"
                      className="p-1 rounded-lg text-[var(--foreground)]/40 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-[var(--foreground)]/70 mt-1">{activeWord.definition}</p>
                  <p className="text-xs text-primary-600 font-semibold mt-0.5">{activeWord.indonesian}</p>
                  <p className="text-xs text-[var(--foreground)]/40 italic mt-0.5">&ldquo;{activeWord.example}&rdquo;</p>
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
                    className={`p-2 rounded-lg border transition-colors ${addedToFlashcard.has(activeWord.word) ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "border-[var(--line-soft)] text-[var(--foreground)]/40 hover:border-primary-400 hover:text-primary-600"}`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setActiveIndex(null); setPracticeState("idle"); setSpokenText(""); }}
                    className="p-2 rounded-lg border border-[var(--line-soft)] text-[var(--foreground)]/40 hover:bg-[var(--surface)] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Practice panel */}
              <div className="border-t border-[var(--line)] px-4 pb-4 pt-3 bg-[var(--surface)]/50 rounded-b-2xl space-y-3">
                <p className="text-xs font-semibold text-[var(--foreground)]/40 uppercase tracking-wide">Say this word aloud:</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl sm:text-4xl font-bold text-primary-600 tracking-wide">{activeWord.word}</p>
                    <p className="text-sm text-[var(--foreground)]/40 font-mono mt-0.5">{activeWord.phonetic}</p>
                  </div>
                  <button
                    onClick={() => speakText(activeWord.word)}
                    title="Hear correct pronunciation"
                    className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
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
                    <span className="text-xs text-[var(--foreground)]/40">Recording… {recSeconds}s</span>
                  </div>
                )}
                {practiceState === "checking" && (
                  <div className="flex items-center gap-2 text-sm text-[var(--foreground)]/40">
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking pronunciation…
                  </div>
                )}
                {practiceState === "correct" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Correct! Moving to next word…
                      </p>
                      {pronScore && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 rounded-lg">
                          {pronScore.score}% accuracy
                        </span>
                      )}
                    </div>
                    {pronScore?.feedback && <p className="text-xs text-[var(--foreground)]/55 italic">{pronScore.feedback}</p>}
                  </div>
                )}
                {practiceState === "wrong" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-orange-500 flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Not quite — try again!
                      </p>
                      {pronScore && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 rounded-lg">
                          {pronScore.score}% accuracy
                        </span>
                      )}
                    </div>
                    {pronScore?.feedback && <p className="text-xs text-[var(--foreground)]/55 italic">{pronScore.feedback}</p>}
                    {spokenText && <p className="text-xs text-[var(--foreground)]/40">You said: &ldquo;<span className="font-medium">{spokenText}</span>&rdquo;</p>}
                    <p className="text-xs text-[var(--foreground)]/40">Target: <span className="font-semibold text-[var(--foreground)]/70">{activeWord.word}</span></p>
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
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 rounded-xl text-xs text-primary-700 dark:text-primary-300 font-medium">
              <Eye className="w-3.5 h-3.5 shrink-0" />
              Mode immersion aktif — definisi tersembunyi. Tap kata untuk reveal.
            </div>
          )}

          {/* Word list */}
          {studyList.map((item) => {
            const isActive = activeWord?.word === item.word;
            const defRevealed = isBeginnerLevel || revealedDefs.has(item.word);
            return (
              <div
                key={item.word}
                className={`bg-[var(--surface-strong)] rounded-[18px] border transition-all ${
                  isActive ? "border-primary-200 opacity-60" : "border-[var(--line)] hover:border-[var(--line-soft)]"
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-[var(--foreground)]">{item.word}</span>
                      <span className="text-sm text-[var(--foreground)]/40 font-mono">{item.phonetic}</span>
                      <span className="text-xs px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-full font-semibold">
                        {item.cefrLevel}
                      </span>
                    </div>
                    {defRevealed ? (
                      <>
                        <p className="text-sm text-[var(--foreground)]/70 mt-1">{item.definition}</p>
                        <p className="text-xs text-primary-600 font-semibold mt-0.5">{item.indonesian}</p>
                        <p className="text-xs text-[var(--foreground)]/40 italic mt-0.5">&ldquo;{item.example}&rdquo;</p>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleDef(item.word)}
                        className="mt-1.5 text-xs text-primary-600 hover:text-primary-700 dark:hover:text-primary-300 dark:text-primary-300 font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Lihat definisi
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0 items-start">
                    <button
                      onClick={() => speakText(item.word)}
                      title="Hear pronunciation"
                      className="p-2 rounded-lg border border-[var(--line-soft)] text-[var(--foreground)]/40 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
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
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                          : "border-[var(--line-soft)] text-[var(--foreground)]/40 hover:border-primary-400 hover:text-primary-600"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>

                    {!isActive ? (
                      <button
                        onClick={() => {
                          const qIdx = queue.findIndex((w) => w.word === item.word);
                          openWord(qIdx !== -1 ? qIdx : 0);
                        }}
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
            <p className="text-sm text-[var(--foreground)]/55">{vocab.length} saved words</p>
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
                <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Word or phrase" required className="px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-strong)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="Definition" required className="px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-strong)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Example sentence (optional)" className="px-3.5 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-strong)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground)]/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-strong)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-[18px] bg-[var(--surface-strong)] animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && displayed.length === 0 && (
            <div className="text-center py-16 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] text-[var(--foreground)]/40 flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-[var(--foreground)]/25" />
              <p className="text-sm">{search.length >= 2 ? "No results found" : "No words yet — add your first word above"}</p>
            </div>
          )}

          <div className="space-y-2">
            {displayed.map((entry) => {
              const alreadyAdded = addedToFlashcard.has(entry.word);
              return (
                <div key={entry.id} className="flex items-start gap-3 p-3 sm:p-4 bg-[var(--surface-strong)] rounded-[18px] border border-[var(--line)]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-[var(--foreground)]">{entry.word}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${MASTERY_COLOR[entry.mastery ?? 0]}`}>
                        {MASTERY_LABEL[entry.mastery ?? 0]}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--foreground)]/55">{entry.definition}</p>
                    {entry.example && <p className="text-xs text-[var(--foreground)]/40 italic mt-0.5">&ldquo;{entry.example}&rdquo;</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => speakText(entry.word)}
                      title="Hear pronunciation"
                      className="p-2 rounded-lg border border-[var(--line-soft)] text-[var(--foreground)]/40 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => addFlashcard.mutate({ front: entry.word, back: entry.definition, example: entry.example ?? undefined })}
                      disabled={alreadyAdded}
                      title={alreadyAdded ? "Added to flashcards" : "Add to flashcards"}
                      className={`p-2 rounded-lg border transition-colors ${
                        alreadyAdded ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "border-[var(--line-soft)] text-[var(--foreground)]/40 hover:border-primary-400 hover:text-primary-600"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove.mutate({ id: entry.id })}
                      disabled={remove.isPending}
                      className="p-2 rounded-lg border border-[var(--line-soft)] text-[var(--foreground)]/35 hover:border-red-300 dark:hover:border-red-700 hover:text-red-400 transition-colors"
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
