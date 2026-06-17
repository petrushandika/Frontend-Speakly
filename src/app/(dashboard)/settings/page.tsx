"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const GOALS = [
  { value: "general",  label: "General English 🌐" },
  { value: "business", label: "Business & Work 💼" },
  { value: "tech",     label: "Tech & IT 💻" },
  { value: "academic", label: "Academic & IELTS 🎓" },
  { value: "travel",   label: "Travel & Daily Life ✈️" },
  { value: "ielts",    label: "IELTS Preparation 📝" },
] as const;

const ACCENTS = [
  { value: "american",   label: "American", flag: "🇺🇸" },
  { value: "british",    label: "British", flag: "🇬🇧" },
  { value: "australian", label: "Australian", flag: "🇦🇺" },
  { value: "neutral",    label: "Neutral / Global", flag: "🌐" },
] as const;

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.users.getProfile.useQuery();

  const [displayName, setDisplayName]         = useState("");
  const [cefrLevel, setCefrLevel]             = useState<"A1"|"A2"|"B1"|"B2"|"C1"|"C2">("B1");
  const [goal, setGoal]                       = useState<"general"|"business"|"tech"|"academic"|"travel"|"ielts">("general");
  const [accentPreference, setAccentPreference] = useState<"american"|"british"|"australian"|"neutral">("american");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setCefrLevel((profile.cefrLevel as "A1"|"A2"|"B1"|"B2"|"C1"|"C2") ?? "B1");
      setGoal((profile.goal as "general"|"business"|"tech"|"academic"|"travel"|"ielts") ?? "general");
      setAccentPreference((profile.accentPreference as "american"|"british"|"australian"|"neutral") ?? "american");
    }
  }, [profile]);

  const update = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.users.getProfile.invalidate();
      toast.success("Profile updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({ displayName, goal, accentPreference, cefrLevel });
  }

  if (isLoading) {
    return (
      <div className="w-full px-6 md:px-8 space-y-4">
        <div className="h-6 w-24 bg-white border border-slate-100 rounded-xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-3xl bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full px-6 md:px-8 space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm">Manage your profile, target learning levels, and voice preferences.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
          <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>👤</span> Profile Information
          </h2>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              English Level (CEFR)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CEFR_LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setCefrLevel(l)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 cursor-pointer ${
                    cefrLevel === l
                      ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                      : "border-slate-200 bg-slate-50/20 text-slate-600 hover:border-primary-300 hover:bg-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Learning preferences */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
          <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>🎯</span> Learning Preferences
          </h2>

          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Main Goal</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={`text-left px-4 py-3 rounded-xl text-sm border font-semibold transition-all active:scale-[0.99] cursor-pointer ${
                    goal === g.value
                      ? "bg-primary-50/50 border-primary-500 text-primary-700 shadow-sm"
                      : "border-slate-200 bg-slate-50/10 text-slate-600 hover:border-primary-300 hover:bg-white"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Preferred Accent (Aria&apos;s Voice)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAccentPreference(a.value)}
                  className={`py-3 px-4 flex items-center gap-2 rounded-xl text-sm border font-semibold transition-all active:scale-95 cursor-pointer ${
                    accentPreference === a.value
                      ? "bg-primary-50/50 border-primary-500 text-primary-700 shadow-sm"
                      : "border-slate-200 bg-slate-50/10 text-slate-600 hover:border-primary-300 hover:bg-white"
                  }`}
                >
                  <span>{a.flag}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={update.isPending}
          className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-extrabold rounded-2xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {update.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving changes...
            </span>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>
    </div>
  );
}
