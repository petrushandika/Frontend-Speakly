"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Zap,
  Flame,
  Layers,
  MessageSquare,
  BookOpen,
  BookMarked,
  Mic2,
  BarChart2,
  ArrowRight,
  PlayCircle,
} from "lucide-react";

const QUICK_ACTIONS = [
  { href: "/chat",       icon: MessageSquare, label: "Chat with Aria",  desc: "Free conversation with instant corrections", color: "bg-primary-50 text-primary-700 border-primary-100" },
  { href: "/lessons",   icon: BookOpen,      label: "Lessons",         desc: "Structured bite-sized grammar & vocabulary", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { href: "/vocabulary",icon: BookMarked,    label: "Vocabulary",      desc: "Study list + your personal word bank",       color: "bg-sky-50 text-sky-600 border-sky-100" },
  { href: "/rooms",     icon: Mic2,          label: "Speaking Rooms",  desc: "Practice speaking with live discussion",     color: "bg-accent-50 text-accent-500 border-accent-200" },
];

export default function HomePage() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const { data: summary, refetch: refetchSummary } = trpc.progress.getSummary.useQuery();
  const { data: dueCount } = trpc.progress.getDueFlashcardsCount.useQuery();
  const { data: recent = [] } = trpc.progress.getRecentProgress.useQuery();
  const updateStreak = trpc.progress.updateStreak.useMutation({
    onSuccess: () => refetchSummary(),
    onError:   () => {},
  });

  useEffect(() => { updateStreak.mutate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const displayName = profile?.displayName ?? "Learner";
  const cefrLevel   = profile?.cefrLevel ?? "B1";
  const xp          = summary?.xpTotal ?? 0;
  const streak      = summary?.streakDays ?? 0;
  const due         = dueCount?.count ?? 0;

  const lastLesson = recent[0]
    ? (recent[0].lesson as { id?: string; title?: string })
    : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-[22px] bg-stone-900 text-white p-7 md:p-10 shadow-xl">
        <div className="absolute w-64 h-64 bg-primary-500/10 rounded-full -top-20 -right-16 blur-2xl" />
        <div className="absolute w-32 h-32 bg-accent-400/10 rounded-full bottom-4 left-8 blur-2xl" />
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/10 rounded-full text-xs font-semibold tracking-wide">
            <Zap className="w-3 h-3 text-amber-300" /> Level {cefrLevel}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight pt-1">
            {greeting}, {displayName}!
          </h1>
          <p className="text-stone-400 text-sm max-w-md">
            Keep practicing to maintain your streak and reach the next level.
          </p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap,    bg: "bg-primary-50", color: "text-primary-600", label: "Total XP",    value: xp.toLocaleString() },
          { icon: Flame,  bg: "bg-orange-50",  color: "text-orange-500",  label: "Day Streak",  value: `${streak} days` },
          { icon: Layers, bg: "bg-amber-50",   color: "text-amber-600",   label: "Due Cards",   value: due > 0 ? `${due} cards` : "All done" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] p-4 flex flex-col gap-2 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-base font-bold text-stone-900">{s.value}</p>
              <p className="text-xs text-stone-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Continue last lesson */}
      {lastLesson?.id && (
        <Link
          href={`/lessons/${lastLesson.id}`}
          className="flex items-center gap-4 p-5 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] hover:border-primary-200 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
            <PlayCircle className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary-600 mb-0.5">Continue where you left off</p>
            <p className="font-bold text-stone-900 truncate">{lastLesson.title ?? "Last lesson"}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400 group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
      )}

      {/* Due flashcards callout */}
      {due > 0 && (
        <Link
          href="/flashcards"
          className="flex items-center gap-4 p-5 bg-amber-50 border border-amber-200 rounded-[18px] hover:border-amber-300 hover:bg-amber-100/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-600 mb-0.5">Flashcard review due</p>
            <p className="font-bold text-amber-900">{due} card{due > 1 ? "s" : ""} waiting for review</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
      )}

      {/* Quick actions */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Quick actions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-4 p-4 bg-[var(--surface-strong)] rounded-[18px] border-[1.5px] border-[var(--line)] hover:border-primary-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${action.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 group-hover:text-primary-600 transition-colors text-sm">{action.label}</p>
                  <p className="text-xs text-stone-400 mt-0.5 truncate">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-primary-400 group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Recent activity</p>
            <Link href="/progress" className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline">
              <BarChart2 className="w-3.5 h-3.5" /> View all
            </Link>
          </div>
          <div className="space-y-2">
            {recent.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3.5 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary-500" />
                </div>
                <span className="text-sm font-semibold text-stone-800 flex-1 truncate">
                  {(p.lesson as { title?: string })?.title ?? "Lesson Practice"}
                </span>
                <span className="text-xs font-bold text-primary-600 shrink-0">+{p.xpEarned} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
