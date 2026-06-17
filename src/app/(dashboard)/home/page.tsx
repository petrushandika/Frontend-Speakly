"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

const QUICK_ACTIONS = [
  { href: "/chat",       icon: "💬", label: "Chat with Aria",  desc: "Free conversation practice with instant corrections", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { href: "/lessons",    icon: "📚", label: "Lessons",         desc: "Structured bite-sized learning syllabus", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { href: "/vocabulary", icon: "📝", label: "Vocabulary",      desc: "Review your personal curated word bank", color: "bg-sky-50 text-sky-600 border-sky-100" },
  { href: "/flashcards", icon: "🃏", label: "Flashcards",      desc: "Review cards with SM-2 spaced repetition", color: "bg-rose-50 text-rose-600 border-rose-100" },
];

export default function HomePage() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const { data: summary, refetch: refetchSummary } = trpc.progress.getSummary.useQuery();
  const { data: dueCount } = trpc.progress.getDueFlashcardsCount.useQuery();
  const updateStreak = trpc.progress.updateStreak.useMutation({
    onSuccess: () => refetchSummary(),
  });

  useEffect(() => { updateStreak.mutate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const displayName = profile?.displayName ?? "Learner";
  const cefrLevel   = profile?.cefrLevel ?? "B1";
  const xp          = summary?.xpTotal ?? 0;
  const streak      = summary?.streakDays ?? 0;
  const due         = dueCount?.count ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="w-full px-6 md:px-8 space-y-8">
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-indigo-600 to-violet-700 text-white p-8 md:p-10 shadow-xl shadow-primary-500/10">
        <div className="absolute w-[300px] h-[300px] bg-white/5 rounded-full -top-20 -right-20 blur-2xl animate-pulse" />
        
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase">
            ⚡ Level {cefrLevel} Student
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight pt-2">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="text-indigo-100 text-sm md:text-base max-w-md">
            Ready to sharpen your skills? Continue practicing to build up your learning streak and level up!
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon="⚡" label="XP Total" value={xp.toLocaleString()} gradient="from-indigo-500/10 to-primary-500/5 border-primary-500/10" valueColor="text-primary-600" />
          <StatCard icon="🔥" label="Active Streak"   value={`${streak} days`} gradient="from-orange-500/10 to-amber-500/5 border-orange-500/10" valueColor="text-orange-600" />
          <StatCard
            icon="🃏"
            label="Due Flashcards"
            value={due > 0 ? `${due} cards` : "Completed!"}
            highlight={due > 0}
            href="/flashcards"
            gradient={due > 0 ? "from-rose-500/10 to-pink-500/5 border-rose-500/10" : "from-emerald-500/10 to-teal-500/5 border-emerald-500/10"}
            valueColor={due > 0 ? "text-rose-600" : "text-emerald-600"}
          />
        </div>
      </div>

      {/* Due Flashcards Callout */}
      {due > 0 && (
        <Link
          href="/flashcards"
          className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl hover:border-amber-500/40 hover:bg-amber-500/10 transition-all duration-300 group shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl animate-bounce">🃏</span>
            <div>
              <p className="font-bold text-amber-800">
                You have {due} flashcard{due > 1 ? "s" : ""} to review!
              </p>
              <p className="text-xs text-amber-700 mt-0.5">Keep your retention high. Practice spacing daily.</p>
            </div>
          </div>
          <span className="text-amber-700 font-bold group-hover:translate-x-1.5 transition-transform duration-200 text-xl">
            →
          </span>
        </Link>
      )}

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Launch Pad</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${action.color} group-hover:scale-110 transition-transform duration-200 shrink-0 shadow-sm`}>
                {action.icon}
              </span>
              <div className="space-y-1">
                <span className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors text-base flex items-center gap-1.5">
                  {action.label}
                  <span className="text-xs opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                </span>
                <span className="text-xs text-slate-500 leading-relaxed block">{action.desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, highlight, href, gradient, valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
  href?: string;
  gradient?: string;
  valueColor?: string;
}) {
  const content = (
    <div className={`flex flex-col gap-1 p-5 rounded-2xl border bg-white hover:shadow-md transition-all duration-300 relative overflow-hidden group cursor-pointer ${
      highlight ? "border-rose-100 shadow-sm" : "border-slate-100"
    }`}>
      {/* Decorative inner gradient shape */}
      <div className={`absolute inset-0 bg-gradient-to-tr ${gradient} opacity-40 group-hover:opacity-60 transition-opacity`} />
      
      <span className="text-2xl z-10 group-hover:scale-110 transition-transform duration-200 inline-block w-fit">{icon}</span>
      <span className={`text-2xl font-extrabold tracking-tight z-10 mt-2 ${valueColor}`}>
        {value}
      </span>
      <span className="text-xs font-semibold text-slate-400 z-10 uppercase tracking-wide">{label}</span>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
