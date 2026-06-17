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
  tense:       "#f59e0b",
  article:     "#6366f1",
  preposition: "#10b981",
  subject_verb:"#ef4444",
  word_order:  "#8b5cf6",
  vocabulary:  "#3b82f6",
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Progress</h1>

      {/* XP + CEFR level */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Current level</p>
            <p className="text-4xl font-bold text-primary-600">{cefr}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total XP</p>
            <p className="text-2xl font-bold text-gray-900">{xp.toLocaleString()}</p>
          </div>
        </div>

        {nextCefr && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{cefr}</span>
              <span>{xpProgress}% to {nextCefr}</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {(xpForNext - xp).toLocaleString()} XP to reach {nextCefr}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="font-semibold text-gray-900">{streak} day streak</p>
            <p className="text-xs text-gray-400">Keep it up!</p>
          </div>
        </div>
      </div>

      {/* Skills radar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Skill Balance</h2>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#f3f4f6" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#6b7280" }} />
            <Radar
              dataKey="value"
              stroke="#4f46e5"
              fill="#4f46e5"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Error patterns */}
      {errorData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Common Mistakes</h2>
          <p className="text-xs text-gray-400 mb-4">Focus on these to improve faster</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={errorData} layout="vertical" margin={{ left: 16 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                tickFormatter={(v) => v.replace(/_/g, " ")}
              />
              <Tooltip
                formatter={(v) => [`${v} errors`, "Count"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
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
      )}

      {/* Recent lessons */}
      {recent.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Lessons</h2>
          <div className="space-y-2">
            {recent.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate flex-1">
                  {(p.lesson as { title?: string })?.title ?? "Lesson"}
                </span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {p.score != null && (
                    <span className="text-xs text-gray-400">{p.score}%</span>
                  )}
                  <span className="text-xs font-medium text-primary-600">
                    +{p.xpEarned} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && errorData.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📈</p>
          <p className="font-medium">No data yet</p>
          <p className="text-sm mt-1">Complete lessons and chat with Aria to see your progress</p>
        </div>
      )}
    </div>
  );
}
