"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { trpcClient } from "@/lib/trpc";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const GOALS = [
  { value: "general",     label: "General English",      icon: "🌐" },
  { value: "business",    label: "Business & Work",       icon: "💼" },
  { value: "tech",        label: "Tech & IT",             icon: "💻" },
  { value: "academic",    label: "Academic & Research",   icon: "🎓" },
  { value: "travel",      label: "Travel & Daily Life",   icon: "✈️" },
  { value: "ielts",       label: "IELTS / TOEFL Prep",    icon: "📝" },
  { value: "medical",     label: "Medical & Healthcare",  icon: "🏥" },
  { value: "finance",     label: "Finance & Banking",     icon: "📈" },
  { value: "creative",    label: "Creative & Arts",       icon: "🎨" },
  { value: "education",   label: "Teaching & Education",  icon: "🏫" },
  { value: "hospitality", label: "Hospitality & Tourism", icon: "☕" },
  { value: "law",         label: "Law & Legal",           icon: "⚖️" },
] as const;

const ACCENTS = [
  { value: "american",      label: "American",         abbr: "US" },
  { value: "british",       label: "British",          abbr: "UK" },
  { value: "australian",    label: "Australian",       abbr: "AU" },
  { value: "canadian",      label: "Canadian",         abbr: "CA" },
  { value: "irish",         label: "Irish",            abbr: "IE" },
  { value: "newzealand",    label: "New Zealand",      abbr: "NZ" },
  { value: "south_african", label: "South African",    abbr: "ZA" },
  { value: "indian",        label: "Indian",           abbr: "IN" },
  { value: "singaporean",   label: "Singaporean",      abbr: "SG" },
  { value: "neutral",       label: "Neutral / Global", abbr: "GL" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const [cefrLevel, setCefrLevel] = useState<string>("B1");
  const [goal, setGoal] = useState<string>("general");
  const [accentPreference, setAccentPreference] = useState<string>("american");

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      router.push("/verify-email");
      return;
    }

    localStorage.setItem("sb-access-token", data.session.access_token);

    try {
      await trpcClient.users.createProfile.mutate({
        email,
        displayName,
        cefrLevel: cefrLevel as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
        goal: goal as "general" | "business" | "tech" | "academic" | "travel" | "ielts",
        accentPreference: accentPreference as "american" | "british" | "australian" | "neutral",
      });
    } catch (profileErr) {
      console.error("Profile creation failed:", profileErr);
    }

    router.push("/home");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--background)] paper-grid">
      {/* Right Pane - Brand Info (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 bg-[#1f1d19] text-white flex-col justify-between p-16 relative overflow-hidden border-r border-[var(--line)]">
        {/* Decorative background circles */}
        <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full -top-40 -left-40 blur-3xl" />
        <div className="absolute w-[400px] h-[400px] bg-primary-500/20 rounded-full -bottom-20 -right-20 blur-3xl" />

        {/* Top brand */}
        <div className="flex items-center gap-2.5 z-10">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight text-white">Speakly</span>
          </Link>
        </div>

        {/* Center content */}
        <div className="space-y-8 z-10 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Start your journey to fluent English.
          </h1>
          <p className="text-stone-400 leading-relaxed text-base">
            Personalize your learning goals, practice speaking with AI, and master pronunciation with real-time feedback.
          </p>

          {/* Marketing features list */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">🔥</span>
              <span className="text-sm font-semibold">90-Day Practice Streaks & Badges</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">🤖</span>
              <span className="text-sm font-semibold">Aria: Generative Conversational AI</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">📊</span>
              <span className="text-sm font-semibold">CEFR Aligned Progress Tracking</span>
            </div>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="text-stone-600 text-xs z-10 font-medium">
          Speakly AI © 2026. Elevating language mastery.
        </div>
      </div>

      {/* Left Pane - Register Form */}
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
            <p className="text-stone-500 text-sm mt-1">Practice English with AI</p>
          </div>

          {/* Heading */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                {step === 1 ? "Sign Up" : "Personalize"}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full">
                Step {step} of 2
              </span>
            </div>
            <p className="text-sm text-stone-600">
              {step === 1 
                ? "Let's create your account to get started." 
                : "Help us tailor Speakly's AI lessons to your level."}
            </p>
          </div>

          <div className="sk-panel p-8 bg-[var(--surface-strong)]">
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1.5 flex-1 rounded-full bg-primary-600" />
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${step === 2 ? "bg-primary-600" : "bg-slate-200"}`} />
            </div>

            {step === 1 ? (
              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Minimum 8 characters"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98]"
                >
                  Continue
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    Current English Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CEFR_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setCefrLevel(level)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                          cefrLevel === level
                            ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                            : "border-slate-200 bg-stone-50/50 text-stone-600 hover:border-primary-400 hover:bg-white"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    Main Goal
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGoal(g.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border transition-all active:scale-[0.99] font-semibold ${
                          goal === g.value
                            ? "bg-primary-50/50 border-primary-500 text-primary-700 shadow-sm"
                            : "border-slate-200 bg-stone-50/20 text-stone-600 hover:border-primary-300 hover:bg-white"
                        }`}
                      >
                        <span className="text-base shrink-0">{g.icon}</span>
                        <span className="text-left leading-tight">{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    Preferred Accent (Aria&apos;s Voice)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => setAccentPreference(a.value)}
                        className={`py-2.5 px-3 flex items-center gap-2 rounded-xl text-xs border transition-all active:scale-95 font-semibold ${
                          accentPreference === a.value
                            ? "bg-primary-50/50 border-primary-500 text-primary-700 shadow-sm"
                            : "border-slate-200 bg-stone-50/20 text-stone-600 hover:border-primary-300 hover:bg-white"
                        }`}
                      >
                        <span className="w-7 h-5 rounded text-[10px] font-black bg-slate-200 text-stone-600 flex items-center justify-center shrink-0">
                          {a.abbr}
                        </span>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border border-slate-200 text-sm text-stone-600 font-semibold rounded-xl hover:bg-stone-50 transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Creating account…" : "Start Learning"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-stone-500 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
