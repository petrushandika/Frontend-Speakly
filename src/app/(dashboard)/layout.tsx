"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
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
  Sparkles,
  ChevronDown,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/home",       label: "Home",           icon: LayoutDashboard },
  { href: "/chat",       label: "Chat with Aria", icon: MessageSquare },
  { href: "/lessons",    label: "Lessons",        icon: BookOpen },
  { href: "/vocabulary", label: "Vocabulary",     icon: BookMarked },
  { href: "/flashcards", label: "Flashcards",     icon: Layers },
  { href: "/rooms",      label: "Rooms",          icon: Mic2 },
  { href: "/progress",   label: "Progress",       icon: BarChart2 },
  { href: "/settings",   label: "Settings",       icon: Settings },
];

function TopBar() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initials = profile?.displayName
    ? profile.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="hidden md:flex h-14 shrink-0 items-center justify-end gap-3 px-6 bg-white border-b border-slate-100 w-full">
      {/* XP badge */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
        <Sparkles className="w-3.5 h-3.5" />
        {profile?.xpTotal?.toLocaleString() ?? 0} XP
      </div>

      {/* Streak */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700">
        🔥 {profile?.streakDays ?? 0} day streak
      </div>

      {/* Profile dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {profile?.displayName ?? "..."}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-100 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800 truncate">{profile?.displayName}</p>
                <p className="text-xs text-slate-400">{profile?.cefrLevel} · {profile?.goal}</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <div className="border-t border-slate-100 mt-1">
                <LogoutButton compact />
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navLinks = NAV_ITEMS.map((item) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3.5 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
          active
            ? "bg-primary-600 text-white shadow-sm shadow-primary-500/20"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
        <span>{item.label}</span>
      </Link>
    );
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-slate-100 flex-col h-full overflow-y-auto relative z-20">
        <div className="px-5 h-14 border-b border-slate-100 flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">Speakly</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">{navLinks}</nav>
        <div className="p-3 border-t border-slate-100 shrink-0">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Speakly</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">{navLinks}</nav>
        <div className="p-3 border-t border-slate-100 shrink-0">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop topbar */}
        <TopBar />

        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-10 bg-white border-b border-slate-100 flex items-center justify-between px-4 h-14 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base font-bold text-slate-900">Speakly</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="w-full h-full">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 z-10 bg-white border-t border-slate-100 flex items-center justify-around px-2 h-16 shrink-0">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  active ? "text-primary-600" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
