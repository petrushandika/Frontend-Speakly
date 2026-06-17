"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { SearchX, Lightbulb, ChevronLeft, Eye, EyeOff } from "lucide-react";

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
  const { data: profile } = trpc.users.getProfile.useQuery();
  const complete = trpc.lessons.complete.useMutation({
    onSuccess: () => router.push("/lessons"),
  });

  // For B1+: translations hidden by default (immersion), user can reveal
  // For A1/A2: translations always visible
  const cefrLevel = profile?.cefrLevel ?? "B1";
  const isBeginnerLevel = cefrLevel === "A1" || cefrLevel === "A2";
  const [showTranslations, setShowTranslations] = useState(isBeginnerLevel);

  if (isLoading) {
    return (
      <div className="w-full p-6 md:p-8 space-y-4">
        <div className="h-6 w-24 bg-white/60 border border-slate-100 rounded-xl animate-pulse" />
        <div className="h-40 bg-white border border-slate-100 rounded-3xl animate-pulse" />
        <div className="h-64 bg-white border border-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="w-full p-6 md:p-8 text-center py-16 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
          <SearchX className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-bold text-slate-900">Lesson Not Found</h3>
        <p className="text-slate-400 text-sm mt-1">We couldn&apos;t retrieve the requested lesson details.</p>
        <button
          onClick={() => router.push("/lessons")}
          className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all"
        >
          Back to Lessons
        </button>
      </div>
    );
  }

  const content = lesson.content as LessonContent;
  const sections = content.sections ?? [];
  const exercises = content.exercises ?? [];

  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Top Navigation & Header */}
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-all cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-primary-100 border border-primary-200 text-primary-700 rounded-md">
            {lesson.cefrLevel}
          </span>
          <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-md uppercase tracking-wider">
            {lesson.category}
          </span>
        </div>
        
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {lesson.title}
          </h1>
          {/* Translation toggle for B1+ */}
          {!isBeginnerLevel && (
            <button
              onClick={() => setShowTranslations((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shrink-0 transition-colors"
            >
              {showTranslations ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showTranslations ? "Sembunyikan terjemahan" : "Lihat terjemahan"}
            </button>
          )}
        </div>
        {lesson.description && (
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">{lesson.description}</p>
        )}
        {isBeginnerLevel && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-semibold">
            Terjemahan Bahasa Indonesia selalu ditampilkan untuk level {cefrLevel}
          </div>
        )}
      </div>

      {/* Content sections */}
      {sections.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-6 shadow-sm">
          {sections.map((section, i) => {
            if (section.type === "explanation" && section.text) {
              return (
                <div key={i} className="space-y-3">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full inline-block" />
                    Explanation
                  </h2>
                  <p className="text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-line font-medium">
                    {section.text.replace(/\*\*(.*?)\*\*/g, "$1")}
                  </p>
                </div>
              );
            }
            if (section.type === "examples" && section.items) {
              return (
                <div key={i} className="space-y-3 pt-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary-500 rounded-full inline-block" />
                    Examples
                  </h2>
                  <ul className="grid grid-cols-1 gap-2.5">
                    {section.items.map((ex, j) => (
                      <li key={j} className="bg-slate-50 border border-slate-100/70 px-4 py-3.5 rounded-2xl hover:bg-white hover:border-primary-100 hover:shadow-sm transition-all duration-200">
                        <p className="text-sm font-bold text-slate-900">{ex.en}</p>
                        {showTranslations && ex.id && (
                          <p className={`text-xs font-semibold mt-1 italic ${isBeginnerLevel ? "text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block" : "text-slate-400"}`}>
                            {ex.id}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            if (section.type === "tip" && section.text) {
              return (
                <div key={i} className="bg-gradient-to-tr from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4.5 shadow-sm">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wider mb-1">
                    <Lightbulb className="w-3.5 h-3.5" /> Tip / Remember
                  </p>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-semibold whitespace-pre-line">
                    {section.text}
                  </p>
                </div>
              );
            }
            return null;
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center shadow-sm">
          <p className="text-slate-400 text-sm py-4">Lesson content is currently being updated...</p>
        </div>
      )}

      {/* Exercises */}
      {exercises.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full inline-block" />
            Practice Exercises
          </h2>
          <ol className="space-y-3">
            {exercises.map((ex, i) => (
              <li key={i} className="bg-slate-50 border border-slate-100/70 rounded-2xl p-4.5 space-y-3 hover:bg-white hover:border-primary-100 transition-all duration-200">
                <p className="text-sm text-slate-800 font-extrabold leading-relaxed">
                  {i + 1}. {ex.question}
                </p>
                
                <details className="group">
                  <summary className="text-xs font-bold text-primary-600 cursor-pointer select-none list-none flex items-center gap-1 hover:text-primary-700">
                    <span>Show Answer</span>
                    <span className="transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <div className="mt-2.5 bg-primary-50 border border-primary-100 px-4 py-2.5 rounded-xl inline-block shadow-inner">
                    <p className="text-xs font-bold text-primary-800 uppercase tracking-wider mb-0.5">Correct Answer</p>
                    <p className="text-sm font-extrabold text-indigo-950">{ex.answer}</p>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Complete Button */}
      <button
        onClick={() => complete.mutate({ lessonId: id, score: 100, xpEarned: 50 })}
        disabled={complete.isPending}
        className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {complete.isPending ? "Saving…" : "Complete +50 XP"}
      </button>
    </div>
  );
}
