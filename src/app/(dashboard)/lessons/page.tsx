"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  BookMarked,
  Mic2,
  Headphones,
  ScrollText,
  PenLine,
  FileText,
  CheckCircle2,
  Clock,
  Play,
} from "lucide-react";

const CATEGORY_ICON: Record<string, React.ElementType> = {
  grammar:    ScrollText,
  vocabulary: BookMarked,
  speaking:   Mic2,
  listening:  Headphones,
  reading:    BookOpen,
  writing:    PenLine,
};

const CATEGORY_COLOR: Record<string, string> = {
  grammar:    "bg-indigo-50 text-indigo-600 border-indigo-100",
  vocabulary: "bg-sky-50 text-sky-600 border-sky-100",
  speaking:   "bg-violet-50 text-violet-600 border-violet-100",
  listening:  "bg-teal-50 text-teal-600 border-teal-100",
  reading:    "bg-emerald-50 text-emerald-600 border-emerald-100",
  writing:    "bg-amber-50 text-amber-600 border-amber-100",
};

const STATUS_STYLE: Record<string, string> = {
  completed:   "bg-emerald-50 border-emerald-200 text-emerald-700",
  in_progress: "bg-indigo-50 border-indigo-200 text-indigo-700",
  not_started: "bg-[var(--surface)] border-[var(--line-soft)] text-slate-500",
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lessons</h1>
            <p className="text-sm text-slate-500">Structured bite-sized learning</p>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-3 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] px-4 py-3 shadow-sm">
            <div className="w-28 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Progress</span>
                <span className="text-primary-600">{percentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">{completed}/{totalCount} done</span>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-[18px] bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && lessons.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] shadow-sm text-center">
          <div className="w-12 h-12 rounded-[18px] bg-primary-50 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary-400" />
          </div>
          <h3 className="font-bold text-slate-900">No Lessons Available Yet</h3>
          <p className="text-slate-400 text-sm">Please check back later, we are preparing new lessons for you.</p>
        </div>
      )}

      {/* Lessons List */}
      <div className="grid grid-cols-1 gap-3">
        {lessons.map((lesson, i) => {
          const status = lesson.progress?.status ?? "not_started";
          const Icon   = CATEGORY_ICON[lesson.category] ?? FileText;
          const color  = CATEGORY_COLOR[lesson.category] ?? "bg-[var(--surface)] text-slate-500 border-slate-100";
          const StatusIcon = status === "completed" ? CheckCircle2 : status === "in_progress" ? Clock : Play;

          return (
            <Link
              key={lesson.id}
              href={`/lessons/${lesson.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-[18px] border border-slate-100 hover:border-primary-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${color} group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">#{i + 1}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 border border-[var(--line-soft)]/40 text-slate-500 rounded">
                    {lesson.cefrLevel}
                  </span>
                </div>
                <p className="font-bold text-slate-800 text-sm group-hover:text-primary-600 transition-colors truncate">
                  {lesson.title}
                </p>
                {lesson.description && (
                  <p className="text-xs text-slate-400 truncate">{lesson.description}</p>
                )}
              </div>

              <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-xl font-bold shrink-0 ${STATUS_STYLE[status]}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {STATUS_LABEL[status]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
