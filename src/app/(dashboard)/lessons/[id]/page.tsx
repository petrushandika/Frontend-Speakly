"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SearchX, Lightbulb, ChevronRight, Eye, EyeOff, Check, X, BookmarkPlus, BookmarkCheck } from "lucide-react";

function parseInlineMarkdown(text: string) {
  if (!text) return "";
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-extrabold text-[var(--foreground)]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic text-[var(--foreground)] font-semibold">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const rendered: React.ReactNode[] = [];
  
  let codeBlockLines: string[] = [];
  let inCodeBlock = false;

  lines.forEach((line, index) => {
    // Code block boundary check
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        const codeContent = codeBlockLines.join("\n");
        rendered.push(
          <pre key={`code-${index}`} className="font-mono bg-slate-950 text-slate-100 p-4 rounded-2xl whitespace-pre overflow-x-auto text-xs md:text-sm my-3 border border-slate-800 shadow-inner">
            {codeContent}
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Headers
    if (line.startsWith("### ")) {
      rendered.push(
        <h3 key={`h3-${index}`} className="text-sm md:text-base font-bold text-[var(--foreground)] mt-4 mb-2 first:mt-0">
          {parseInlineMarkdown(line.slice(4))}
        </h3>
      );
      return;
    }
    if (line.startsWith("## ")) {
      rendered.push(
        <h2 key={`h2-${index}`} className="text-base md:text-lg font-extrabold text-[var(--foreground)] mt-5 mb-2.5 first:mt-0">
          {parseInlineMarkdown(line.slice(3))}
        </h2>
      );
      return;
    }
    if (line.startsWith("# ")) {
      rendered.push(
        <h1 key={`h1-${index}`} className="text-lg md:text-xl font-black text-[var(--foreground)] mt-6 mb-3 first:mt-0">
          {parseInlineMarkdown(line.slice(2))}
        </h1>
      );
      return;
    }

    // List items
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const content = line.trim().slice(2);
      rendered.push(
        <div key={`li-${index}`} className="flex items-start gap-2 ml-4 my-1">
          <span className="w-1.5 h-1.5 bg-[var(--foreground)]/40 rounded-full mt-2 shrink-0" />
          <p className="text-[var(--foreground)]/80 text-sm md:text-base leading-relaxed font-medium">
            {parseInlineMarkdown(content)}
          </p>
        </div>
      );
      return;
    }

    // Regular line
    if (line.trim() === "") {
      rendered.push(<div key={`empty-${index}`} className="h-2" />);
    } else {
      rendered.push(
        <p key={`p-${index}`} className="text-[var(--foreground)]/80 text-sm md:text-base leading-relaxed font-medium">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  });

  return rendered;
}


// ── Grammar highlighting ──────────────────────────────────────────────────────

type GrammarRole = "subject" | "verb" | "object" | "adverb" | "complement" | "neutral";

interface GrammarPart { text: string; role: GrammarRole }

const ROLE_STYLE: Record<GrammarRole, string> = {
  subject:    "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold",
  verb:       "bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:text-primary-200 border border-primary-300 dark:border-primary-700 font-bold",
  object:     "bg-sky-100 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200 border border-sky-300 dark:border-sky-700 font-bold",
  adverb:     "bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-200 border border-violet-300 dark:border-violet-700 font-bold",
  complement: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold",
  neutral:    "text-[var(--foreground)] font-semibold",
};

function GrammarToken({ text, role }: { text: string; role: GrammarRole }) {
  if (role === "neutral") {
    return <span className="text-sm text-[var(--foreground)] font-semibold">{text} </span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-sm ${ROLE_STYLE[role]}`}
      title={role.charAt(0).toUpperCase() + role.slice(1)}
    >
      {text}
    </span>
  );
}

// Lightweight heuristic: detects subject pronoun / noun phrase, auxiliary + main verb, object/adverb
function parseGrammar(sentence: string): GrammarPart[] {
  const clean = sentence.replace(/[""]/g, '"').trim();
  // Remove trailing punctuation for analysis, add back at end
  const punct = /[.?!,;:]$/.test(clean) ? clean.slice(-1) : "";
  const text  = punct ? clean.slice(0, -1) : clean;

  const words = text.split(/\s+/);
  if (words.length < 2) return [{ text: clean, role: "neutral" }];

  // Subject pronouns / common short NPs
  const subjectPronouns = new Set(["i","you","he","she","it","we","they","this","that","these","those"]);
  const auxiliaries     = new Set(["am","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","shall","should","may","might","can","could","must","need","dare","ought"]);
  const adverbials      = new Set(["yesterday","today","tomorrow","always","never","often","sometimes","usually","already","still","just","soon","now","here","there","however","therefore","moreover","finally","lastly","firstly","then","ago","later","early","late","soon","daily","weekly","monthly"]);
  const prepositions    = new Set(["to","in","on","at","from","for","of","with","by","about","between","among","into","onto","through","during","before","after","above","below","under","over","since","until","despite","along","across","without"]);

  const parts: GrammarPart[] = [];
  let i = 0;

  // Detect subject: first 1-3 words if pronoun / "the/a + noun"
  let subjectEnd = 0;
  if (subjectPronouns.has(words[0].toLowerCase())) {
    subjectEnd = 1;
  } else if (
    words.length > 1 &&
    ["the","a","an","my","your","his","her","its","our","their"].includes(words[0].toLowerCase())
  ) {
    subjectEnd = 2; // "the cat"
  }

  if (subjectEnd > 0) {
    parts.push({ text: words.slice(0, subjectEnd).join(" "), role: "subject" });
    i = subjectEnd;
  }

  // Detect verb phrase: aux? + main verb
  if (i < words.length) {
    let verbEnd = i;
    // Collect auxiliaries
    while (verbEnd < words.length && auxiliaries.has(words[verbEnd].toLowerCase())) {
      verbEnd++;
    }
    // One more word = main verb (if not preposition or adverb)
    if (verbEnd < words.length && !prepositions.has(words[verbEnd].toLowerCase()) && !adverbials.has(words[verbEnd].toLowerCase())) {
      verbEnd++;
    }
    if (verbEnd > i) {
      parts.push({ text: words.slice(i, verbEnd).join(" "), role: "verb" });
      i = verbEnd;
    }
  }

  // Remaining: detect adverbials at end, rest is object/complement
  if (i < words.length) {
    const remaining = words.slice(i);
    // Check if last 1-2 words are adverbials or prepositional phrases starting with preposition
    let advStart = remaining.length;
    // Trailing adverbial: "every day", "last year", "in London", "yesterday", etc.
    if (
      remaining.length >= 1 &&
      (adverbials.has(remaining[remaining.length - 1].toLowerCase()) ||
       (remaining.length >= 2 && prepositions.has(remaining[remaining.length - 2].toLowerCase())))
    ) {
      advStart = remaining.length >= 2 && prepositions.has(remaining[remaining.length - 2].toLowerCase())
        ? remaining.length - 2
        : remaining.length - 1;
    }

    const objectPart = remaining.slice(0, advStart).join(" ");
    const advPart    = remaining.slice(advStart).join(" ");

    if (objectPart) parts.push({ text: objectPart, role: "object" });
    if (advPart)    parts.push({ text: advPart + punct, role: "adverb" });
    else if (objectPart && punct) parts[parts.length - 1].text += punct;
  } else if (punct && parts.length > 0) {
    parts[parts.length - 1].text += punct;
  }

  // Fallback: if we only produced subject or nothing, return neutral
  if (parts.length <= 1 && parts[0]?.role === "subject") {
    return [{ text: clean, role: "neutral" }];
  }

  return parts.length > 0 ? parts : [{ text: clean, role: "neutral" }];
}

// ─────────────────────────────────────────────────────────────────────────────

type Section = {
  type: "explanation" | "examples" | "tip";
  text?: string;
  items?: { en: string; id: string }[];
};

type Exercise = { question: string; answer: string };

type LessonContent = {
  sections?: Section[];
  exercises?: Exercise[];
};

export default function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const utils = trpc.useUtils();
  const { data: lesson, isLoading } = trpc.lessons.getById.useQuery({ id });
  const { data: profile } = trpc.users.getProfile.useQuery();
  const complete = trpc.lessons.complete.useMutation({
    onSuccess: () => {
      // Invalidate all relevant caches so dashboard, progress, lessons list all update
      utils.lessons.getAll.invalidate();
      utils.progress.getSummary.invalidate();
      utils.users.getProfile.invalidate();
      toast.success("Progress saved!");
    },
  });

  const [savedExamples, setSavedExamples] = useState<Set<number>>(new Set());
  const saveVocab = trpc.vocabulary.add.useMutation({
    onSuccess: (_, vars) => {
      utils.vocabulary.getAll.invalidate();
      utils.vocabulary.getStudyList.invalidate();
      toast.success(`"${vars.word}" saved to vocabulary!`);
    },
    onError: () => toast.error("Failed to save word"),
  });

  function saveExample(exIndex: number, enText: string, idText?: string) {
    const phrase = enText.split("\n")[0].trim().replace(/\.$/, "");
    if (!phrase) return;
    setSavedExamples((prev) => new Set([...prev, exIndex]));
    const definition = idText?.trim() || ("From lesson: " + (lesson?.title ?? ""));
    saveVocab.mutate({ word: phrase, definition, example: enText });
  }

  // For B1+: translations hidden by default (immersion), user can reveal
  // For A1/A2: translations always visible
  const cefrLevel = profile?.cefrLevel ?? "B1";
  const isBeginnerLevel = cefrLevel === "A1" || cefrLevel === "A2";
  const [showTranslations, setShowTranslations] = useState(isBeginnerLevel);

  // Exercise states
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Score calculation
  const calculateScore = () => {
    if (!lesson) return 0;
    const exercises = (lesson.content as LessonContent).exercises ?? [];
    if (exercises.length === 0) return 100; // default to 100 if no exercises

    let correct = 0;
    exercises.forEach((ex, i) => {
      const userAnswer = (answers[i] || "").trim().toLowerCase();
      const correctAnswer = ex.answer.trim().toLowerCase();
      if (userAnswer === correctAnswer) correct++;
    });
    return Math.round((correct / exercises.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="w-full p-3 md:p-8 space-y-4">
        <div className="h-6 w-24 bg-[var(--surface)]/60 border border-[var(--line-soft)] rounded-xl animate-pulse" />
        <div className="h-40 bg-[var(--surface-strong)] border-2 border-[var(--line)] rounded-3xl animate-pulse" />
        <div className="h-64 bg-[var(--surface-strong)] border-2 border-[var(--line)] rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="w-full p-3 md:p-8 text-center py-16 bg-[var(--surface-strong)] border-2 border-[var(--line)] rounded-3xl shadow-sm flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface)] flex items-center justify-center">
          <SearchX className="w-6 h-6 text-[var(--foreground)]/40" />
        </div>
        <h3 className="font-bold text-[var(--foreground)]">Lesson Not Found</h3>
        <p className="text-[var(--foreground)]/40 text-sm mt-1">We couldn&apos;t retrieve the requested lesson details.</p>
        <button
          onClick={() => router.push("/lessons")}
          className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all"
        >
          Back to Lessons
        </button>
      </div>
    );
  }

  const content = lesson.content as LessonContent;
  const sections = content.sections ?? [];
  const exercises = content.exercises ?? [];

  return (
    <div className="w-full p-3 md:p-8 space-y-4 md:space-y-6">
      {/* Top Navigation & Header */}
      <div className="space-y-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs font-semibold">
          <Link href="/home" className="text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 text-[var(--foreground)]/25 shrink-0" />
          <Link href="/lessons" className="text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70 transition-colors">Lessons</Link>
          <ChevronRight className="w-3 h-3 text-[var(--foreground)]/25 shrink-0" />
          <span className="text-[var(--foreground)]/70 truncate max-w-[200px] md:max-w-sm">{lesson.title}</span>
        </nav>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-primary-100 border border-primary-200 text-primary-700 dark:text-primary-300 rounded-md">
            {lesson.cefrLevel}
          </span>
          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[var(--surface-strong)] border border-[var(--line)] text-[var(--foreground)]/55 rounded-md uppercase tracking-wider">
            {lesson.category}
          </span>
        </div>
        
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight leading-snug flex-1 min-w-0">
            {lesson.title}
          </h1>
          {/* Translation toggle for B1+ */}
          {!isBeginnerLevel && (
            <button
              onClick={() => setShowTranslations((v) => !v)}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                showTranslations
                  ? "bg-primary-50 dark:bg-primary-900/30 border-primary-200 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40"
                  : "bg-[var(--surface-strong)] border-[var(--line)] text-[var(--foreground)]/55 hover:text-[var(--foreground)] hover:border-[var(--line-soft)]"
              }`}
            >
              {showTranslations
                ? <><EyeOff className="w-3.5 h-3.5 shrink-0" /><span className="hidden sm:inline"> Sembunyikan terjemahan</span><span className="sm:hidden">Hide</span></>
                : <><Eye className="w-3.5 h-3.5 shrink-0" /><span className="hidden sm:inline"> Lihat terjemahan</span><span className="sm:hidden">Show</span></>
              }
            </button>
          )}
        </div>
        {lesson.description && (
          <p className="text-[var(--foreground)]/55 text-sm leading-relaxed max-w-2xl">{lesson.description}</p>
        )}
        {isBeginnerLevel && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-400 font-semibold">
            Terjemahan Bahasa Indonesia selalu ditampilkan untuk level {cefrLevel}
          </div>
        )}
      </div>

      {/* Content sections */}
      {sections.length > 0 ? (
        <div className="bg-[var(--surface-strong)] rounded-3xl border-2 border-[var(--line)] p-3 md:p-8 space-y-4 md:space-y-6 shadow-sm">
          {sections.map((section, i) => {
            if (section.type === "explanation" && section.text) {
              return (
                <div key={i} className="space-y-3">
                  <h2 className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full inline-block" />
                    Explanation
                  </h2>
                  <div className="space-y-2 min-w-0 overflow-x-hidden">
                    {renderMarkdown(section.text)}
                  </div>
                </div>
              );
            }
            if (section.type === "examples" && section.items) {
              return (
                <div key={i} className="space-y-4 pt-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-primary-500 rounded-full inline-block" />
                      Examples
                    </h2>
                    {/* Grammar legend */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: "Subject",   cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700" },
                        { label: "Verb",      cls: "bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 border-primary-200 dark:border-primary-700" },
                        { label: "Object",    cls: "bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-700" },
                        { label: "Adverb",    cls: "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-700" },
                      ].map((t) => (
                        <span key={t.label} className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${t.cls}`}>
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ul className="grid grid-cols-1 gap-3">
                    {section.items.map((ex, j) => {
                      const isCode = ex.en.includes("\n");
                      const parts = isCode ? null : parseGrammar(ex.en);
                      const isSaved = savedExamples.has(j);
                      return (
                        <li key={j} className="bg-[var(--surface-strong)] border-2 border-[var(--line)] rounded-2xl overflow-hidden">
                          {/* Number strip */}
                          <div className="flex items-stretch">
                            <div className="w-9 bg-[var(--surface-strong)] border-r border-[var(--line)] flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-black text-[var(--foreground)]/40">{j + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0 px-4 py-3.5 space-y-2.5 overflow-x-hidden">
                              {isCode ? (
                                <pre className="font-mono bg-stone-950 text-stone-100 p-3 rounded-xl whitespace-pre overflow-x-auto text-xs border border-stone-800 shadow-inner">
                                  {ex.en}
                                </pre>
                              ) : parts ? (
                                <div className="flex flex-wrap gap-1.5 items-baseline">
                                  {parts.map((p, k) => (
                                    <GrammarToken key={k} text={p.text} role={p.role} />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-[var(--foreground)] leading-relaxed">{ex.en}</p>
                              )}

                              {showTranslations && ex.id && (
                                <div className={`flex items-start gap-2 pt-1 border-t ${isBeginnerLevel ? "border-amber-200" : "border-[var(--line)]"}`}>
                                  <span className={`text-[9px] font-black uppercase tracking-wider shrink-0 mt-0.5 ${isBeginnerLevel ? "text-amber-600 dark:text-amber-400" : "text-[var(--foreground)]/40"}`}>ID</span>
                                  <p className={`text-xs leading-relaxed italic ${isBeginnerLevel ? "text-amber-800 font-semibold" : "text-[var(--foreground)]/55 font-medium"}`}>
                                    {ex.id}
                                  </p>
                                </div>
                              )}

                              {/* Save to vocabulary */}
                              {!isCode && (
                                <button
                                  onClick={() => saveExample(j, ex.en, ex.id)}
                                  disabled={isSaved}
                                  className={`flex items-center gap-1 text-[10px] font-bold transition-all ${
                                    isSaved
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-[var(--foreground)]/30 hover:text-primary-500"
                                  }`}
                                >
                                  {isSaved
                                    ? <><BookmarkCheck className="w-3 h-3" /> Saved to vocab</>
                                    : <><BookmarkPlus className="w-3 h-3" /> Save to vocab</>}
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            }
            if (section.type === "tip" && section.text) {
              return (
                <div key={i} className="bg-gradient-to-tr from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4.5 shadow-sm">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wider mb-1">
                    <Lightbulb className="w-3.5 h-3.5" /> Tip / Remember
                  </p>
                  <div className="space-y-1.5 text-xs md:text-sm text-[var(--foreground)]/80 leading-relaxed font-semibold">
                    {renderMarkdown(section.text)}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      ) : (
        <div className="bg-[var(--surface-strong)] rounded-3xl border-2 border-[var(--line)] p-4 sm:p-8 text-center shadow-sm">
          <p className="text-[var(--foreground)]/40 text-sm py-4">Lesson content is currently being updated...</p>
        </div>
      )}

      {/* Exercises */}
      {exercises.length > 0 && (
        <div className="bg-[var(--surface-strong)] rounded-3xl border-2 border-[var(--line)] p-3 md:p-8 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full inline-block" />
            Practice Exercises
          </h2>
          <div className="space-y-4">
            {exercises.map((ex, i) => {
              const userAnswer = (answers[i] || "").trim().toLowerCase();
              const correctAnswer = ex.answer.trim().toLowerCase();
              const isCorrect = userAnswer === correctAnswer;

              return (
                <div key={i} className={`border rounded-2xl p-4.5 space-y-3 transition-all duration-200 ${
                  submitted 
                    ? isCorrect 
                      ? "bg-emerald-50/50 border-emerald-200" 
                      : "bg-red-50/50 border-red-200"
                    : "bg-[var(--surface)] border-[var(--line-soft)] hover:bg-[var(--surface-strong)] hover:border-primary-200 dark:hover:border-primary-700"
                }`}>
                  <p className="text-sm text-[var(--foreground)] font-extrabold leading-relaxed">
                    {i + 1}. {ex.question.replace("___", "______")}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="text"
                      value={answers[i] || ""}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                      disabled={submitted}
                      placeholder="Type your answer..."
                      className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        submitted
                          ? isCorrect
                            ? "bg-emerald-100/50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                            : "bg-red-100/50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
                          : "bg-[var(--surface-strong)] border-[var(--line)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 placeholder:font-normal"
                      }`}
                    />
                    
                    {submitted && (
                      <div className="flex items-center gap-2 px-1">
                        {isCorrect ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg">
                            <Check className="w-3.5 h-3.5" /> Correct
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-lg">
                              <X className="w-3.5 h-3.5" /> Incorrect
                            </span>
                            <span className="text-xs font-semibold text-[var(--foreground)]/55">
                              Answer: <span className="text-[var(--foreground)] font-bold">{ex.answer}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!submitted && (
            <div className="pt-2">
              <button
                onClick={() => {
                  setSubmitted(true);
                  // Auto-save progress when answers are checked
                  const finalScore = calculateScore();
                  const xpEarned = Math.max(10, Math.round((finalScore / 100) * 50));
                  complete.mutate({ lessonId: id, score: finalScore, xpEarned });
                }}
                disabled={Object.keys(answers).length < exercises.length || complete.isPending}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-2xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {complete.isPending ? "Saving…" : "Check Answers"}
              </button>
              {Object.keys(answers).length < exercises.length && (
                <p className="text-center text-xs text-[var(--foreground)]/40 mt-3 font-medium">Please answer all questions before checking.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Score + continue — shown after exercises checked */}
      {(!exercises.length || submitted) && (
        <div className="pt-2">
          {submitted && exercises.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 bg-primary-50 dark:bg-primary-900/30 rounded-2xl mb-4 border border-primary-100 dark:border-primary-800">
              <span className="text-sm font-bold text-primary-900 dark:text-primary-200">Your Score</span>
              <span className="text-2xl font-extrabold text-primary-600">{calculateScore()}%</span>
            </div>
          )}
          {/* Lesson with no exercises — still need to explicitly complete */}
          {!exercises.length && (
            <button
              onClick={() => complete.mutate({ lessonId: id, score: 100, xpEarned: 20 })}
              disabled={complete.isPending}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {complete.isPending ? "Saving…" : "Mark as Complete"}
            </button>
          )}
          {submitted && (
            <div className="flex gap-3">
              <button
                onClick={() => { setAnswers({}); setSubmitted(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex-1 py-3.5 bg-[var(--surface-strong)] border border-[var(--line)] hover:border-primary-400 text-[var(--foreground)] font-bold text-sm rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/lessons")}
                className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] cursor-pointer"
              >
                Back to Lessons
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
