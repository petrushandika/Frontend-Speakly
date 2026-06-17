"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { createClient } from "@/lib/supabase/client";
import {
  Mic, MicOff, BookOpen, RefreshCw, Play,
  CheckCircle2, XCircle, ChevronRight,
  Loader2, Star, BookMarked, Lightbulb, Zap,
  Globe, Coffee, Cpu, FlaskConical, Palette,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = "business" | "technology" | "travel" | "daily_life" | "science" | "culture";

interface ReadingText {
  title: string;
  theme: string;
  cefrLevel: string;
  paragraphs: string[];
  wordCount: number;
  keyVocabulary: Array<{ word: string; definition: string; indonesian: string; ipa: string }>;
  readingTips: string;
}

interface WordResult {
  word: string;
  correct: boolean;
  expected: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const THEMES: { id: Theme; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { id: "business",    label: "Business",    icon: Zap,          color: "bg-blue-50 border-blue-200 text-blue-700",   desc: "Professional scenarios" },
  { id: "technology",  label: "Technology",  icon: Cpu,          color: "bg-violet-50 border-violet-200 text-violet-700", desc: "Tech & innovation" },
  { id: "travel",      label: "Travel",      icon: Globe,        color: "bg-emerald-50 border-emerald-200 text-emerald-700", desc: "Exploration & culture" },
  { id: "daily_life",  label: "Daily Life",  icon: Coffee,       color: "bg-amber-50 border-amber-200 text-amber-700", desc: "Everyday situations" },
  { id: "science",     label: "Science",     icon: FlaskConical, color: "bg-cyan-50 border-cyan-200 text-cyan-700",   desc: "Discovery & research" },
  { id: "culture",     label: "Culture",     icon: Palette,      color: "bg-pink-50 border-pink-200 text-pink-700",   desc: "Arts & traditions" },
];

const PARAGRAPH_OPTIONS = [
  { value: 1, label: "1 paragraph", sub: "~175 words · Quick practice" },
  { value: 2, label: "2 paragraphs", sub: "~350 words · Standard" },
  { value: 3, label: "3 paragraphs", sub: "~560 words · Full session" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeWord(w: string) {
  return w.toLowerCase().replace(/[^a-z']/g, "");
}

function compareTranscript(original: string, transcript: string): WordResult[] {
  const origWords = original.split(/\s+/).filter(Boolean);
  const transcriptWords = transcript.split(/\s+/).filter(Boolean);
  return origWords.map((word, i) => {
    const expected = normalizeWord(word);
    const spoken   = normalizeWord(transcriptWords[i] ?? "");
    return { word, expected, correct: expected === spoken };
  });
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
  onGenerate, isGenerating,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  paragraphs: number;
  setParagraphs: (n: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="w-full space-y-8 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reading Aloud Practice</h1>
          <p className="text-sm text-slate-500">AI generates a passage — you read it aloud, we score your pronunciation</p>
        </div>
      </div>

      {/* Theme picker */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Choose a theme</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  active
                    ? "border-primary-500 bg-primary-50 shadow-sm"
                    : "border-transparent bg-white hover:border-slate-200 hover:shadow-sm"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${t.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${active ? "text-primary-700" : "text-slate-700"}`}>{t.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Length picker */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Passage length</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {PARAGRAPH_OPTIONS.map((opt) => {
            const active = paragraphs === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setParagraphs(opt.value)}
                className={`px-4 py-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  active
                    ? "border-primary-500 bg-primary-50"
                    : "border-transparent bg-white hover:border-slate-200"
                }`}
              >
                <p className={`text-sm font-bold ${active ? "text-primary-700" : "text-slate-700"}`}>{opt.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{opt.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-md shadow-primary-500/20 transition-all active:scale-[0.99]"
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
  const [error, setError]               = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: profile } = trpc.users.getProfile.useQuery();

  const fullText = text.paragraphs.join(" ");

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        setIsProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

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
          if (data.transcript) {
            onRecordingDone(data.transcript);
          } else {
            setError("Could not transcribe audio. Please try again.");
          }
        } catch {
          setError("Transcription failed. Check your connection and try again.");
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach((t) => t.stop());
        }
      };
      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
      setError(null);
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <div className="w-full space-y-5">
      {/* Text header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">Read Aloud</p>
          <h2 className="text-xl font-bold text-slate-900">{text.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{text.wordCount} words · CEFR {text.cefrLevel}</p>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700 bg-white border border-slate-100 hover:border-slate-200 px-3 py-1.5 rounded-xl transition-all"
        >
          New text
        </button>
      </div>

      {/* Reading tip */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">{text.readingTips}</p>
      </div>

      {/* Passage */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        {text.paragraphs.map((p, i) => (
          <p key={i} className="text-slate-800 leading-8 text-base tracking-wide">
            {p}
          </p>
        ))}
      </div>

      {/* Key vocabulary */}
      {text.keyVocabulary.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Key Vocabulary</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {text.keyVocabulary.map((v) => (
              <div key={v.word} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                <BookMarked className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{v.word} <span className="text-xs font-normal text-slate-400">{v.ipa}</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">{v.definition}</p>
                  <p className="text-xs text-primary-600 font-semibold mt-0.5">{v.indonesian}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Record controls */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col items-center gap-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">
          {isProcessing ? "Processing your recording…" : isRecording ? "Recording — read the passage above" : "Press the mic and read the passage aloud"}
        </p>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 ${
            isProcessing
              ? "bg-slate-100 cursor-not-allowed focus:ring-slate-200"
              : isRecording
                ? "bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-110"
                : "bg-primary-600 hover:bg-primary-700 focus:ring-primary-300"
          }`}
        >
          {isRecording && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />}
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
        <p className="text-xs text-slate-400">
          {isRecording ? "Tap to stop recording" : isProcessing ? "Please wait…" : "Tap to start recording"}
        </p>
      </div>
    </div>
  );
}

// ── Step: Results ──────────────────────────────────────────────────────────────

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
  const fullText = text.paragraphs.join(" ");
  const wordResults = compareTranscript(fullText, transcript);
  const score = calcScore(wordResults);

  const correct   = wordResults.filter((r) => r.correct).length;
  const incorrect = wordResults.filter((r) => !r.correct).length;

  const scoreColor =
    score >= 85 ? "text-emerald-600" :
    score >= 65 ? "text-amber-600"  :
    "text-red-600";
  const scoreBg =
    score >= 85 ? "bg-emerald-50 border-emerald-200" :
    score >= 65 ? "bg-amber-50 border-amber-200" :
    "bg-red-50 border-red-200";

  const scoreLabel =
    score >= 90 ? "Excellent! Near-native accuracy" :
    score >= 75 ? "Great pronunciation!" :
    score >= 60 ? "Good effort — keep practicing" :
    "Needs more practice — try again";

  return (
    <div className="w-full space-y-6">
      {/* Score card */}
      <div className={`rounded-2xl border p-6 text-center ${scoreBg}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className={`w-5 h-5 ${scoreColor}`} />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pronunciation Score</p>
        </div>
        <p className={`text-6xl font-black ${scoreColor}`}>{score}<span className="text-2xl font-bold text-slate-400">%</span></p>
        <p className={`text-sm font-semibold mt-2 ${scoreColor}`}>{scoreLabel}</p>

        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-emerald-700">{correct}</span>
            <span className="text-slate-500">correct</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="font-bold text-red-700">{incorrect}</span>
            <span className="text-slate-500">incorrect</span>
          </div>
        </div>
      </div>

      {/* Word-by-word result */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Word-by-word result</p>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 leading-9 shadow-sm">
          {wordResults.map((r, i) => (
            <span
              key={i}
              className={`inline-block mr-1 px-1 rounded font-medium ${
                r.correct
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-red-700 bg-red-50 line-through decoration-red-400"
              }`}
              title={r.correct ? "Correct!" : `Expected: "${r.expected}"`}
            >
              {r.word}
            </span>
          ))}
        </div>
        {incorrect > 0 && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            Red strikethrough words were not recognized — try pronouncing them more clearly
          </p>
        )}
      </div>

      {/* Your transcript */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">What we heard</p>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed italic">
          {transcript || "No speech detected"}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onTryAgain}
          className="flex-1 py-3.5 bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 text-slate-700 hover:text-primary-700 font-bold rounded-2xl transition-all"
        >
          Retry
        </button>
        <button
          onClick={onNewText}
          className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-md shadow-primary-500/15 transition-all"
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
  const [step, setStep]             = useState<Step>("select");
  const [theme, setTheme]           = useState<Theme>("business");
  const [paragraphs, setParagraphs] = useState(2);
  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [transcript, setTranscript] = useState("");

  const generateMutation = trpc.ai.generateReadingText.useMutation({
    onSuccess: (data) => {
      setReadingText(data);
      setStep("read");
    },
  });

  function handleGenerate() {
    generateMutation.mutate({ theme, paragraphs });
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

  return (
    <div className="w-full p-6 md:p-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["select", "read", "result"] as Step[]).map((s, i) => {
          const stepIndex   = ["select", "read", "result"].indexOf(step);
          const thisIndex   = i;
          const isDone      = stepIndex > thisIndex;
          const isCurrent   = step === s;
          const labels      = ["Choose", "Read", "Results"];
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isCurrent ? "bg-primary-100 text-primary-700" :
                isDone    ? "bg-emerald-100 text-emerald-700" :
                "bg-slate-100 text-slate-400"
              }`}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                {labels[i]}
              </div>
              {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {generateMutation.error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {generateMutation.error.message}
        </div>
      )}

      {step === "select" && (
        <SelectStep
          theme={theme}
          setTheme={setTheme}
          paragraphs={paragraphs}
          setParagraphs={setParagraphs}
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
