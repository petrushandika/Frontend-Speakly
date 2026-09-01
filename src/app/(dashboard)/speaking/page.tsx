"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Skeleton, SkeletonGroup } from "@/components/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { getSupportedMimeType, blobType, blobFilename } from "@/lib/audio";
import {
  Mic, MicOff, BookOpen,
  CheckCircle2, XCircle, ChevronRight,
  Loader2, Star, BookMarked, Lightbulb, Zap,
  Globe, Coffee, Cpu, FlaskConical, Palette,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = "business" | "technology" | "travel" | "daily_life" | "science" | "culture";

interface ReadingText {
  title: string;
  genre?: string;
  theme: string;
  cefrLevel: string;
  paragraphs: string[];
  wordCount: number;
  keyVocabulary: Array<{ word: string; definition: string; indonesian: string; ipa: string }>;
  readingTips: string;
  pronunciationChallenges?: string[];
}

interface WordResult {
  word: string;
  correct: boolean;
  expected: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const THEMES: { id: Theme; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { id: "business",    label: "Business",    icon: Zap,          color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",   desc: "Professional scenarios" },
  { id: "technology",  label: "Technology",  icon: Cpu,          color: "bg-primary-50 dark:bg-primary-900/30 border-primary-200 text-primary-700 dark:text-primary-300", desc: "Tech & innovation" },
  { id: "travel",      label: "Travel",      icon: Globe,        color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400", desc: "Exploration & culture" },
  { id: "daily_life",  label: "Daily Life",  icon: Coffee,       color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400", desc: "Everyday situations" },
  { id: "science",     label: "Science",     icon: FlaskConical, color: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400",   desc: "Discovery & research" },
  { id: "culture",     label: "Culture",     icon: Palette,      color: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-400",   desc: "Arts & traditions" },
];

const PARAGRAPH_OPTIONS = [
  { value: 1, label: "1 paragraph", sub: "~175 words · Quick practice" },
  { value: 2, label: "2 paragraphs", sub: "~350 words · Standard" },
  { value: 3, label: "3 paragraphs", sub: "~560 words · Full session" },
];

const GENRES = [
  { id: "narrative",   label: "Short Story" },
  { id: "article",     label: "Magazine Article" },
  { id: "opinion",     label: "Opinion Piece" },
  { id: "travel_log",  label: "Travel Journal" },
  { id: "interview",   label: "Interview" },
  { id: "how_to",      label: "How-To Guide" },
  { id: "review",      label: "Review" },
  { id: "letter",      label: "Personal Letter" },
  { id: "news",        label: "News Report" },
  { id: "blog",        label: "Blog Post" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeWord(w: string) {
  return w.toLowerCase().replace(/[^a-z']/g, "");
}

// LCS-based sequence alignment: aligns original words to transcript words
// so natural speech (skipped/extra words) doesn't cascade wrong marks
function compareTranscript(original: string, transcript: string): WordResult[] {
  const origWords = original.split(/\s+/).filter(Boolean);
  const spokenWords = transcript.split(/\s+/).filter(Boolean).map(normalizeWord);

  const n = origWords.length;
  const m = spokenWords.length;

  // Build LCS length table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (normalizeWord(origWords[i - 1]) === spokenWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find matches
  const matched = new Set<number>(); // indices in origWords that matched
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (normalizeWord(origWords[i - 1]) === spokenWords[j - 1]) {
      matched.add(i - 1);
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return origWords.map((word, idx) => ({
    word,
    expected: normalizeWord(word),
    correct: matched.has(idx),
  }));
}

function calcScore(results: WordResult[]) {
  if (results.length === 0) return 0;
  const correct = results.filter((r) => r.correct).length;
  return Math.round((correct / results.length) * 100);
}

// ── Step: Select options ───────────────────────────────────────────────────────

function SelectStep({
  theme, setTheme,
  paragraphs, setParagraphs,
  genre, setGenre,
  onGenerate, isGenerating,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  paragraphs: number;
  setParagraphs: (n: number) => void;
  genre: string;
  setGenre: (g: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="w-full space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Reading Aloud</h1>
          <p className="text-xs sm:text-sm text-[var(--foreground)]/55 mt-0.5">AI generates a passage — read it aloud, we score your pronunciation</p>
        </div>
      </div>

      {/* Theme picker */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest">Choose a theme</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-[0_3px_0_var(--line)] active:translate-y-[3px] active:shadow-none ${
                  active
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                    : "border-transparent bg-[var(--surface-strong)] hover:border-[var(--line)]"
                }`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border ${t.color}`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm font-bold ${active ? "text-primary-700 dark:text-primary-300" : "text-[var(--foreground)]/80"}`}>{t.label}</p>
                  <p className="text-[10px] sm:text-[11px] text-[var(--foreground)]/40 mt-0.5">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre picker */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest">Text format</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setGenre("")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none ${
              genre === "" ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--foreground)]/60 hover:border-primary-300"
            }`}
          >
            🎲 Random
          </button>
          {GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGenre(g.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none ${
                genre === g.id ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--foreground)]/60 hover:border-primary-300"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Length picker */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest">Passage length</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {PARAGRAPH_OPTIONS.map((opt) => {
            const active = paragraphs === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setParagraphs(opt.value)}
                className={`px-4 py-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-[0_3px_0_var(--line)] active:translate-y-[3px] active:shadow-none ${
                  active
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                    : "border-transparent bg-[var(--surface-strong)] hover:border-[var(--line)]"
                }`}
              >
                <p className={`text-sm font-bold ${active ? "text-primary-700 dark:text-primary-300" : "text-[var(--foreground)]/80"}`}>{opt.label}</p>
                <p className="text-[11px] text-[var(--foreground)]/40 mt-0.5">{opt.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl transition-all shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-[4px] active:shadow-none cursor-pointer"
      >
        {isGenerating ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}

// ── Step: Read the passage ─────────────────────────────────────────────────────

function ReadingStep({
  text,
  onRecordingDone,
  onReset,
}: {
  text: ReadingText;
  onRecordingDone: (transcript: string) => void;
  onReset: () => void;
}) {
  const [isRecording, setIsRecording]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recSeconds, setRecSeconds]     = useState(0);
  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
        setIsProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: blobType(mimeType) });
          const formData = new FormData();
          formData.append("audio", blob, blobFilename(mimeType));

          const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8099";
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const res = await fetch(`${apiUrl}/speech/transcribe`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token ?? ""}` },
            body: formData,
          });

          const data = await res.json();
          // Always proceed to results — even empty transcript shows which words were missed
          onRecordingDone(data.transcript ?? "");
        } catch {
          toast.error("Transcription failed. Check your connection and try again.");
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach((t) => t.stop());
        }
      };
      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    mediaRef.current?.stop();
    setIsRecording(false);
  }

  const timeLabel = `${Math.floor(recSeconds / 60)}:${String(recSeconds % 60).padStart(2, "0")}`;

  return (
    // pb besar: memberi ruang untuk bar rekam yang sticky di bawah
    <div className="w-full space-y-5 pb-28">
      {/* Text header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">Read Aloud</p>
          <h2 className="text-xl font-bold text-[var(--foreground)]">{text.title}</h2>
          <p className="text-xs text-[var(--foreground)]/40 mt-0.5">{text.wordCount} words · CEFR {text.cefrLevel}</p>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-[var(--foreground)]/40 hover:text-[var(--foreground)]/80 bg-[var(--surface-strong)] border border-[var(--line)] hover:border-[var(--line)] px-3 py-1.5 rounded-xl transition-all"
        >
          New text
        </button>
      </div>

      {/* Reading tip */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">{text.readingTips}</p>
      </div>

      {/* Passage */}
      <div className="bg-[var(--surface-strong)] border border-[var(--line)] rounded-2xl p-6 shadow-sm space-y-4">
        {text.paragraphs.map((p, i) => (
          <p key={i} className="text-[var(--foreground)] leading-9 text-lg sm:text-xl tracking-wide max-w-[68ch]">
            {p}
          </p>
        ))}
      </div>

      {/* Key vocabulary — tertutup secara default agar passage tetap jadi fokus */}
      {text.keyVocabulary.length > 0 && (
        <details className="group space-y-2">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest hover:text-[var(--foreground)]/70 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
            Key Vocabulary ({text.keyVocabulary.length})
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {text.keyVocabulary.map((v) => (
              <div key={v.word} className="flex items-start gap-3 p-3 bg-[var(--surface-strong)] border border-[var(--line)] rounded-xl">
                <BookMarked className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold text-[var(--foreground)] text-sm">{v.word} <span className="text-xs font-normal text-[var(--foreground)]/40">{v.ipa}</span></p>
                  <p className="text-xs text-[var(--foreground)]/55 mt-0.5">{v.definition}</p>
                  <p className="text-xs text-primary-600 font-semibold mt-0.5">{v.indonesian}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Record controls — sticky supaya selalu terjangkau tanpa scroll */}
      <div className="sticky bottom-0 -mx-1 px-1 pb-1 pt-3 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent">
        <div className="sk-panel px-4 py-3 flex items-center gap-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all focus:outline-none focus:ring-4 ${
              isProcessing
                ? "bg-[var(--surface)] cursor-not-allowed focus:ring-transparent"
                : isRecording
                  ? "bg-red-500 hover:bg-red-600 focus:ring-red-300 cursor-pointer"
                  : "bg-primary-600 hover:bg-primary-700 focus:ring-primary-300 cursor-pointer"
            }`}
          >
            {isRecording && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />}
            {isProcessing ? (
              <Loader2 className="w-6 h-6 text-[var(--foreground)]/40 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-6 h-6 text-white relative" />
            ) : (
              <Mic className="w-6 h-6 text-white relative" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--foreground)] truncate">
              {isProcessing ? "Processing your recording…" : isRecording ? "Recording — read the passage aloud" : "Ready when you are"}
            </p>
            <p className="text-xs text-[var(--foreground)]/50 mt-0.5">
              {isRecording ? "Tap the mic again when you finish" : isProcessing ? "Please wait…" : "Tap the mic to start reading"}
            </p>
          </div>

          {isRecording && (
            <span className="shrink-0 font-mono text-lg font-bold text-red-500 tabular-nums">{timeLabel}</span>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Step: Results ──────────────────────────────────────────────────────────────

// Split a flat WordResult array back into paragraphs based on paragraph word counts
function splitResultsByParagraph(results: WordResult[], paragraphs: string[]): WordResult[][] {
  const groups: WordResult[][] = [];
  let offset = 0;
  for (const para of paragraphs) {
    const count = para.split(/\s+/).filter(Boolean).length;
    groups.push(results.slice(offset, offset + count));
    offset += count;
  }
  return groups;
}

function ResultStep({
  text,
  transcript,
  onTryAgain,
  onNewText,
}: {
  text: ReadingText;
  transcript: string;
  onTryAgain: () => void;
  onNewText: () => void;
}) {
  const fullText   = text.paragraphs.join(" ");
  const wordResults = compareTranscript(fullText, transcript);
  const score       = calcScore(wordResults);
  const paraResults = splitResultsByParagraph(wordResults, text.paragraphs);

  const correct   = wordResults.filter((r) => r.correct).length;
  const incorrect = wordResults.filter((r) => !r.correct).length;
  const missedWords = wordResults.filter((r) => !r.correct).map((r) => r.expected).slice(0, 15);

  const utils = trpc.useUtils();
  const awardXP = trpc.progress.awardXP.useMutation({
    onSuccess: () => utils.progress.getSummary.invalidate(),
  });
  const updateStreak = trpc.progress.updateStreak.useMutation({
    onSuccess: () => utils.progress.getSummary.invalidate(),
  });

  const analyze = trpc.ai.analyzeReadingAloud.useMutation({
    onSuccess: () => {
      // XP: base 20 + bonus based on score (max 50 total)
      const xpAmount = Math.round(20 + (score / 100) * 30);
      awardXP.mutate({ amount: xpAmount });
      updateStreak.mutate();
    },
  });

  function triggerAnalysis() {
    analyze.mutate({ expected: fullText, transcript, cefrLevel: text.cefrLevel, missedWords });
  }

  // Auto-trigger AI analysis once on mount
  const hasTriggered = useRef(false);
  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;
    triggerAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoreColor =
    score >= 85 ? "text-emerald-600 dark:text-emerald-400" :
    score >= 65 ? "text-amber-600 dark:text-amber-400"  :
    "text-red-600";
  const scoreBg =
    score >= 85 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700" :
    score >= 65 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700" :
    "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  const scoreLabel =
    score >= 90 ? "Excellent! Near-native accuracy" :
    score >= 75 ? "Great pronunciation!" :
    score >= 60 ? "Good effort — keep practicing" :
    "Needs more practice — try again";

  return (
    <div className="w-full space-y-6">
      {/* Score card */}
      <div className={`rounded-2xl border p-4 sm:p-6 text-center ${scoreBg}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className={`w-5 h-5 ${scoreColor}`} />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)]/55">Pronunciation Score</p>
        </div>
        <p className={`text-4xl sm:text-6xl font-black ${scoreColor}`}>{score}<span className="text-xl sm:text-2xl font-bold text-[var(--foreground)]/40">%</span></p>
        <p className={`text-sm font-semibold mt-2 ${scoreColor}`}>{scoreLabel}</p>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{correct}</span>
            <span className="text-[var(--foreground)]/55">correct</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="font-bold text-red-700 dark:text-red-400">{incorrect}</span>
            <span className="text-[var(--foreground)]/55">incorrect</span>
          </div>
        </div>
        {awardXP.data && (
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-3">
            ⚡ +{awardXP.data.awarded} XP earned
          </p>
        )}
      </div>

      {/* Per-paragraph result — reads like a story */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest">Your reading</p>
        <div className="bg-[var(--surface-strong)] border border-[var(--line)] rounded-2xl p-5 space-y-4 shadow-sm">
          {paraResults.map((paraWords, pi) => (
            <p key={pi} className="leading-8 text-base max-w-[68ch]">
              {paraWords.map((r, wi) => (
                <span key={wi}>
                  <span
                    className={`rounded px-0.5 font-medium ${
                      r.correct
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 underline decoration-red-400 decoration-wavy underline-offset-2"
                    }`}
                    title={r.correct ? undefined : `Not recognized — try: "${r.expected}"`}
                  >
                    {r.word}
                  </span>
                  {wi < paraWords.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          ))}
        </div>
        {incorrect > 0 && (
          <p className="text-xs text-[var(--foreground)]/40 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            Wavy underline = not clearly recognized — say those words slower and clearer
          </p>
        )}
      </div>

      {/* What you actually said */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest">What you said</p>
        <div className="bg-[var(--surface)] border border-[var(--line-soft)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)]/70 leading-relaxed italic">
          {transcript.trim() || <span className="text-[var(--foreground)]/30 not-italic">No speech detected — try speaking louder or closer to the mic</span>}
        </div>
      </div>

      {/* AI Deep Analysis */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> AI Coach Feedback
        </p>
        {analyze.isPending && (
          <SkeletonGroup className="bg-[var(--surface)] border border-[var(--line-soft)] rounded-xl p-4 space-y-3">
            <p className="flex items-center gap-2 text-xs text-[var(--foreground)]/40">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing your pronunciation…
            </p>
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-11/12 rounded-full" />
            <Skeleton className="h-3 w-8/12 rounded-full" />
          </SkeletonGroup>
        )}
        {analyze.isError && (
          <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
            <span>AI analysis failed.</span>
            <button onClick={triggerAnalysis} className="font-bold underline hover:no-underline">Retry</button>
          </div>
        )}
        {analyze.data && (
          <div className="bg-[var(--surface)] border border-[var(--line-soft)] rounded-xl p-4 space-y-4 text-sm">
            {/* Overall */}
            <p className="text-[var(--foreground)]/80 leading-relaxed">{analyze.data.overallFeedback}</p>

            {/* Spelling / word errors */}
            {analyze.data.spellingErrors?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Word errors detected</p>
                <div className="space-y-1.5">
                  {analyze.data.spellingErrors.map((e: { said: string; expected: string; type: string; tip: string }, i: number) => (
                    <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded line-through">{e.said}</span>
                      <span className="text-[var(--foreground)]/40">→</span>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded font-semibold">{e.expected}</span>
                      <span className="text-[10px] text-[var(--foreground)]/50 italic">{e.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pronunciation tips */}
            {analyze.data.pronunciationTips?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Pronunciation tips</p>
                <div className="space-y-2">
                  {analyze.data.pronunciationTips.map((t: { word: string; ipa: string; commonMistake: string; tip: string }, i: number) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--foreground)]">{t.word}</span>
                        <span className="text-[10px] text-primary-500 font-mono">{t.ipa}</span>
                      </div>
                      <p className="text-xs text-[var(--foreground)]/60">{t.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top priority */}
            {analyze.data.topPriority && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-xl">
                <Star className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-primary-800 dark:text-primary-300">{analyze.data.topPriority}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onTryAgain}
          className="flex-1 py-3.5 bg-[var(--surface-strong)] border border-[var(--line)] hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-[var(--foreground)]/80 hover:text-primary-700 dark:hover:text-primary-300 font-bold rounded-2xl transition-all shadow-[0_3px_0_var(--line)] active:translate-y-[3px] active:shadow-none cursor-pointer"
        >
          Retry
        </button>
        <button
          onClick={onNewText}
          className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl transition-all shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-[3px] active:shadow-none cursor-pointer"
        >
          New
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type Step = "select" | "read" | "result";

export default function SpeakingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep]             = useState<Step>("select");
  const [theme, setTheme]           = useState<Theme>("business");
  const [paragraphs, setParagraphs] = useState(2);
  const [genre, setGenre]           = useState("");
  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [transcript, setTranscript] = useState("");

  const generateMutation = trpc.ai.generateReadingText.useMutation({
    onSuccess: (data) => {
      setReadingText(data);
      setStep("read");
    },
  });

  function handleGenerate() {
    generateMutation.mutate({ theme, paragraphs, genre: genre || undefined });
  }

  function handleRecordingDone(t: string) {
    setTranscript(t);
    setStep("result");
  }

  function handleTryAgain() {
    setTranscript("");
    setStep("read");
  }

  function handleNewText() {
    setTranscript("");
    setReadingText(null);
    setStep("select");
  }

  // Tiap pindah step, kembalikan scroll ke atas — tanpa ini user mendarat di tengah halaman
  useEffect(() => {
    rootRef.current?.closest("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  return (
    <div ref={rootRef} className="w-full p-4 md:p-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-5 sm:mb-8">
        {(["select", "read", "result"] as Step[]).map((s, i) => {
          const stepIndex   = ["select", "read", "result"].indexOf(step);
          const thisIndex   = i;
          const isDone      = stepIndex > thisIndex;
          const isCurrent   = step === s;
          const labels      = ["Choose", "Read", "Results"];
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isCurrent ? "bg-primary-100 text-primary-700 dark:text-primary-300" :
                isDone    ? "bg-emerald-100 text-emerald-700 dark:text-emerald-400" :
                "bg-[var(--surface-strong)] text-[var(--foreground)]/40"
              }`}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                {labels[i]}
              </div>
              {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-[var(--foreground)]/35 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {generateMutation.error && (
        <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600">
          {generateMutation.error.message}
        </div>
      )}

      {step === "select" && (
        <SelectStep
          theme={theme}
          setTheme={setTheme}
          paragraphs={paragraphs}
          setParagraphs={setParagraphs}
          genre={genre}
          setGenre={setGenre}
          onGenerate={handleGenerate}
          isGenerating={generateMutation.isPending}
        />
      )}

      {step === "read" && readingText && (
        <ReadingStep
          text={readingText}
          onRecordingDone={handleRecordingDone}
          onReset={handleNewText}
        />
      )}

      {step === "result" && readingText && (
        <ResultStep
          text={readingText}
          transcript={transcript}
          onTryAgain={handleTryAgain}
          onNewText={handleNewText}
        />
      )}
    </div>
  );
}
