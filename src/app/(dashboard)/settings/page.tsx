"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { createClient } from "@/lib/supabase/client";
import {
  User, Target, Globe, Briefcase, Cpu,
  GraduationCap, Plane, BookOpen, Volume2,
  Camera, Loader2, X, ChevronDown,
  HeartPulse, TrendingUp, Palette, School,
  Coffee, Scale,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const GOALS = [
  { value: "general",     label: "General English",      Icon: Globe },
  { value: "business",    label: "Business & Work",       Icon: Briefcase },
  { value: "tech",        label: "Tech & IT",             Icon: Cpu },
  { value: "academic",    label: "Academic & Research",   Icon: GraduationCap },
  { value: "travel",      label: "Travel & Daily Life",   Icon: Plane },
  { value: "ielts",       label: "IELTS / TOEFL Prep",    Icon: BookOpen },
  { value: "medical",     label: "Medical & Healthcare",  Icon: HeartPulse },
  { value: "finance",     label: "Finance & Banking",     Icon: TrendingUp },
  { value: "creative",    label: "Creative & Arts",       Icon: Palette },
  { value: "education",   label: "Teaching & Education",  Icon: School },
  { value: "hospitality", label: "Hospitality & Tourism", Icon: Coffee },
  { value: "law",         label: "Law & Legal",           Icon: Scale },
] as const;

const ACCENT_GROUPS = [
  {
    label: "Native English",
    accents: [
      { value: "american",      label: "American",        flag: "🇺🇸" },
      { value: "british",       label: "British",         flag: "🇬🇧" },
      { value: "australian",    label: "Australian",      flag: "🇦🇺" },
      { value: "canadian",      label: "Canadian",        flag: "🇨🇦" },
      { value: "irish",         label: "Irish",           flag: "🇮🇪" },
      { value: "newzealand",    label: "New Zealand",     flag: "🇳🇿" },
      { value: "south_african", label: "South African",   flag: "🇿🇦" },
    ],
  },
  {
    label: "Global English",
    accents: [
      { value: "indian",      label: "Indian",           flag: "🇮🇳" },
      { value: "singaporean", label: "Singaporean",      flag: "🇸🇬" },
      { value: "neutral",     label: "Neutral / Global", flag: "🌐" },
    ],
  },
] as const;

const NATIVE_LANGUAGES = [
  // Southeast Asia
  "Indonesian", "Javanese", "Sundanese", "Batak", "Minangkabau",
  "Malay", "Tagalog / Filipino", "Thai", "Vietnamese", "Burmese",
  "Khmer", "Lao",
  // East Asia
  "Mandarin", "Cantonese", "Hokkien", "Japanese", "Korean",
  // South Asia
  "Hindi", "Bengali", "Urdu", "Tamil", "Telugu", "Marathi", "Gujarati",
  "Punjabi", "Sinhala", "Nepali",
  // Middle East & Central Asia
  "Arabic", "Persian / Farsi", "Turkish", "Kurdish",
  // Europe
  "French", "German", "Spanish", "Portuguese", "Italian",
  "Russian", "Ukrainian", "Polish", "Dutch", "Swedish",
  // Africa
  "Swahili", "Amharic", "Hausa", "Yoruba", "Zulu",
  "Other",
].sort((a, b) => a.localeCompare(b));

const COUNTRIES = [
  // Southeast Asia
  "Indonesia", "Malaysia", "Singapore", "Philippines", "Thailand",
  "Vietnam", "Myanmar", "Cambodia", "Laos", "Brunei", "East Timor",
  // South Asia
  "India", "Bangladesh", "Pakistan", "Sri Lanka", "Nepal",
  // East Asia
  "China", "Japan", "South Korea", "Taiwan", "Hong Kong",
  // Middle East
  "Saudi Arabia", "United Arab Emirates", "Qatar", "Kuwait",
  "Turkey", "Iran", "Iraq", "Egypt",
  // Africa
  "Nigeria", "South Africa", "Kenya", "Ghana", "Ethiopia", "Tanzania",
  // Oceania
  "Australia", "New Zealand",
  // Europe
  "United Kingdom", "Ireland", "Germany", "France", "Netherlands",
  "Spain", "Italy", "Portugal", "Sweden", "Norway", "Denmark",
  "Poland", "Russia", "Ukraine",
  // Americas
  "United States", "Canada", "Brazil", "Mexico", "Argentina", "Colombia",
  "Other",
].sort((a, b) => a.localeCompare(b));

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

type GoalValue    = typeof GOALS[number]["value"];
type AccentValue  = typeof ACCENT_GROUPS[number]["accents"][number]["value"];
type CefrValue    = typeof CEFR_LEVELS[number];

// Native select fields for native scrolling and overflow handling
function SelectField({
  value,
  onChange,
  children,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-[var(--foreground)]/80 cursor-pointer"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const utils    = trpc.useUtils();
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
  const [cefrLevel,        setCefrLevel]        = useState<CefrValue>("B1");
  const [goal,             setGoal]             = useState<GoalValue>("general");
  const [accentPreference, setAccentPreference] = useState<AccentValue>("american");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setBio(profile.bio ?? "");
      setNativeLanguage(profile.nativeLanguage ?? "");
      setCountry(profile.country ?? "");
      setAvatarUrl(profile.avatarUrl ?? null);
      setCefrLevel((profile.cefrLevel as CefrValue) ?? "B1");
      setGoal((profile.goal as GoalValue) ?? "general");
      setAccentPreference((profile.accentPreference as AccentValue) ?? "american");
    }
  }, [profile]);

  const update = trpc.users.updateProfile.useMutation({
    onSuccess: () => { utils.users.getProfile.invalidate(); toast.success("Profile updated!"); },
    onError:   (err) => toast.error(err.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
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
    } catch {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) throw new Error("Not authenticated");
        const ext  = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/avatar.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        return publicUrl;
      } catch {
        toast.error("Avatar upload failed");
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
      displayName, bio: bio || null, nativeLanguage: nativeLanguage || null,
      country: country || null, avatarUrl: uploadedUrl,
      goal, accentPreference, cefrLevel,
    });
    setAvatarFile(null);
  }

  if (isLoading) {
    return (
      <div className="w-full p-3 md:p-8 space-y-4">
        <div className="h-6 w-24 bg-[var(--surface-strong)] border border-[var(--line)] rounded-xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-3xl bg-[var(--surface-strong)] border border-[var(--line)] animate-pulse" />
        ))}
      </div>
    );
  }

  const displayAvatar = avatarPreview ?? avatarUrl;
  const isSaving      = uploadingAvatar || update.isPending;

  return (
    <div className="w-full p-3 md:p-8 space-y-4 md:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Settings</h1>
        <p className="text-[var(--foreground)]/55 text-xs sm:text-sm">Manage your profile, learning preferences, and voice settings.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Profile ── */}
        <section className="bg-[var(--surface-strong)] border border-[var(--line)] rounded-3xl p-3 md:p-8 shadow-sm space-y-6">
          <h2 className="font-extrabold text-[var(--foreground)] text-base border-b border-[var(--line)] pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--foreground)]/40" /> Profile
          </h2>

          {/* Avatar + Name */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative shrink-0">
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-primary-50 dark:bg-primary-900/30 border-2 border-[var(--line)] flex items-center justify-center shadow-sm">
                {displayAvatar
                  ? <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-3xl sm:text-4xl font-extrabold text-primary-500 select-none">{getInitials(displayName || profile?.displayName || "?")}</span>
                }
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
              >
                {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Email</label>
                <input
                  value={profile?.email ?? ""}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--foreground)]/40 cursor-not-allowed"
                />
              </div>
            </div>
          </div>


          {avatarFile && (
            <div className="flex items-center gap-3 px-4 py-3 bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 rounded-xl text-xs">
              <span className="text-primary-700 dark:text-primary-300 font-semibold flex-1 truncate">New photo: {avatarFile.name}</span>
              <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} className="text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 dark:text-primary-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bio */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">
              Bio <span className="normal-case font-normal">(optional, max 200 chars)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="A short intro about yourself and your English learning journey…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <p className="text-[10px] text-[var(--foreground)]/40 text-right">{bio.length}/200</p>
          </div>

          {/* Native Language + Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Native Language</label>
              <SelectField value={nativeLanguage} onChange={setNativeLanguage} placeholder="Select language…">
                {NATIVE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Country</label>
              <SelectField value={country} onChange={setCountry} placeholder="Select country…">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectField>
            </div>
          </div>

          {/* CEFR Level */}
          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">English Level (CEFR)</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CEFR_LEVELS.map((l) => (
                <button
                  key={l} type="button" onClick={() => setCefrLevel(l)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 cursor-pointer ${
                    cefrLevel === l
                      ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                      : "border-[var(--line)] bg-[var(--surface)]/20 text-[var(--foreground)]/70 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Learning Preferences ── */}
        <section className="bg-[var(--surface-strong)] border border-[var(--line)] rounded-3xl p-3 md:p-8 space-y-5 shadow-sm">
          <h2 className="font-extrabold text-[var(--foreground)] text-base border-b border-[var(--line)] pb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--foreground)]/40" /> Learning Preferences
          </h2>

          {/* Goal */}
          <div className="space-y-2.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Main Goal</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.value} type="button" onClick={() => setGoal(g.value)}
                  className={`flex items-center gap-2.5 text-left px-4 py-3 rounded-xl text-sm border font-semibold transition-all active:scale-[0.99] cursor-pointer ${
                    goal === g.value
                      ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-300 shadow-sm"
                      : "border-[var(--line)] bg-[var(--surface)]/10 text-[var(--foreground)]/70 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  <g.Icon className="w-4 h-4 shrink-0" />
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accent */}
          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Preferred Accent (Aria&apos;s Voice)
            </label>

            {ACCENT_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-[10px] font-bold text-[var(--foreground)]/40 uppercase tracking-wider">{group.label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {group.accents.map((a) => (
                    <button
                      key={a.value} type="button" onClick={() => setAccentPreference(a.value)}
                      className={`py-2.5 px-3 flex items-center gap-2 rounded-xl text-sm border font-semibold transition-all active:scale-95 cursor-pointer ${
                        accentPreference === a.value
                          ? "bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-300 shadow-sm"
                          : "border-[var(--line)] bg-[var(--surface)]/10 text-[var(--foreground)]/70 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-[var(--surface-strong)]"
                      }`}
                    >
                      <span className="text-xl leading-none shrink-0">{a.flag}</span>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-extrabold rounded-2xl transition-all shadow-md shadow-primary-500/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {uploadingAvatar ? "Uploading…" : update.isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
