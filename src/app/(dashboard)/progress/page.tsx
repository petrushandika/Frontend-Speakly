"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc";

const ChartsSection = dynamic(() => import("./ChartsSection"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[280px] rounded-[22px] bg-slate-100 animate-pulse" />
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
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
      <TrendingDown className="w-3 h-3" /> Improving
    </span>
  );
  if (trend === "needs_attention") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700">
      <TrendingUp className="w-3 h-3" /> More errors
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-[var(--surface)] border border-[var(--line-soft)] text-stone-500">
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
    <div className="w-full p-6 md:p-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Your Progress</h1>
          <p className="text-sm text-stone-500">AI-powered analysis of your English learning journey.</p>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Trophy,   bg: "bg-primary-50",  color: "text-primary-600", label: "CEFR Level",   value: cefr },
          { icon: Star,     bg: "bg-amber-50",    color: "text-amber-600",   label: "Total XP",     value: xp.toLocaleString() },
          { icon: Flame,    bg: "bg-orange-50",   color: "text-orange-500",  label: "Day Streak",   value: `${streak} days` },
          { icon: BookOpen, bg: "bg-emerald-50",  color: "text-emerald-600", label: "Lessons Done", value: recent.length.toString() },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-stone-400 font-medium">{s.label}</p>
              <p className="text-base font-bold text-stone-900 truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CEFR Level Progression (full width) ── */}
      <div className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <Target className="w-4.5 h-4.5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 text-sm">Level Progression</h2>
              <p className="text-xs text-stone-400 mt-0.5">
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
          <div className="flex justify-between text-xs font-semibold text-stone-500">
            <span className="px-2 py-0.5 bg-primary-50 border border-primary-100 text-primary-700 rounded-md font-bold">{cefr}</span>
            {nextCefr && <span className="px-2 py-0.5 bg-slate-100 border border-[var(--line-soft)] text-stone-500 rounded-md font-bold">{nextCefr}</span>}
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-700"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          {nextCefr && (
            <p className="text-xs text-stone-400">
              {(xpForNext - xp).toLocaleString()} XP remaining to reach {nextCefr}
            </p>
          )}
        </div>

        {/* Mini stats row */}
        {learningCtx && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
            {[
              { label: "Vocabulary", value: `${learningCtx.vocabularySize} words`, sub: `${learningCtx.avgMastery}% avg mastery`, icon: BookMarked, color: "text-sky-500", bg: "bg-sky-50" },
              { label: "Lessons Done", value: `${learningCtx.lessonsCompleted}`, sub: "completed", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
              { label: "Grammar Errors", value: `${analytics?.totalThisWeek ?? 0}`, sub: "this week", icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50" },
              { label: "Weak Area", value: analytics?.topCategory ? (ERROR_LABEL[analytics.topCategory] ?? analytics.topCategory) : "—", sub: "most frequent", icon: TrendingDown, color: "text-amber-500", bg: "bg-amber-50" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface)] border border-slate-100 rounded-xl">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-stone-400 font-medium truncate">{item.label}</p>
                  <p className="text-sm font-bold text-stone-900 truncate">{item.value}</p>
                  <p className="text-[10px] text-stone-400 truncate">{item.sub}</p>
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
              <Lightbulb className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 text-sm">Recommended for You</h2>
              <p className="text-xs text-stone-400 mt-0.5">Lessons selected based on your grammar error patterns</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {recommendations.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                href={`/lessons/${r.id}`}
                className="flex flex-col gap-2.5 p-4 bg-[var(--surface)] border border-slate-100 rounded-[18px] hover:border-primary-200 hover:bg-white hover:shadow-sm transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-800 group-hover:text-primary-700 leading-snug">{r.title}</p>
                  <p className="text-[10px] text-stone-400 mt-1 leading-snug">{r.reason}</p>
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
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <History className="w-4.5 h-4.5 text-stone-500" />
          </div>
          <div>
            <h2 className="font-bold text-stone-900 text-sm">Recently Completed</h2>
            <p className="text-xs text-stone-400 mt-0.5">Your latest lessons and practice sessions</p>
          </div>
        </div>

        {recent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {recent.slice(0, 9).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-[var(--surface)] border border-slate-100 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-xs font-semibold text-stone-700 truncate flex-1 min-w-0">
                  {(p.lesson as { title?: string })?.title ?? "Lesson"}
                </span>
                <span className="text-xs font-bold text-primary-600 shrink-0">+{p.xpEarned} XP</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
            <BookOpen className="w-10 h-10" />
            <p className="text-xs text-stone-400">Complete lessons to see your history here</p>
          </div>
        )}
      </div>

    </div>
  );
}
