"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const LOGO_SVG = (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/login");
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
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">Secure your account.</h1>
          <p className="text-[var(--foreground)]/40 leading-relaxed text-base">
            Create a new, strong password with at least 8 characters combining letters, numbers, and special characters.
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
            <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Set New Password</h2>
            <p className="text-sm text-[var(--foreground)]/55 mt-2">Update your account password below.</p>
          </div>

          <div className="sk-panel p-8 bg-[var(--surface-strong)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/55 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters"
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/55 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="sk-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70 rounded-lg hover:bg-[var(--surface-strong)] transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                className="w-full py-3 bg-[#1f1d19] hover:bg-[#171511] text-white text-sm font-semibold rounded-full border border-[#1f1d19] transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Saving…" : "Set Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
