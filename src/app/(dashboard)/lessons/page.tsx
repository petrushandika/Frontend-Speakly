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
  completed:   "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  not_started: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  completed:   "Done",
  in_progress: "In progress",
  not_started: "Not started",
};

export default function LessonsPage() {
  const { data: lessons = [], isLoading } = trpc.lessons.getAll.useQuery();

  const completed   = lessons.filter((l) => l.progress?.status === "completed").length;
  const totalCount  = lessons.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lessons</h1>
        {totalCount > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {completed} / {totalCount} completed
          </p>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all"
            style={{ width: `${Math.round((completed / totalCount) * 100)}%` }}
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && lessons.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">No lessons available yet</p>
          <p className="text-sm mt-1">Check back soon!</p>
        </div>
      )}

      <div className="space-y-3">
        {lessons.map((lesson, i) => {
          const status = lesson.progress?.status ?? "not_started";
          const emoji  = CATEGORY_EMOJI[lesson.category] ?? "📄";

          return (
            <Link
              key={lesson.id}
              href={`/lessons/${lesson.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl shrink-0">
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">#{i + 1}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                    {lesson.cefrLevel}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">
                  {lesson.title}
                </p>
                {lesson.description && (
                  <p className="text-xs text-gray-400 truncate">{lesson.description}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_STYLE[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
