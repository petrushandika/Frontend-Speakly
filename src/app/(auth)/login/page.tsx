"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/55 mb-2">
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
            className="sk-input"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/55">
            Password
          </label>
          <Link href="/forgot" className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="sk-input pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70 rounded-lg hover:bg-[var(--surface-strong)] transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-[#1f1d19] hover:bg-[#171511] text-white text-sm font-extrabold tracking-wide rounded-xl border border-[#1f1d19] transition-all shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] paper-grid">
      {/* Right Pane - Brand Info & Marketing (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-[#1f1d19] text-white flex-col justify-between p-16 relative overflow-hidden border-r border-[var(--line)]">
        {/* Decorative background circles */}
        <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full -top-40 -left-40 blur-3xl" />
        <div className="absolute w-[400px] h-[400px] bg-primary-500/20 rounded-full -bottom-20 -right-20 blur-3xl" />

        {/* Top brand */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            Speakly
          </span>
        </div>

        {/* Center content */}
        <div className="space-y-8 z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Master English by speaking naturally.
          </h1>
          <p className="text-[var(--foreground)]/40 leading-relaxed text-base">
            Practice real-world conversations with Aria, your personal AI tutor, and receive dynamic, real-time grammar corrections.
          </p>

          {/* Interactive Graphic Card mockup */}
          <div className="rounded-2xl p-6 shadow-xl border border-white/10 bg-white/10 text-white space-y-4 animate-float">
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
        <div className="text-[var(--foreground)]/55 text-xs z-10 font-medium">
          Speakly AI © 2026. Elevating language mastery.
        </div>
      </div>

      {/* Left Pane - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--background)]">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile brand header (Visible only on mobile) */}
          <div className="text-center md:hidden mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-[var(--foreground)] mt-2">Speakly</h2>
            <p className="text-[var(--foreground)]/70 text-sm mt-1">Practice English with AI</p>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Sign In
            </h2>
            <p className="text-sm text-[var(--foreground)]/70 mt-2">
              Welcome back! Please enter your details below.
            </p>
          </div>

          <div className="sk-panel p-8 bg-[var(--surface-strong)]">
            <Suspense fallback={<div className="h-40 animate-pulse bg-[var(--surface)] rounded-xl" />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-sm text-[var(--foreground)]/55 mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary-600 font-semibold hover:text-primary-700 dark:text-primary-300 hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
