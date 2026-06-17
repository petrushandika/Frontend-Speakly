"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Pane - Brand Info (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-primary-700 via-indigo-700 to-violet-800 text-white flex-col justify-between p-16 relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full -top-40 -left-40 blur-3xl" />
        <div className="absolute w-[400px] h-[400px] bg-primary-500/20 rounded-full -bottom-20 -right-20 blur-3xl" />

        {/* Top brand */}
        <div className="flex items-center gap-2.5 z-10">
          <Link href="/login" className="flex items-center gap-2.5">
            <span className="text-3xl">🗣️</span>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">
              Speakly
            </span>
          </Link>
        </div>

        {/* Center content */}
        <div className="space-y-6 z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Recover your account.
          </h1>
          <p className="text-indigo-100/90 leading-relaxed text-base">
            Don&apos;t worry, it happens! Enter your email address and we&apos;ll send you a password reset link to get you back on track.
          </p>
        </div>

        {/* Bottom footer */}
        <div className="text-indigo-200/50 text-xs z-10 font-medium">
          Speakly AI © 2026. Elevating language mastery.
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand header (Visible only on mobile) */}
          <div className="text-center md:hidden mb-6">
            <span className="text-4xl">🗣️</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Speakly</h2>
            <p className="text-slate-500 text-sm mt-1">Practice English with AI</p>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Reset Password
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Enter your email and we&apos;ll email you link to reset your password.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mx-auto border border-emerald-100">
                  ✉️
                </div>
                <h3 className="text-lg font-bold text-slate-900">Email Sent!</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Please check your inbox for the password reset confirmation link.
                </p>
                <Link 
                  href="/login" 
                  className="inline-block mt-4 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-95"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>

          {!sent && (
            <p className="text-center text-sm text-slate-500 mt-4">
              <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700 hover:underline">
                Back to Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
