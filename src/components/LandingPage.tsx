"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  MessageSquare, PhoneCall, BookOpen, Users2, Layers, BarChart2,
  Mic, Volume2, Check, ArrowUpRight, Menu, X, Play,
} from "lucide-react";

// ── Feature tabs ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "sts",
    title: "Voice Call",
    desc: "Latih percakapan suara dua arah dengan Aria — layaknya menelepon native speaker asli.",
    icon: PhoneCall,
    color: "bg-primary-100 text-primary-700",
    details: [
      "Interaksi suara real-time dengan latensi sangat rendah",
      "Pilihan aksen native (American, British, Australian, dll)",
      "Feedback kelancaran (fluency) di akhir sesi",
    ],
    mockEl: (
      <div className="bg-stone-900 rounded-2xl p-6 text-white text-center space-y-5">
        <div className="flex justify-center">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-primary-400/20 animate-ping" />
            <div className="w-14 h-14 rounded-full bg-primary-600/20 border-2 border-primary-500/40 flex items-center justify-center relative z-10">
              <PhoneCall className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-stone-300">Aria · Voice Call</p>
          <p className="text-[10px] text-stone-500 mt-0.5">Connected · Speech Mode</p>
        </div>
        <div className="flex items-center justify-center gap-1 h-7">
          {[4,7,12,9,5,11,8,6,10,7,4,9].map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-primary-400 animate-pulse" style={{ height: h * 2, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <p className="text-[11px] italic text-primary-200/80 font-mono border-t border-white/5 pt-3">
          "Great job! What did you do last weekend?"
        </p>
      </div>
    ),
  },
  {
    id: "stt",
    title: "Voice Input",
    desc: "Bicara ke mikrofon — AI transkripsi suara Anda dan langsung koreksi grammar secara otomatis.",
    icon: Mic,
    color: "bg-accent-100 text-accent-500",
    details: [
      "Transkripsi suara dengan akurasi sangat tinggi",
      "Koreksi tata bahasa otomatis real-time",
      "Penilaian akurasi pengucapan kata demi kata",
    ],
    mockEl: (
      <div className="bg-[var(--surface-strong)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-2">
          <span className="text-[9px] font-black text-[var(--foreground)]/50 uppercase tracking-widest">Transcriber</span>
          <span className="text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-700">96% accuracy</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Mic className="w-3.5 h-3.5 text-accent-400 mt-0.5 shrink-0 animate-pulse" />
            <p className="text-xs font-mono text-[var(--foreground)]/70">
              "I <span className="text-accent-500 line-through">go</span>{" "}
              <span className="text-primary-600 dark:text-primary-400 font-bold underline">went</span> to the market."
            </p>
          </div>
          <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 rounded-xl px-3 py-2 text-[10px] text-primary-700 dark:text-primary-300">
            Use past tense "went" — past simple tense!
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "tts",
    title: "Audio Pronunciation",
    desc: "Dengarkan setiap kalimat dibunyikan oleh native speaker — sempurnakan listening Anda.",
    icon: Volume2,
    color: "bg-amber-100 text-amber-600",
    details: [
      "Intonasi natural manusia asli (ElevenLabs TTS)",
      "Kecepatan audio yang dapat diatur (0.8x–1.2x)",
      "Tersedia di semua materi pelajaran dan flashcards",
    ],
    mockEl: (
      <div className="bg-[var(--surface-strong)] border border-[var(--line)] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-2">
          <span className="text-[9px] font-black text-[var(--foreground)]/50 uppercase tracking-widest">Aria Reader</span>
          <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full">1.0×</span>
        </div>
        <p className="text-xs text-[var(--foreground)]/70 leading-relaxed">
          "An irregular verb does not follow the standard rule of adding -ed for past tense."
        </p>
        <div className="flex items-center gap-2">
          <button className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <Play className="w-2.5 h-2.5 text-white fill-white" />
          </button>
          <div className="flex-1 h-1.5 bg-[var(--line-soft)]/40 rounded-full overflow-hidden">
            <div className="w-2/3 h-full bg-primary-500 rounded-full" />
          </div>
          <Volume2 className="w-3.5 h-3.5 text-[var(--foreground)]/40" />
        </div>
      </div>
    ),
  },
];

const NAV_LINKS = [
  { label: "Fitur",      id: "features" },
  { label: "Teknologi",  id: "ai-technology" },
  { label: "Cara Kerja", id: "how-it-works" },
  { label: "Premium",    id: "pricing" },
];

const FEATURE_CARDS = [
  { icon: PhoneCall, color: "bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-700", title: "Voice Call (STS)", desc: "Panggil Aria secara suara — latih kelancaran tanpa rasa takut salah." },
  { icon: Mic,       color: "bg-accent-100 text-accent-500 border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-700",     title: "Voice Input (STT)", desc: "Bicara, transkripsi otomatis, koreksi grammar instan dari AI." },
  { icon: Volume2,   color: "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",             title: "Audio Pronunciation (TTS)", desc: "Dengar setiap kata & kalimat dari native speaker AI." },
  { icon: BookOpen,  color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",       title: "Structured Lessons", desc: "Modul CEFR A1–C2 dengan terjemahan Bahasa Indonesia." },
  { icon: Users2,    color: "bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700",                  title: "Speaking Rooms", desc: "Praktik langsung bersama sesama pelajar dalam room terbuka." },
  { icon: Layers,    color: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",                  title: "Spaced Repetition Flashcards", desc: "Kosakata baru dari percakapan otomatis masuk ke review berkala." },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab]           = useState("sts");
  const [isLoggedIn, setIsLoggedIn]         = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user));
  }, []);

  const activeFeature = FEATURES.find((f) => f.id === activeTab) ?? FEATURES[0];

  function scrollTo(id: string) {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="w-full bg-[var(--background)] paper-grid text-[var(--foreground)] font-sans selection:bg-primary-100 selection:text-primary-800">

      {/* ── NAVBAR ── */}
      <header className="sticky top-4 z-50 px-6">
        <div className="max-w-5xl mx-auto bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-2xl shadow-sm px-5 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-base font-black text-[var(--foreground)] tracking-tight">Speakly</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 bg-[var(--surface)] border border-[var(--line-soft)] rounded-xl px-1.5 py-1.5">
            {NAV_LINKS.map((n) => (
              <button
                key={n.id}
                onClick={() => scrollTo(n.id)}
                className="px-4 py-1.5 text-sm font-semibold text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:bg-[var(--surface-strong)] rounded-lg transition-all cursor-pointer"
              >
                {n.label}
              </button>
            ))}
          </nav>

          {/* CTA + theme toggle */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle compact />
            {isLoggedIn ? (
              <Link href="/home" className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-bold rounded-full transition-all">
                Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-semibold text-[var(--foreground)]/70 hover:text-[var(--foreground)] transition-colors">
                  Masuk
                </Link>
                <Link href="/register" className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-bold rounded-full transition-all">
                  Mulai Gratis <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle compact />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[var(--foreground)]/60 hover:bg-[var(--surface)] rounded-xl transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 bg-[var(--surface-strong)] border border-[var(--line)] rounded-2xl shadow-lg px-5 py-4 space-y-4 max-w-5xl mx-auto">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((n) => (
                <button
                  key={n.id}
                  onClick={() => scrollTo(n.id)}
                  className="text-left py-2 px-3 text-sm font-semibold text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:bg-[var(--surface)] rounded-xl transition-colors cursor-pointer"
                >
                  {n.label}
                </button>
              ))}
            </nav>
            <div className="border-t border-[var(--line-soft)] pt-3 flex flex-col gap-2">
              {isLoggedIn ? (
                <Link href="/home" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 text-sm font-bold text-white dark:text-stone-900 bg-stone-900 dark:bg-stone-100 rounded-xl">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2 text-sm font-semibold text-[var(--foreground)]/70">Masuk</Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 text-sm font-bold text-white dark:text-stone-900 bg-stone-900 dark:bg-stone-100 rounded-xl">
                    Mulai Belajar Gratis
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-6 py-20 overflow-hidden">
        <span className="absolute top-32 left-24 text-accent-300 dark:text-accent-700 text-2xl font-black select-none hidden lg:block">+</span>
        <span className="absolute top-48 right-32 text-primary-300 dark:text-primary-800 text-xl font-black select-none hidden lg:block">+</span>
        <span className="absolute bottom-32 left-1/3 text-accent-200 dark:text-accent-800 text-2xl font-black select-none hidden lg:block">+</span>

        {/* Floating badges */}
        <div className="absolute left-8 xl:left-24 top-1/2 -translate-y-8 hidden xl:flex items-center gap-2 px-3.5 py-2 bg-[var(--surface-strong)] border border-[var(--line)] rounded-full shadow-sm text-xs font-bold text-[var(--foreground)]/80">
          <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse shrink-0" />
          CEFR A1 → C2
        </div>
        <div className="absolute right-8 xl:right-24 top-1/3 hidden xl:flex items-center gap-2 px-3.5 py-2 bg-accent-50 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-700 rounded-full shadow-sm text-xs font-bold text-accent-600 dark:text-accent-400">
          <PhoneCall className="w-3.5 h-3.5 shrink-0" />
          voice call
        </div>
        <div className="absolute right-8 xl:right-28 bottom-1/3 hidden xl:flex items-center gap-2 px-3.5 py-2 bg-[var(--surface-strong)] border border-[var(--line)] rounded-full shadow-sm text-xs font-bold text-[var(--foreground)]/80">
          <BarChart2 className="w-3.5 h-3.5 shrink-0 text-primary-500" />
          progress tracking
        </div>

        <div className="text-center max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--surface-strong)] border border-[var(--line)] rounded-full shadow-sm text-xs font-bold text-[var(--foreground)]/60">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            AI English Learning Platform
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-[var(--foreground)]">
            Kuasai Bahasa Inggris Lewat{" "}
            <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 px-3 rounded-2xl inline-block">
              Percakapan
            </span>{" "}
            Alami
          </h1>

          <p className="text-[var(--foreground)]/60 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Speakly membantu Anda belajar bahasa Inggris melalui percakapan AI yang natural — dengan koreksi grammar, pengucapan native speaker, dan modul CEFR adaptif.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={isLoggedIn ? "/home" : "/register"}
              className="flex items-center gap-2 px-7 py-3.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-bold text-sm rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              {isLoggedIn ? "Ke Dashboard" : "Mulai Belajar Gratis"}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => scrollTo("ai-technology")}
              className="flex items-center gap-2 px-7 py-3.5 bg-[var(--surface-strong)] hover:bg-[var(--surface)] text-[var(--foreground)] font-bold text-sm rounded-2xl border border-[var(--line)] hover:border-[var(--line-soft)] transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 text-primary-600 fill-primary-600" />
              Lihat Cara Kerja
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-xs font-semibold text-[var(--foreground)]/50">
            {["Gratis selamanya", "Adaptive level CEFR", "Voice + Chat + Lessons"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-primary-500" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-20 md:py-28 px-6 bg-[var(--surface-strong)] border-y border-[var(--line)]">
        <div className="max-w-5xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <p className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Fitur Utama</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)]">
              Semua yang Anda Butuhkan untuk Berbicara
            </h2>
            <p className="text-[var(--foreground)]/60 text-sm md:text-base max-w-xl mx-auto">
              Dari voice call AI sampai flashcard otomatis — semua dalam satu platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="group p-6 bg-[var(--background)] border-2 border-[var(--line)] hover:border-[var(--line-soft)] rounded-2xl hover:shadow-md transition-all duration-200 space-y-4 cursor-default"
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.color}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-black text-[var(--foreground)] text-sm mb-1.5 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-[var(--foreground)]/55 text-xs leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI TECHNOLOGY ── */}
      <section id="ai-technology" className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Teknologi Inti</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)]">
              Uji Coba Teknologi Speech & AI
            </h2>
            <p className="text-[var(--foreground)]/60 text-sm max-w-lg mx-auto">
              Teknologi pengenalan suara terbaik untuk latihan mendengar, menulis, dan berbicara.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const active = activeTab === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveTab(f.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    active
                      ? "bg-stone-900 dark:bg-stone-100 border-stone-900 dark:border-stone-100 text-white dark:text-stone-900 shadow-md"
                      : "bg-[var(--surface-strong)] border-[var(--line)] text-[var(--foreground)]/70 hover:border-[var(--line-soft)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {f.title}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="bg-[var(--surface-strong)] border-2 border-[var(--line)] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-sm">
            <div className="md:col-span-7 p-8 md:p-10 space-y-6 border-b md:border-b-0 md:border-r border-[var(--line)]">
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-1.5 w-10 h-10 rounded-xl border justify-center ${activeFeature.color}`}>
                  <activeFeature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-black text-[var(--foreground)]">{activeFeature.title}</h3>
                <p className="text-[var(--foreground)]/60 text-sm leading-relaxed">{activeFeature.desc}</p>
              </div>
              <ul className="space-y-2.5">
                {activeFeature.details.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-sm text-[var(--foreground)]/80">
                    <Check className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-5 bg-[var(--surface)] p-8 md:p-10 flex items-center">
              {activeFeature.mockEl}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 md:py-28 px-6 bg-[var(--surface-strong)] border-y border-[var(--line)]">
        <div className="max-w-5xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <p className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Cara Kerja</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)]">
              Perjalanan Belajar di Speakly
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                n: "01", title: "Deteksi Level CEFR",
                desc: "Saat daftar, pilih level awal Anda (A1–C2). Semua konten AI dan modul akan menyesuaikan otomatis.",
              },
              {
                n: "02", title: "Latihan Setiap Hari",
                desc: "Voice call dengan Aria, baca modul Lessons dengan terjemahan, dan join Speaking Rooms bersama pelajar lain.",
              },
              {
                n: "03", title: "Naik Level Otomatis",
                desc: "Pantau grafik kemajuan, selesaikan flashcard review harian, dan tingkatkan CEFR saat siap.",
              },
            ].map((s) => (
              <div key={s.n} className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-100 dark:border-primary-800 flex items-center justify-center">
                  <span className="text-sm font-black text-primary-700 dark:text-primary-400">{s.n}</span>
                </div>
                <h3 className="text-xl font-black text-[var(--foreground)]">{s.title}</h3>
                <p className="text-[var(--foreground)]/60 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 md:py-28 px-6">
        <div className="max-w-4xl mx-auto space-y-14">
          <div className="text-center space-y-3">
            <p className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Harga Layanan</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)]">
              Mulai Gratis, Upgrade Kapan Saja
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-[var(--surface-strong)] border-2 border-[var(--line)] rounded-3xl p-8 space-y-8 flex flex-col">
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-[var(--surface)] border border-[var(--line)] rounded-full text-xs font-bold text-[var(--foreground)]/70">
                  Paket Gratis
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[var(--foreground)]">Rp 0</span>
                  <span className="text-[var(--foreground)]/50 text-sm">/ selamanya</span>
                </div>
                <p className="text-[var(--foreground)]/60 text-sm">Cocok untuk mulai belajar dan coba semua fitur dasar.</p>
              </div>
              <ul className="space-y-3 text-sm text-[var(--foreground)]/70 flex-1">
                {["14 Modul Lessons CEFR","Chat teks dengan Aria (25 pesan/hari)","Speaking Rooms publik","100 Flashcards review"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full py-3.5 bg-[var(--surface)] hover:bg-[var(--background)] text-[var(--foreground)] text-center font-bold rounded-2xl transition-all border border-[var(--line)]">
                Daftar Gratis
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-8 space-y-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                Terpopuler
              </div>
              <div className="space-y-3">
                <span className="inline-block px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-white">
                  Speakly Pro
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">Rp 79.000</span>
                  <span className="text-stone-400 text-sm">/ bulan</span>
                </div>
                <p className="text-stone-400 text-sm">Akses penuh semua fitur — voice call, STT, TTS, dan lebih.</p>
              </div>
              <ul className="space-y-3 text-sm text-stone-300 flex-1">
                {["Voice Call (Speech-to-Speech) tanpa batas","Transkripsi & Koreksi (STT) tanpa batas","Speaking Rooms premium tanpa limit waktu","Unlimited Flashcards & Smart intervals","Laporan analisis CEFR bulanan"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full py-3.5 bg-primary-500 hover:bg-primary-400 text-white text-center font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/20">
                Langganan Sekarang
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-stone-900 dark:bg-stone-800 rounded-3xl p-12 md:p-16 text-center text-white space-y-6 relative overflow-hidden">
            <div className="absolute top-6 right-8 text-white/5 text-8xl font-black select-none pointer-events-none">+</div>
            <div className="absolute bottom-6 left-8 text-white/5 text-8xl font-black select-none pointer-events-none">+</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Mulai Perjalanan Berbicara Bahasa Inggris Hari Ini
            </h2>
            <p className="text-stone-400 text-base max-w-md mx-auto">
              Bergabung dengan ribuan pelajar yang sudah berlatih bersama Aria, tutor AI personal Speakly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/register" className="flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/20">
                Mulai Latihan Sekarang <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl transition-all border border-white/10">
                Sudah punya akun? Masuk
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[var(--surface-strong)] border-t border-[var(--line)] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-base font-black text-[var(--foreground)]">Speakly</span>
          </div>
          <p className="text-xs text-[var(--foreground)]/40 font-medium">
            © 2026 Speakly AI. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs font-semibold text-[var(--foreground)]/50">
            <button onClick={() => scrollTo("features")} className="hover:text-[var(--foreground)] cursor-pointer">Fitur</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-[var(--foreground)] cursor-pointer">Harga</button>
            <Link href="/login" className="hover:text-[var(--foreground)]">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
