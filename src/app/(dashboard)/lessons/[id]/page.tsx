"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

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

  const content = lesson.content as Record<string, unknown>;

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

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        {content.explanation && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Explanation</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {String(content.explanation)}
            </p>
          </div>
        )}

        {Array.isArray(content.examples) && content.examples.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Examples</h2>
            <ul className="space-y-2">
              {(content.examples as string[]).map((ex, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg"
                >
                  <span className="text-primary-500 font-bold shrink-0">{i + 1}.</span>
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(content.tips) && content.tips.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Tips</h2>
            <ul className="space-y-1.5">
              {(content.tips as string[]).map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-amber-500 shrink-0">💡</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(content).length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">Content coming soon…</p>
        )}
      </div>

      {/* Complete button */}
      <button
        onClick={() => complete.mutate({ id, score: 100, xpEarned: 50 })}
        disabled={complete.isPending}
        className="w-full py-3 bg-primary-600 text-white font-semibold rounded-2xl hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        {complete.isPending ? "Saving…" : "Mark as complete (+50 XP)"}
      </button>
    </div>
  );
}
