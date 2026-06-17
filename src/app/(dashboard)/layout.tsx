"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  BookMarked,
  Layers,
  Mic2,
  BarChart2,
  Settings,
  Menu,
  X,
  PhoneCall,
  Zap,
  Users2,
  Flame,
  ChevronDown,
} from "lucide-react";

// ── Nav structure with section labels ────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "Learn",
    items: [
      { href: "/home",      label: "Home",         icon: LayoutDashboard },
      { href: "/chat",      label: "Chat with Aria", icon: MessageSquare },
      { href: "/call",      label: "Voice Call",   icon: PhoneCall },
      { href: "/speaking",  label: "Reading Aloud", icon: BookOpen },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/lessons",   label: "Lessons",      icon: BookOpen },
      { href: "/vocabulary",label: "Vocabulary",   icon: BookMarked },
      { href: "/flashcards",label: "Flashcards",   icon: Layers },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/rooms",     label: "Speaking Rooms", icon: Mic2 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/progress",  label: "Progress",     icon: BarChart2 },
      { href: "/settings",  label: "Settings",     icon: Settings },
    ],
  },
] as const;

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initials = profile?.displayName
    ? profile.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="hidden md:flex h-14 shrink-0 items-center justify-end gap-3 px-6 bg-[var(--surface)] border-b border-[var(--line)] w-full">
      <ThemeToggle compact />

      {/* XP badge */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-strong)] border border-[var(--line)] rounded-full text-xs font-bold text-[var(--foreground)]">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        {profile?.xpTotal?.toLocaleString() ?? 0} XP
      </div>
      {/* Streak */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-strong)] border border-[var(--line)] rounded-full text-xs font-bold text-[var(--foreground)]">
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        {profile?.streakDays ?? 0} days
      </div>

      {/* Profile dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-cream-100 transition-colors border border-transparent hover:border-cream-200"
        >
          <div className="w-7 h-7 rounded-full overflow-hidden bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : initials}
          </div>
          <span className="text-sm font-semibold text-stone-800">
            {profile?.displayName ?? "…"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--surface-strong)] border border-[var(--line)] rounded-2xl shadow-xl z-20 py-1.5 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-stone-100">
                <p className="text-xs font-bold text-stone-800 truncate">{profile?.displayName}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">{profile?.cefrLevel} · {profile?.goal}</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <div className="border-t border-stone-100 mt-1">
                <LogoutButton compact />
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// ── Sidebar Stats ─────────────────────────────────────────────────────────────

function SidebarStats() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const { data: dueCount } = trpc.progress.getDueFlashcardsCount.useQuery();
  return (
    <div className="px-3 py-3 border-t border-[var(--line)]">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="flex flex-col items-center gap-0.5 py-2.5 bg-[var(--highlight)]/45 rounded-xl border border-[var(--line)]">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-black text-stone-800">{profile?.xpTotal?.toLocaleString() ?? 0}</p>
          <p className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">XP</p>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2.5 bg-[var(--pink)]/35 rounded-xl border border-[var(--line)]">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <p className="text-xs font-black text-stone-800">{profile?.streakDays ?? 0}</p>
          <p className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">Streak</p>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2.5 bg-[var(--yellow)]/40 rounded-xl border border-[var(--line)]">
          <Layers className="w-3.5 h-3.5 text-primary-500" />
          <p className="text-xs font-black text-stone-800">{dueCount?.count ?? 0}</p>
          <p className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">Due</p>
        </div>
      </div>
    </div>
  );
}

// ── Nav Items Builder ─────────────────────────────────────────────────────────

function NavItems({ pathname, onClick }: { pathname: string; onClick?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 px-3 pb-1">
            {section.label}
          </p>
          {section.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClick}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-primary-100 border border-[var(--line)] text-primary-800"
                    : "text-stone-600 hover:bg-[#ede6d5] hover:text-stone-900 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary-600" : "text-stone-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] paper-grid">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 bg-[var(--surface-strong)] border-r border-[var(--line)] flex-col h-full overflow-y-auto relative z-20">
        {/* Logo */}
        <div className="px-5 h-14 border-b border-[var(--line)] flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center border border-[var(--line)]">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-base font-black tracking-tight text-stone-900">Speakly</span>
        </div>

        <NavItems pathname={pathname} />
        <SidebarStats />
        <div className="p-3 border-t border-[var(--line)] shrink-0 bg-[#efe7d4]">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--surface-strong)] flex flex-col shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center border border-[var(--line)]">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-base font-black tracking-tight text-stone-900">Speakly</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-[#efe9d9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <NavItems pathname={pathname} onClick={() => setOpen(false)} />
        <SidebarStats />
        <div className="p-3 border-t border-[var(--line)] shrink-0 bg-[#efe7d4]">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-10 bg-[var(--surface-strong)] border-b border-[var(--line)] flex items-center justify-between px-4 h-14 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-[#efe9d9]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base font-black text-stone-900">Speakly</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="w-full h-full">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 z-10 bg-[var(--surface-strong)] border-t border-[var(--line)] flex items-center justify-around px-2 h-16 shrink-0">
          {[
            { href: "/home",      icon: LayoutDashboard, label: "Home" },
            { href: "/chat",      icon: MessageSquare,   label: "Chat" },
            { href: "/call",      icon: PhoneCall,       label: "Call" },
            { href: "/lessons",   icon: BookOpen,        label: "Lessons" },
            { href: "/progress",  icon: BarChart2,       label: "Stats" },
          ].map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  active ? "text-primary-600" : "text-stone-400 hover:text-stone-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
