"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc";

const ChartsSection = dynamic(() => import("./ChartsSection"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[280px] rounded-[22px] bg-[var(--surface-strong)] animate-pulse" />
      ))}
    </div>
  ),
});
import {
  Trophy, Flame, TrendingUp, TrendingDown, Target, AlertTriangle,
  History, BookOpen, Star, Minus,
  Lightbulb, ArrowRight, CheckCircle2, BookMarked,
} from "lucide-react";

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CEFR_XP: Record<string, number> = {
  A1: 0, A2: 500, B1: 1500, B2: 3500, C1: 7000, C2: 12000,
};
const ERROR_LABEL: Record<string, string> = {
  tense:        "Verb Tense",
  article:      "Articles (a/the)",
  preposition:  "Prepositions",
  subject_verb: "Subject-Verb",
  word_order:   "Word Order",
  vocabulary:   "Vocabulary",
};

function TrendBadge({ trend }: { trend: "improving" | "stable" | "needs_attention" }) {
  if (trend === "improving") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400">
      <TrendingDown className="w-3 h-3" /> Improving
    </span>
  );
  if (trend === "needs_attention") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      <TrendingUp className="w-3 h-3" /> More errors
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-[var(--surface)] border border-[var(--line-soft)] text-[var(--foreground)]/55">
      <Minus className="w-3 h-3" /> Stable
    </span>
  );
}

export default function ProgressPage() {
  const FIVE_MIN = 5 * 60 * 1000;
  const { data: summary }               = trpc.progress.getSummary.useQuery(undefined, { staleTime: 60_000 });
  const { data: recent = [] }           = trpc.progress.getRecentProgress.useQuery(undefined, { staleTime: 60_000 });
  const { data: analytics }             = trpc.ai.getErrorAnalytics.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: recommendations = [] }  = trpc.ai.getRecommendations.useQuery(undefined, { staleTime: FIVE_MIN });
  const { data: learningCtx }           = trpc.ai.getLearningContext.useQuery(undefined, { staleTime: FIVE_MIN });

  const xp     = summary?.xpTotal ?? 0;
  const streak = summary?.streakDays ?? 0;
  const cefr   = summary?.cefrLevel ?? "B1";

  const cefrIdx      = CEFR_ORDER.indexOf(cefr);
  const nextCefr     = CEFR_ORDER[cefrIdx + 1];
  const xpForCurrent = CEFR_XP[cefr] ?? 0;
  const xpForNext    = nextCefr ? CEFR_XP[nextCefr] : xp;
  const xpProgress   = xpForNext > xpForCurrent
    ? Math.min(100, Math.round(((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100))
    : 100;

  const errorData = Object.entries(analytics?.frequency ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, label: ERROR_LABEL[name] ?? name.replace(/_/g, " "), count }));

  const trendData = Object.entries(analytics?.dailyCounts ?? {}).map(([date, count]) => ({
    date: date.slice(5),
    count,
  }));

  const skillScores: Record<string, number> = {
    Grammar: 0, Vocabulary: 0, Speaking: 0, Listening: 0, Reading: 0, Writing: 0,
  };
  recent.forEach((p) => {
    const cat = (p.lesson as { category?: string })?.category ?? "";
    const key = cat.charAt(0).toUpperCase() + cat.slice(1);
    if (key in skillScores) skillScores[key] += p.xpEarned ?? 0;
  });
  const maxSkill = Math.max(...Object.values(skillScores), 1);
  const radarData = Object.entries(skillScores).map(([subject, value]) => ({
    subject,
    value: Math.round((value / maxSkill) * 100),
  }));

  const hasTrendData = trendData.some((d) => d.count > 0);

  return (
    <div className="w-full p-3 md:p-8 space-y-4 md:space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Your Progress</h1>
          <p className="text-sm text-[var(--foreground)]/55">AI-powered analysis of your English learning journey.</p>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Trophy,   bg: "bg-primary-50 dark:bg-primary-900/30",  color: "text-primary-600", label: "CEFR Level",   value: cefr },
          { icon: Star,     bg: "bg-amber-50 dark:bg-amber-900/20",    color: "text-amber-600 dark:text-amber-400",   label: "Total XP",     value: xp.toLocaleString() },
          { icon: Flame,    bg: "bg-orange-50 dark:bg-orange-900/20",   color: "text-orange-500",  label: "Day Streak",   value: `${streak} days` },
          { icon: BookOpen, bg: "bg-emerald-50 dark:bg-emerald-900/20",  color: "text-emerald-600 dark:text-emerald-400", label: "Lessons Done", value: recent.length.toString() },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 shadow-sm">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-[var(--foreground)]/40 font-medium">{s.label}</p>
              <p className="text-sm sm:text-base font-bold text-[var(--foreground)] truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CEFR Level Progression (full width) ── */}
      <div className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
              <Target className="w-4.5 h-4.5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-[var(--foreground)] text-sm">Level Progression</h2>
              <p className="text-xs text-[var(--foreground)]/40 mt-0.5">
                {nextCefr ? `${xpProgress}% toward ${nextCefr}` : "Maximum level reached!"}
              </p>
            </div>
          </div>
          {learningCtx?.errorTrend && (
            <TrendBadge trend={learningCtx.errorTrend} />
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-[var(--foreground)]/55">
            <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300 rounded-md font-bold">{cefr}</span>
            {nextCefr && <span className="px-2 py-0.5 bg-[var(--surface-strong)] border border-[var(--line-soft)] text-[var(--foreground)]/55 rounded-md font-bold">{nextCefr}</span>}
          </div>
          <div className="w-full h-3 bg-[var(--surface-strong)] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-700"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          {nextCefr && (
            <p className="text-xs text-[var(--foreground)]/40">
              {(xpForNext - xp).toLocaleString()} XP remaining to reach {nextCefr}
            </p>
          )}
        </div>

        {/* Mini stats row */}
        {learningCtx && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-[var(--line)]">
            {[
              { label: "Vocabulary", value: `${learningCtx.vocabularySize} words`, sub: `${learningCtx.avgMastery}% avg mastery`, icon: BookMarked, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-900/30" },
              { label: "Lessons Done", value: `${learningCtx.lessonsCompleted}`, sub: "completed", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
              { label: "Grammar Errors", value: `${analytics?.totalThisWeek ?? 0}`, sub: "this week", icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
              { label: "Weak Area", value: analytics?.topCategory ? (ERROR_LABEL[analytics.topCategory] ?? analytics.topCategory) : "—", sub: "most frequent", icon: TrendingDown, color: "text-amber-500", bg: "bg-amber-50" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface)] border border-[var(--line)] rounded-xl">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--foreground)]/40 font-medium truncate">{item.label}</p>
                  <p className="text-sm font-bold text-[var(--foreground)] truncate">{item.value}</p>
                  <p className="text-[10px] text-[var(--foreground)]/40 truncate">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Charts row: Grammar | Radar | Trend ── */}
      <ChartsSection
        errorData={errorData}
        radarData={radarData}
        trendData={trendData}
        hasTrendData={hasTrendData}
        analytics={analytics}
      />

      {/* ── Recommendations (full width) ── */}
      {recommendations.length > 0 && (
        <div className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Lightbulb className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-[var(--foreground)] text-sm">Recommended for You</h2>
              <p className="text-xs text-[var(--foreground)]/40 mt-0.5">Lessons selected based on your grammar error patterns</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {recommendations.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                href={`/lessons/${r.id}`}
                className="flex flex-col gap-2.5 p-4 bg-[var(--surface)] border border-[var(--line)] rounded-[18px] hover:border-primary-200 dark:hover:border-primary-700 hover:bg-[var(--surface-strong)] hover:shadow-sm transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--foreground)] group-hover:text-primary-700 dark:group-hover:text-primary-300 dark:hover:text-primary-300 dark:text-primary-300 leading-snug">{r.title}</p>
                  <p className="text-[10px] text-[var(--foreground)]/40 mt-1 leading-snug">{r.reason}</p>
                </div>
                <span className="text-[10px] font-bold text-primary-500 flex items-center gap-1">
                  Start lesson <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent lessons (full width) ── */}
      <div className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface-strong)] flex items-center justify-center shrink-0">
            <History className="w-4.5 h-4.5 text-[var(--foreground)]/55" />
          </div>
          <div>
            <h2 className="font-bold text-[var(--foreground)] text-sm">Recently Completed</h2>
            <p className="text-xs text-[var(--foreground)]/40 mt-0.5">Your latest lessons and practice sessions</p>
          </div>
        </div>

        {recent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {recent.slice(0, 9).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-[var(--surface)] border border-[var(--line)] rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-xs font-semibold text-[var(--foreground)]/80 truncate flex-1 min-w-0">
                  {(p.lesson as { title?: string })?.title ?? "Lesson"}
                </span>
                <span className="text-xs font-bold text-primary-600 shrink-0">+{p.xpEarned} XP</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-[var(--foreground)]/35">
            <BookOpen className="w-10 h-10" />
            <p className="text-xs text-[var(--foreground)]/40">Complete lessons to see your history here</p>
          </div>
        )}
      </div>

    </div>
  );
}
