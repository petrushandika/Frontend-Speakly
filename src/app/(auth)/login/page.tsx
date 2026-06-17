"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      localStorage.setItem("sb-access-token", data.session.access_token);
    }

    router.push(next);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Email Address
        </label>
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="name@example.com"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Signing in…
          </span>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Pane - Brand Info & Marketing (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-primary-700 via-indigo-700 to-violet-800 text-white flex-col justify-between p-16 relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full -top-40 -left-40 blur-3xl" />
        <div className="absolute w-[400px] h-[400px] bg-primary-500/20 rounded-full -bottom-20 -right-20 blur-3xl" />

        {/* Top brand */}
        <div className="flex items-center gap-2.5 z-10">
          <span className="text-3xl">🗣️</span>
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">
            Speakly
          </span>
        </div>

        {/* Center content */}
        <div className="space-y-8 z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Master English by speaking naturally.
          </h1>
          <p className="text-indigo-100/90 leading-relaxed text-base">
            Practice real-world conversations with Aria, your personal AI tutor, and receive dynamic, real-time grammar corrections.
          </p>

          {/* Interactive Graphic Card mockup */}
          <div className="glass-panel rounded-2xl p-6 shadow-xl border-white/10 bg-white/10 text-white space-y-4 animate-float">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-xs text-white/50 ml-2 font-mono">aria-correction-assistant.js</span>
            </div>
            <div className="space-y-2 text-xs md:text-sm font-mono">
              <p className="text-white/60"># Student says:</p>
              <p className="text-red-300 font-semibold">&quot;I have went to London last year.&quot;</p>
              <div className="border-t border-white/5 my-2" />
              <p className="text-white/60"># Aria&apos;s analysis:</p>
              <p className="text-emerald-400 font-semibold">
                &quot;Use the past simple &apos;went&apos; instead of present perfect &apos;have went&apos; when specifying a past time.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="text-indigo-200/50 text-xs z-10 font-medium">
          Speakly AI © 2026. Elevating language mastery.
        </div>
      </div>

      {/* Right Pane - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile brand header (Visible only on mobile) */}
          <div className="text-center md:hidden mb-6">
            <span className="text-4xl">🗣️</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Speakly</h2>
            <p className="text-slate-500 text-sm mt-1">Practice English with AI</p>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Sign In
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Welcome back! Please enter your details below.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            <Suspense fallback={<div className="h-40 animate-pulse bg-slate-50 rounded-xl" />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-sm text-slate-500 mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary-600 font-semibold hover:text-primary-700 hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
