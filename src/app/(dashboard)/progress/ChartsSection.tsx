"use client";

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line,
} from "recharts";
import { AlertTriangle, Layers, TrendingDown, TrendingUp, Minus, BarChart2 } from "lucide-react";

const ERROR_COLOR: Record<string, string> = {
  tense:        "#6366f1",
  article:      "#a855f7",
  preposition:  "#14b8a6",
  subject_verb: "#f43f5e",
  word_order:   "#eab308",
  vocabulary:   "#3b82f6",
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
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-stone-50 border border-slate-200 text-stone-500">
      <Minus className="w-3 h-3" /> Stable
    </span>
  );
}

export interface ChartsSectionProps {
  errorData:    { name: string; label: string; count: number }[];
  radarData:    { subject: string; value: number }[];
  trendData:    { date: string; count: number }[];
  hasTrendData: boolean;
  analytics: {
    trend?: string;
    totalThisWeek: number;
    totalLastWeek: number;
  } | null | undefined;
}

export default function ChartsSection({
  errorData, radarData, trendData, hasTrendData, analytics,
}: ChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      {/* Grammar Diagnostics */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h2 className="font-bold text-stone-900 text-sm">Grammar Diagnostics</h2>
            <p className="text-xs text-stone-400 mt-0.5">Error frequency by category</p>
          </div>
        </div>
        {errorData.length > 0 ? (
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorData} layout="vertical" margin={{ left: -10, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="label" width={105} tickLine={false} axisLine={false}
                  tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }}
                />
                <Tooltip
                  formatter={(v) => [`${v} times`, "Frequency"]}
                  contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #f1f5f9" }}
                />
                <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={12}>
                  {errorData.map((entry) => (
                    <Cell key={entry.name} fill={ERROR_COLOR[entry.name] ?? "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 h-[200px] text-slate-300">
            <BarChart2 className="w-10 h-10" />
            <p className="text-xs text-stone-400 text-center">Chat with Aria to see your error patterns</p>
          </div>
        )}
      </div>

      {/* Skills Radar */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h2 className="font-bold text-stone-900 text-sm">Skills Balance</h2>
            <p className="text-xs text-stone-400 mt-0.5">Across 6 core skill areas</p>
          </div>
        </div>
        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
              <Radar dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.12} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Trend */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 text-sm">Error Trend</h2>
              <p className="text-xs text-stone-400 mt-0.5">Last 14 days</p>
            </div>
          </div>
          {analytics?.trend && (
            <TrendBadge trend={analytics.trend as "improving" | "stable" | "needs_attention"} />
          )}
        </div>
        {hasTrendData ? (
          <>
            <div className="w-full h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ left: -20, right: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [`${v} errors`, ""]}
                    contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #f1f5f9" }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#6366f1" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {analytics && (
              <div className="flex gap-4 text-[11px] text-stone-500 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-stone-400">This week</span>
                  <p className="font-bold text-stone-800">{analytics.totalThisWeek}</p>
                </div>
                <div>
                  <span className="text-stone-400">Last week</span>
                  <p className="font-bold text-stone-800">{analytics.totalLastWeek}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 h-[160px] text-slate-300">
            <TrendingDown className="w-10 h-10" />
            <p className="text-xs text-stone-400 text-center">No trend data yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
