"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const GOALS = [
  { value: "general", label: "General English" },
  { value: "business", label: "Business / Work" },
  { value: "academic", label: "Academic / IELTS" },
  { value: "travel", label: "Travel & Daily Life" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Step 2
  const [cefrLevel, setCefrLevel] = useState<string>("B1");
  const [goal, setGoal] = useState<string>("general");

  async function handleStep1(e: React.FormEvent) {
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
      options: {
        data: { display_name: displayName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      localStorage.setItem("sb-access-token", data.session.access_token);

      // Create user profile
      await supabase.from("users").insert({
        auth_id: data.user!.id,
        email,
        display_name: displayName,
        cefr_level: cefrLevel,
        goal,
      });
    }

    // Supabase may require email confirmation
    if (!data.session) {
      router.push("/verify-email");
      return;
    }

    router.push("/chat");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-primary-600">Speakly</span>
          <p className="text-gray-500 text-sm mt-1">Practice English with AI</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1.5 flex-1 rounded-full bg-primary-600" />
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step === 2 ? "bg-primary-600" : "bg-gray-200"}`} />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-6">
            {step === 1 ? "Create your account" : "Personalize your learning"}
          </h1>

          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="John"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@email.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What&apos;s your current English level?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CEFR_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCefrLevel(level)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                        cefrLevel === level
                          ? "bg-primary-600 text-white border-primary-600"
                          : "border-gray-200 text-gray-600 hover:border-primary-400"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What&apos;s your main goal?
                </label>
                <div className="space-y-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGoal(g.value)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                        goal === g.value
                          ? "bg-primary-50 border-primary-500 text-primary-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:border-primary-300"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating…" : "Start learning"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
