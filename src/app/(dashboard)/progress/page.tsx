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

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CEFR_XP: Record<string, number> = {
  A1: 0, A2: 500, B1: 1500, B2: 3500, C1: 7000, C2: 12000,
};

const ERROR_COLOR: Record<string, string> = {
  tense:       "#6366f1", // Indigo
  article:     "#a855f7", // Purple
  preposition: "#14b8a6", // Teal
  subject_verb:"#f43f5e", // Rose
  word_order:  "#eab308", // Yellow
  vocabulary:  "#3b82f6", // Blue
};

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

  // Error breakdown for bar chart
  const errorCounts = errors.reduce<Record<string, number>>((acc, e) => {
    const cat = e.errorCategory;
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const errorData = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  // Skills radar — derived from lesson categories completed
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
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Progress</h1>
        <p className="text-slate-500 text-sm">Visualize your speaking level, skills balance, and learning history.</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: CEFR Card & Skill balance */}
        <div className="space-y-6">
          {/* XP & CEFR badge */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm relative overflow-hidden group">
            <div className="absolute w-24 h-24 bg-primary-100/50 rounded-full -top-10 -left-10 blur-xl group-hover:scale-110 transition-transform" />
            
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active CEFR Level</p>
                <p className="text-5xl font-black text-primary-600 tracking-tight mt-1">{cefr}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total XP Earned</p>
                <p className="text-3xl font-black text-slate-950 tracking-tight mt-1">{xp.toLocaleString()}</p>
              </div>
            </div>

            {nextCefr && (
              <div className="space-y-2 relative z-10 pt-2">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Level {cefr}</span>
                  <span className="text-primary-600 font-bold">{xpProgress}% to Level {nextCefr}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  {(xpForNext - xp).toLocaleString()} XP remaining to achieve Level {nextCefr}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 relative z-10">
              <span className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center text-xl shadow-sm">🔥</span>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">{streak} Day Practice Streak</p>
                <p className="text-xs text-slate-400 font-medium">Keep practicing daily to maintain your learning streak!</p>
              </div>
            </div>
          </div>

          {/* Skill Balance radar */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Skills Balance</h2>
              <p className="text-xs text-slate-400">Your balanced proficiency across all 6 core categories.</p>
            </div>
            
            <div className="w-full h-[230px] flex items-center justify-center">
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

        {/* Right Side: Mistake charts & Recent History */}
        <div className="space-y-6">
          {/* Common Mistakes */}
          {errorData.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Grammar Diagnostics</h2>
                <p className="text-xs text-slate-400">Most frequent grammar mistake categories from conversations.</p>
              </div>
              
              <div className="w-full h-[220px]">
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
                      formatter={(v) => [`${v} occurrences`, "Category Frequency"]}
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #f1f5f9" }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                      {errorData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={ERROR_COLOR[entry.name] ?? "#6366f1"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Lessons List */}
          {recent.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Recently Completed</h2>
                <p className="text-xs text-slate-400">Your latest practice actions and score summaries.</p>
              </div>
              
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {recent.slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm p-3 bg-slate-50/50 border border-slate-100/50 rounded-xl hover:bg-white transition-all">
                    <span className="text-slate-800 font-bold truncate flex-1">
                      {(p.lesson as { title?: string })?.title ?? "Lesson Practice"}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {p.score != null && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200/30">
                          {p.score}%
                        </span>
                      )}
                      <span className="text-xs font-bold text-primary-600 shrink-0">
                        +{p.xpEarned} XP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm max-w-xl mx-auto space-y-3">
          <p className="text-6xl animate-float">📊</p>
          <h3 className="font-extrabold text-slate-900 text-lg">No Progress Records Yet</h3>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Complete structured lessons and converse with Aria to populate your performance metrics.
          </p>
        </div>
      )}
    </div>
  );
}
