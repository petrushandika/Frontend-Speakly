"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { createClient } from "@/lib/supabase/client";
import {
  User, Target, Globe, Briefcase, Cpu,
  GraduationCap, Plane, BookOpen, Volume2,
  Camera, Loader2, X,
} from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const GOALS = [
  { value: "general",  label: "General English",    Icon: Globe },
  { value: "business", label: "Business & Work",     Icon: Briefcase },
  { value: "tech",     label: "Tech & IT",           Icon: Cpu },
  { value: "academic", label: "Academic & IELTS",    Icon: GraduationCap },
  { value: "travel",   label: "Travel & Daily Life", Icon: Plane },
  { value: "ielts",    label: "IELTS Preparation",   Icon: BookOpen },
] as const;

const ACCENTS = [
  { value: "american",   label: "American",         abbr: "US" },
  { value: "british",    label: "British",          abbr: "UK" },
  { value: "australian", label: "Australian",       abbr: "AU" },
  { value: "neutral",    label: "Neutral / Global", abbr: "GL" },
] as const;

const NATIVE_LANGUAGES = [
  "Indonesian", "Javanese", "Sundanese", "Malay",
  "Mandarin", "Cantonese", "Hindi", "Arabic",
  "Spanish", "Portuguese", "French", "German",
  "Japanese", "Korean", "Thai", "Vietnamese",
  "Other",
];

const COUNTRIES = [
  "Indonesia", "Malaysia", "Singapore", "Philippines",
  "Thailand", "Vietnam", "India", "China",
  "Japan", "South Korea", "Australia", "United Kingdom",
  "United States", "Canada", "Germany", "France", "Other",
];

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const supabase = createClient();
  const { data: profile, isLoading } = trpc.users.getProfile.useQuery();
  const getUploadUrl = trpc.users.getAvatarUploadUrl.useMutation();

  const [displayName,      setDisplayName]      = useState("");
  const [bio,              setBio]              = useState("");
  const [nativeLanguage,   setNativeLanguage]   = useState("");
  const [country,          setCountry]          = useState("");
  const [avatarUrl,        setAvatarUrl]        = useState<string | null>(null);
  const [avatarPreview,    setAvatarPreview]    = useState<string | null>(null);
  const [avatarFile,       setAvatarFile]       = useState<File | null>(null);
  const [uploadingAvatar,  setUploadingAvatar]  = useState(false);
  const [cefrLevel,        setCefrLevel]        = useState<"A1"|"A2"|"B1"|"B2"|"C1"|"C2">("B1");
  const [goal,             setGoal]             = useState<"general"|"business"|"tech"|"academic"|"travel"|"ielts">("general");
  const [accentPreference, setAccentPreference] = useState<"american"|"british"|"australian"|"neutral">("american");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setBio(profile.bio ?? "");
      setNativeLanguage(profile.nativeLanguage ?? "");
      setCountry(profile.country ?? "");
      setAvatarUrl(profile.avatarUrl ?? null);
      setCefrLevel((profile.cefrLevel as typeof CEFR_LEVELS[number]) ?? "B1");
      setGoal((profile.goal as typeof GOALS[number]["value"]) ?? "general");
      setAccentPreference((profile.accentPreference as typeof ACCENTS[number]["value"]) ?? "american");
    }
  }, [profile]);

  const update = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.users.getProfile.invalidate();
      toast.success("Profile updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return avatarUrl;
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split(".").pop()?.toLowerCase() as "jpg" | "jpeg" | "png" | "webp";
      const { signedUrl, publicUrl } = await getUploadUrl.mutateAsync({ fileExt: ext ?? "jpg" });

      const res = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": avatarFile.type },
        body: avatarFile,
      });

      if (!res.ok) throw new Error("Upload failed");
      return publicUrl;
    } catch (err) {
      // Fallback: try Supabase client upload directly
      try {
        const authRes = await supabase.auth.getSession();
        const userId  = authRes.data.session?.user?.id;
        if (!userId) throw new Error("Not authenticated");

        const ext  = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/avatar.${ext}`;

        const { error } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        return publicUrl;
      } catch {
        toast.error("Avatar upload failed — please try again");
        return avatarUrl;
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const uploadedUrl = await uploadAvatar();
    if (uploadedUrl !== avatarUrl) setAvatarUrl(uploadedUrl);
    update.mutate({
      displayName,
      bio:              bio || null,
      nativeLanguage:   nativeLanguage || null,
      country:          country || null,
      avatarUrl:        uploadedUrl,
      goal,
      accentPreference,
      cefrLevel,
    });
    setAvatarFile(null);
  }

  if (isLoading) {
    return (
      <div className="w-full p-6 md:p-8 space-y-4">
        <div className="h-6 w-24 bg-white border border-slate-100 rounded-xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-3xl bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const displayAvatar = avatarPreview ?? avatarUrl;
  const isSaving = uploadingAvatar || update.isPending;

  return (
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm">Manage your profile, learning preferences, and voice settings.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Profile Card ── */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" /> Profile
          </h2>

          {/* Avatar + Name row */}
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-tr from-primary-100 to-indigo-100 border-2 border-slate-100 flex items-center justify-center shadow-sm">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-extrabold text-primary-500 select-none">
                    {getInitials(displayName || profile?.displayName || "?")}
                  </span>
                )}
              </div>

              {/* Upload button overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
              >
                {uploadingAvatar
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Camera className="w-3.5 h-3.5" />}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Display Name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Email
                </label>
                <input
                  value={profile?.email ?? ""}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Avatar preview banner */}
          {avatarFile && (
            <div className="flex items-center gap-3 px-4 py-3 bg-primary-50 border border-primary-100 rounded-xl text-xs">
              <span className="text-primary-700 font-semibold flex-1 truncate">
                New photo selected: {avatarFile.name}
              </span>
              <button
                type="button"
                onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                className="text-primary-400 hover:text-primary-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bio */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bio <span className="normal-case font-normal">(optional, max 200 chars)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="A short introduction about yourself and your English learning journey…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <p className="text-[10px] text-slate-400 text-right">{bio.length}/200</p>
          </div>

          {/* Native language + Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Native Language
              </label>
              <select
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-700 cursor-pointer"
              >
                <option value="">Select language…</option>
                {NATIVE_LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-700 cursor-pointer"
              >
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CEFR Level */}
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

        {/* ── Learning Preferences ── */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
          <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" /> Learning Preferences
          </h2>

          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Main Goal</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={`flex items-center gap-2.5 text-left px-4 py-3 rounded-xl text-sm border font-semibold transition-all active:scale-[0.99] cursor-pointer ${
                    goal === g.value
                      ? "bg-primary-50/50 border-primary-500 text-primary-700 shadow-sm"
                      : "border-slate-200 bg-slate-50/10 text-slate-600 hover:border-primary-300 hover:bg-white"
                  }`}
                >
                  <g.Icon className="w-4 h-4 shrink-0" />
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Preferred Accent (Aria&apos;s Voice)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAccentPreference(a.value)}
                  className={`py-3 px-4 flex items-center gap-2.5 rounded-xl text-sm border font-semibold transition-all active:scale-95 cursor-pointer ${
                    accentPreference === a.value
                      ? "bg-primary-50/50 border-primary-500 text-primary-700 shadow-sm"
                      : "border-slate-200 bg-slate-50/10 text-slate-600 hover:border-primary-300 hover:bg-white"
                  }`}
                >
                  <span className="w-7 h-5 rounded text-[10px] font-black bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    {a.abbr}
                  </span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-extrabold rounded-2xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploadingAvatar ? "Uploading photo…" : update.isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
