"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

type Section = {
  type: "explanation" | "examples" | "tip";
  text?: string;
  items?: { en: string; id: string }[];
};

type Exercise = { question: string; answer: string };

type LessonContent = {
  sections?: Section[];
  exercises?: Exercise[];
};

export default function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: lesson, isLoading } = trpc.lessons.getById.useQuery({ id });
  const complete = trpc.lessons.complete.useMutation({
    onSuccess: () => router.push("/lessons"),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">Lesson not found</p>
      </div>
    );
  }

  const content = lesson.content as LessonContent;
  const sections = content.sections ?? [];
  const exercises = content.exercises ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">
            {lesson.cefrLevel}
          </span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full capitalize">
            {lesson.category}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
        {lesson.description && (
          <p className="text-gray-500 text-sm mt-1">{lesson.description}</p>
        )}
      </div>

      {/* Content sections */}
      {sections.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {sections.map((section, i) => {
            if (section.type === "explanation" && section.text) {
              return (
                <div key={i}>
                  <h2 className="font-semibold text-gray-800 mb-2">Explanation</h2>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                    {section.text.replace(/\*\*(.*?)\*\*/g, "$1")}
                  </p>
                </div>
              );
            }
            if (section.type === "examples" && section.items) {
              return (
                <div key={i}>
                  <h2 className="font-semibold text-gray-800 mb-2">Examples</h2>
                  <ul className="space-y-2">
                    {section.items.map((ex, j) => (
                      <li key={j} className="bg-gray-50 px-4 py-2.5 rounded-lg">
                        <p className="text-sm font-medium text-gray-800">{ex.en}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{ex.id}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            if (section.type === "tip" && section.text) {
              return (
                <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">💡 Tip</p>
                  <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">
                    {section.text}
                  </p>
                </div>
              );
            }
            return null;
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-gray-400 text-sm text-center py-8">Content coming soon…</p>
        </div>
      )}

      {/* Exercises */}
      {exercises.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Practice Exercises</h2>
          <ol className="space-y-3">
            {exercises.map((ex, i) => (
              <li key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700 font-medium mb-1">
                  {i + 1}. {ex.question}
                </p>
                <details className="group">
                  <summary className="text-xs text-primary-600 cursor-pointer select-none list-none">
                    Show answer ▾
                  </summary>
                  <p className="mt-1 text-sm font-semibold text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg inline-block">
                    {ex.answer}
                  </p>
                </details>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Complete button */}
      <button
        onClick={() => complete.mutate({ lessonId: id, score: 100, xpEarned: 50 })}
        disabled={complete.isPending}
        className="w-full py-3 bg-primary-600 text-white font-semibold rounded-2xl hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        {complete.isPending ? "Saving…" : "Mark as complete (+50 XP)"}
      </button>
    </div>
  );
}
