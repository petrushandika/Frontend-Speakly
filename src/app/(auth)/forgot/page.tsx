"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const LOGO_SVG = (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] paper-grid">
      {/* Left Pane - Brand Info (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-[#1f1d19] text-white flex-col justify-between p-16 relative overflow-hidden border-r border-[var(--line)]">
        <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full -top-40 -left-40 blur-3xl" />
        <div className="absolute w-[400px] h-[400px] bg-primary-500/15 rounded-full -bottom-20 -right-20 blur-3xl" />

        <div className="flex items-center gap-2.5 z-10">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">{LOGO_SVG}</div>
            <span className="text-2xl font-black tracking-tight text-white">Speakly</span>
          </Link>
        </div>

        <div className="space-y-6 z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Recover your account.
          </h1>
          <p className="text-[var(--foreground)]/40 leading-relaxed text-base">
            Don&apos;t worry, it happens! Enter your email address and we&apos;ll send you a password reset link.
          </p>
        </div>

        <div className="text-[var(--foreground)]/70 text-xs z-10 font-medium">
          Speakly AI © 2026. Elevating language mastery.
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--background)]">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center md:hidden mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto">{LOGO_SVG}</div>
            <h2 className="text-3xl font-black text-[var(--foreground)] mt-2">Speakly</h2>
            <p className="text-[var(--foreground)]/55 text-sm mt-1">Practice English with AI</p>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Reset Password</h2>
            <p className="text-sm text-[var(--foreground)]/55 mt-2">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          <div className="sk-panel p-8 bg-[var(--surface-strong)]">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-3xl mx-auto border border-primary-100 dark:border-primary-800">
                  ✉️
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Email Sent!</h3>
                <p className="text-sm text-[var(--foreground)]/55 leading-relaxed">
                  Please check your inbox for the password reset confirmation link.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-4 px-6 py-3 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-bold rounded-xl transition-all shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-[3px] active:shadow-none"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/55 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="sk-input"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#1f1d19] hover:bg-[#171511] text-white text-sm font-extrabold tracking-wide rounded-xl border border-[#1f1d19] transition-all shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-[4px] active:shadow-none disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>

          {!sent && (
            <p className="text-center text-sm text-[var(--foreground)]/55">
              <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700 dark:text-primary-300 hover:underline">
                Back to Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
