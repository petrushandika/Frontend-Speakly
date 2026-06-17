"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const GOALS = [
  { value: "general",  label: "General English" },
  { value: "business", label: "Business / Work" },
  { value: "tech",     label: "Tech / IT" },
  { value: "academic", label: "Academic / IELTS" },
  { value: "travel",   label: "Travel & Daily Life" },
  { value: "ielts",    label: "IELTS Preparation" },
] as const;

const ACCENTS = [
  { value: "american",   label: "🇺🇸 American" },
  { value: "british",    label: "🇬🇧 British" },
  { value: "australian", label: "🇦🇺 Australian" },
  { value: "neutral",    label: "🌐 Neutral" },
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
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Profile</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              English level (CEFR)
            </label>
            <div className="grid grid-cols-6 gap-2">
              {CEFR_LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setCefrLevel(l)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    cefrLevel === l
                      ? "bg-primary-600 text-white border-primary-600"
                      : "border-gray-200 text-gray-600 hover:border-primary-400"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Learning preferences */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Learning Preferences</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Goal</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred accent
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAccentPreference(a.value)}
                  className={`py-2.5 px-3 rounded-lg text-sm border transition-colors text-left ${
                    accentPreference === a.value
                      ? "bg-primary-50 border-primary-500 text-primary-700 font-medium"
                      : "border-gray-200 text-gray-600 hover:border-primary-300"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={update.isPending}
          className="w-full py-3 bg-primary-600 text-white font-semibold rounded-2xl hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {update.isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
