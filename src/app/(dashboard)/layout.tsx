"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { 
  Home, 
  MessageSquare, 
  BookOpen, 
  FileText, 
  Layers, 
  Mic, 
  TrendingUp, 
  Settings,
  Menu,
  Languages
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/home",       label: "Home",           icon: Home },
  { href: "/chat",       label: "Chat with Aria", icon: MessageSquare },
  { href: "/lessons",    label: "Lessons",        icon: BookOpen },
  { href: "/vocabulary", label: "Vocabulary",     icon: FileText },
  { href: "/flashcards", label: "Flashcards",     icon: Layers },
  { href: "/rooms",      label: "Rooms",          icon: Mic },
  { href: "/progress",   label: "Progress",       icon: TrendingUp },
  { href: "/settings",   label: "Settings",       icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer is open
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
        className={`flex items-center gap-3.5 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
          active
            ? "bg-primary-600 text-white shadow-md shadow-primary-500/20 scale-[1.02]"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 hover:translate-x-1.5"
        }`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
        <span>{item.label}</span>
      </Link>
    );
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-slate-100 flex-col relative z-20">
        {/* Brand header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <Languages className="w-6 h-6 text-primary-600 animate-float" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Speakly
          </span>
        </div>
        
        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto w-full">{navLinks}</nav>
        
        {/* Logout section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 w-full">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Languages className="w-6 h-6 text-primary-600" />
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Speakly
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto w-full">{navLinks}</nav>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 w-full">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 h-14 shrink-0 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-950 hover:bg-slate-50 transition-all cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              Speakly
            </span>
          </div>
        </header>

        {/* Page Content wrapper */}
        <main className="flex-1 overflow-y-auto focus:outline-none w-full">
          <div className="py-6 md:py-8 w-full">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav bar */}
        <nav className="md:hidden sticky bottom-0 z-10 bg-white/90 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 h-16 shrink-0 shadow-lg w-full">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-xl transition-all duration-200 active:scale-95 ${
                  active 
                    ? "text-primary-600 scale-[1.05]" 
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  active ? "bg-primary-50" : "bg-transparent"
                }`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-semibold tracking-wide leading-none">
                  {item.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
