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
  grammar:    "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-100 dark:border-primary-800",
  vocabulary: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800",
  speaking:   "bg-accent-50 dark:bg-accent-900/20 text-accent-500 dark:text-accent-400 border-accent-200 dark:border-accent-800",
  listening:  "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-800",
  reading:    "bg-emerald-50 text-emerald-600 dark:text-emerald-400 border-emerald-100",
  writing:    "bg-amber-50 text-amber-600 dark:text-amber-400 border-amber-100",
};

const STATUS_STYLE: Record<string, string> = {
  completed:   "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400",
  in_progress: "bg-primary-50 dark:bg-primary-900/30 border-primary-200 text-primary-700 dark:text-primary-300",
  not_started: "bg-[var(--surface)] border-[var(--line-soft)] text-[var(--foreground)]/55",
};

const STATUS_LABEL: Record<string, string> = {
  completed:   "Completed",
  in_progress: "In Progress",
  not_started: "Start Lesson",
};

export default function LessonsPage() {
  const { data: lessons = [], isLoading } = trpc.lessons.getAll.useQuery();

  const completed  = lessons.filter((l) => l.progress?.status === "completed").length;
  const totalCount = lessons.length;
  const percentage = totalCount > 0 ? Math.round((completed / totalCount) * 100) : 0;

  return (
    <div className="w-full p-4 md:p-8 space-y-5 md:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800">
          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Lessons</h1>
          <p className="text-sm text-[var(--foreground)]/55 mt-0.5 leading-relaxed">Structured bite-sized learning</p>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center gap-4 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] px-5 py-4 shadow-[0_2px_0_var(--line)] w-full">
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex justify-between text-xs font-semibold text-[var(--foreground)]/40">
              <span>Progress</span>
              <span className="text-primary-600 font-bold">{percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-[var(--line-soft)] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-[var(--foreground)]/40 whitespace-nowrap shrink-0 font-semibold">{completed}/{totalCount} done</span>
        </div>
      )}

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
        <div className="flex flex-col items-center gap-4 py-20 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] shadow-sm text-center">
          <div className="w-14 h-14 rounded-[18px] bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center border border-primary-100 dark:border-primary-800">
            <BookOpen className="w-7 h-7 text-primary-400" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-[var(--foreground)]">No Lessons Available Yet</h3>
            <p className="text-[var(--foreground)]/40 text-sm leading-relaxed max-w-xs">Please check back later, we are preparing new lessons for you.</p>
          </div>
        </div>
      )}

      {/* Lessons List */}
      <div className="grid grid-cols-1 gap-3">
        {lessons.map((lesson, i) => {
          const status = lesson.progress?.status ?? "not_started";
          const Icon   = CATEGORY_ICON[lesson.category] ?? FileText;
          const color  = CATEGORY_COLOR[lesson.category] ?? "bg-[var(--surface)] text-[var(--foreground)]/55 border-[var(--line)]";
          const StatusIcon = status === "completed" ? CheckCircle2 : status === "in_progress" ? Clock : Play;

          return (
            <Link
              key={lesson.id}
              href={`/lessons/${lesson.id}`}
              className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-[var(--surface-strong)] rounded-[18px] border border-[var(--line)] hover:border-primary-200 dark:hover:border-primary-700 hover:-translate-y-0.5 hover:shadow-md shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none transition-all duration-150 group"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border ${color} group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[var(--foreground)]/40">#{i + 1}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--surface-strong)] border border-[var(--line-soft)]/40 text-[var(--foreground)]/55 rounded">
                    {lesson.cefrLevel}
                  </span>
                </div>
                <p className="font-bold text-[var(--foreground)] text-sm group-hover:text-primary-600 transition-colors truncate leading-snug">
                  {lesson.title}
                </p>
                {lesson.description && (
                  <p className="text-xs text-[var(--foreground)]/40 truncate leading-relaxed">{lesson.description}</p>
                )}
              </div>

              <span className={`flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 border rounded-xl font-bold shrink-0 ${STATUS_STYLE[status]}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{STATUS_LABEL[status]}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
