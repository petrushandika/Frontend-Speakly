"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { trpc } from "@/lib/trpc";
import {
  Trophy,
  Flame,
  TrendingUp,
  Target,
  AlertTriangle,
  History,
  BarChart2,
  BookOpen,
  Layers,
  Star,
} from "lucide-react";

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CEFR_XP: Record<string, number> = {
  A1: 0, A2: 500, B1: 1500, B2: 3500, C1: 7000, C2: 12000,
};

const ERROR_COLOR: Record<string, string> = {
  tense:        "#6366f1",
  article:      "#a855f7",
  preposition:  "#14b8a6",
  subject_verb: "#f43f5e",
  word_order:   "#eab308",
  vocabulary:   "#3b82f6",
};

function CardHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <div>
        <h2 className="font-bold text-slate-900 text-sm">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { data: summary } = trpc.progress.getSummary.useQuery();
  const { data: errors = [] } = trpc.progress.getErrors.useQuery();
  const { data: recent = [] } = trpc.progress.getRecentProgress.useQuery();

  const xp = summary?.xpTotal ?? 0;
  const streak = summary?.streakDays ?? 0;
  const cefr = summary?.cefrLevel ?? "B1";

  const cefrIdx = CEFR_ORDER.indexOf(cefr);
  const nextCefr = CEFR_ORDER[cefrIdx + 1];
  const xpForCurrent = CEFR_XP[cefr] ?? 0;
  const xpForNext = nextCefr ? CEFR_XP[nextCefr] : xp;
  const xpProgress = xpForNext > xpForCurrent
    ? Math.min(100, Math.round(((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100))
    : 100;

  const errorCounts = errors.reduce<Record<string, number>>((acc, e) => {
    const cat = e.errorCategory;
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const errorData = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

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

  const isEmpty = recent.length === 0 && errorData.length === 0;

  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Progress</h1>
          <p className="text-sm text-slate-500">Track your level, skills, and learning history.</p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Trophy,   bg: "bg-primary-50",  color: "text-primary-600", label: "CEFR Level",    value: cefr },
          { icon: Star,     bg: "bg-amber-50",    color: "text-amber-600",   label: "Total XP",      value: xp.toLocaleString() },
          { icon: Flame,    bg: "bg-orange-50",   color: "text-orange-500",  label: "Day Streak",    value: `${streak} days` },
          { icon: BookOpen, bg: "bg-emerald-50",  color: "text-emerald-600", label: "Lessons Done",  value: recent.length.toString() },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              <p className="text-base font-bold text-slate-900 truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left: CEFR + Radar */}
        <div className="space-y-6">
          {/* CEFR progress card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
            <CardHeader
              icon={Target}
              iconBg="bg-primary-50"
              iconColor="text-primary-600"
              title="Level Progression"
              subtitle={nextCefr ? `${xpProgress}% of the way to ${nextCefr}` : "You've reached the highest level"}
            />

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Level {cefr}</span>
                {nextCefr && <span className="text-primary-600 font-bold">{nextCefr}</span>}
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              {nextCefr && (
                <p className="text-xs text-slate-400">
                  {(xpForNext - xp).toLocaleString()} XP remaining to reach level {nextCefr}
                </p>
              )}
            </div>
          </div>

          {/* Skills radar */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
            <CardHeader
              icon={Layers}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              title="Skills Balance"
              subtitle="Your proficiency across 6 core skill areas"
            />
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: "bold", fill: "#94a3b8" }} />
                  <Radar
                    dataKey="value"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Grammar diagnostics + Recent */}
        <div className="space-y-6">
          {/* Grammar diagnostics */}
          {errorData.length > 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
              <CardHeader
                icon={AlertTriangle}
                iconBg="bg-rose-50"
                iconColor="text-rose-500"
                title="Grammar Diagnostics"
                subtitle="Most frequent error categories from conversations"
              />
              <div className="w-full h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={errorData} layout="vertical" margin={{ left: -10, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fontWeight: "bold", fill: "#64748b" }}
                      tickFormatter={(v) => v.replace(/_/g, " ")}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} occurrences`, "Frequency"]}
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #f1f5f9" }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                      {errorData.map((entry) => (
                        <Cell key={entry.name} fill={ERROR_COLOR[entry.name] ?? "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
              <CardHeader
                icon={AlertTriangle}
                iconBg="bg-rose-50"
                iconColor="text-rose-500"
                title="Grammar Diagnostics"
                subtitle="Error patterns will appear after chatting with Aria"
              />
              <div className="flex flex-col items-center gap-2 py-8 text-slate-300">
                <BarChart2 className="w-10 h-10" />
                <p className="text-xs text-slate-400">No grammar data yet</p>
              </div>
            </div>
          )}

          {/* Recent lessons */}
          {recent.length > 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
              <CardHeader
                icon={History}
                iconBg="bg-slate-50"
                iconColor="text-slate-500"
                title="Recently Completed"
                subtitle="Your latest lessons and practice sessions"
              />
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {recent.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                      </div>
                      <span className="text-sm text-slate-800 font-semibold truncate">
                        {(p.lesson as { title?: string })?.title ?? "Lesson Practice"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.score != null && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-lg">
                          {p.score}%
                        </span>
                      )}
                      <span className="text-xs font-bold text-primary-600 whitespace-nowrap">
                        +{p.xpEarned} XP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
              <CardHeader
                icon={History}
                iconBg="bg-slate-50"
                iconColor="text-slate-500"
                title="Recently Completed"
                subtitle="Lessons you finish will appear here"
              />
              <div className="flex flex-col items-center gap-2 py-8 text-slate-300">
                <BookOpen className="w-10 h-10" />
                <p className="text-xs text-slate-400">No lessons completed yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-primary-400" />
          </div>
          <h3 className="font-bold text-slate-900">No Progress Records Yet</h3>
          <p className="text-slate-400 text-sm max-w-xs text-center">
            Complete lessons and chat with Aria to start tracking your progress.
          </p>
        </div>
      )}
    </div>
  );
}
