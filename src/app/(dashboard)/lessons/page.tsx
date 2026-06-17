"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";

const CATEGORY_EMOJI: Record<string, string> = {
  grammar:    "📐",
  vocabulary: "📝",
  speaking:   "🗣️",
  listening:  "👂",
  reading:    "📖",
  writing:    "✍️",
};

const STATUS_STYLE: Record<string, string> = {
  completed:   "bg-emerald-50 border-emerald-200 text-emerald-700",
  in_progress: "bg-indigo-50 border-indigo-200 text-indigo-700",
  not_started: "bg-slate-50 border-slate-200 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  completed:   "Completed",
  in_progress: "In Progress",
  not_started: "Start Lesson",
};

export default function LessonsPage() {
  const { data: lessons = [], isLoading } = trpc.lessons.getAll.useQuery();

  const completed   = lessons.filter((l) => l.progress?.status === "completed").length;
  const totalCount  = lessons.length;
  const percentage  = totalCount > 0 ? Math.round((completed / totalCount) * 100) : 0;

  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Header and Progress panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lessons Library</h1>
          <p className="text-slate-500 text-sm">
            Complete bite-sized tasks tailored specifically for your target skills.
          </p>
        </div>
        
        {totalCount > 0 && (
          <div className="flex items-center gap-4 shrink-0 md:w-80 w-full">
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Progress</span>
                <span className="text-primary-600">{percentage}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-400 text-right">
                {completed} of {totalCount} completed
              </p>
            </div>
            
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 text-xl font-black shrink-0 border border-primary-100">
              {percentage}%
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && lessons.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <p className="text-5xl mb-4 animate-float">📚</p>
          <h3 className="font-extrabold text-slate-900 text-lg">No Lessons Available Yet</h3>
          <p className="text-slate-400 text-sm mt-1">Please check back later, we are preparing new lessons for you.</p>
        </div>
      )}

      {/* Lessons List */}
      <div className="grid grid-cols-1 gap-3">
        {lessons.map((lesson, i) => {
          const status = lesson.progress?.status ?? "not_started";
          const emoji  = CATEGORY_EMOJI[lesson.category] ?? "📄";

          return (
            <Link
              key={lesson.id}
              href={`/lessons/${lesson.id}`}
              className="flex items-center gap-4 p-4.5 bg-white rounded-2xl border border-slate-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5 transition-all duration-300 group"
            >
              {/* Category Icon */}
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shrink-0 group-hover:bg-primary-50 group-hover:border-primary-100 group-hover:scale-105 transition-all">
                {emoji}
              </div>
              
              {/* Lesson details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">LESSON #{i + 1}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200/40 text-slate-600 rounded-md">
                    {lesson.cefrLevel}
                  </span>
                </div>
                <p className="font-bold text-slate-800 text-sm md:text-base group-hover:text-primary-600 transition-colors truncate">
                  {lesson.title}
                </p>
                {lesson.description && (
                  <p className="text-xs text-slate-500 truncate leading-relaxed">{lesson.description}</p>
                )}
              </div>
              
              {/* Action Badge */}
              <span className={`text-xs px-3.5 py-1.5 border rounded-xl font-bold shrink-0 shadow-sm active:scale-95 transition-all ${STATUS_STYLE[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
