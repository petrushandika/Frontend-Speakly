"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";

const QUICK_ACTIONS = [
  { href: "/chat",       icon: "💬", label: "Chat with Aria",  desc: "Free conversation practice" },
  { href: "/lessons",    icon: "📚", label: "Lessons",         desc: "Structured learning" },
  { href: "/vocabulary", icon: "📝", label: "Vocabulary",      desc: "Your word bank" },
  { href: "/flashcards", icon: "🃏", label: "Flashcards",      desc: "Spaced repetition review" },
];

export default function HomePage() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const { data: summary } = trpc.progress.getSummary.useQuery();
  const { data: dueCount } = trpc.progress.getDueFlashcardsCount.useQuery();

  const displayName = profile?.displayName ?? "there";
  const cefrLevel   = profile?.cefrLevel ?? "B1";
  const xp          = summary?.xpTotal ?? 0;
  const streak      = summary?.streakDays ?? 0;
  const due         = dueCount?.count ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {displayName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Keep practicing — you&apos;re on level <span className="font-semibold text-primary-600">{cefrLevel}</span>
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="⚡" label="XP Total" value={xp.toLocaleString()} />
        <StatCard icon="🔥" label="Streak"   value={`${streak} days`} />
        <StatCard
          icon="🃏"
          label="Due cards"
          value={due > 0 ? `${due} due` : "All done!"}
          highlight={due > 0}
          href="/flashcards"
        />
      </div>

      {/* Due flashcards banner */}
      {due > 0 && (
        <Link
          href="/flashcards"
          className="flex items-center justify-between px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors"
        >
          <div>
            <p className="font-semibold text-amber-800">
              {due} flashcard{due > 1 ? "s" : ""} due for review
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Review now to keep your streak</p>
          </div>
          <span className="text-2xl">→</span>
        </Link>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          What do you want to do?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col gap-1 p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="font-semibold text-gray-900 text-sm">{a.label}</span>
              <span className="text-xs text-gray-400">{a.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, highlight, href,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
  href?: string;
}) {
  const content = (
    <div className={`flex flex-col gap-1 p-4 rounded-2xl border transition-colors ${
      highlight
        ? "bg-amber-50 border-amber-200"
        : "bg-white border-gray-100"
    }`}>
      <span className="text-xl">{icon}</span>
      <span className={`text-base font-bold ${highlight ? "text-amber-700" : "text-gray-900"}`}>
        {value}
      </span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
