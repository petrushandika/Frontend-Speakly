"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

const NAV_ITEMS = [
  { href: "/home",       label: "Home",           icon: "🏠" },
  { href: "/chat",       label: "Chat with Aria", icon: "💬" },
  { href: "/lessons",    label: "Lessons",        icon: "📚" },
  { href: "/vocabulary", label: "Vocabulary",     icon: "📝" },
  { href: "/flashcards", label: "Flashcards",     icon: "🃏" },
  { href: "/rooms",      label: "Rooms",          icon: "🎙️" },
  { href: "/progress",   label: "Progress",       icon: "📈" },
  { href: "/settings",   label: "Settings",       icon: "⚙️" },
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
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          active
            ? "bg-primary-50 text-primary-700 font-medium"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <span className="text-base">{item.icon}</span>
        {item.label}
      </Link>
    );
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-gray-100 flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="text-lg font-bold text-primary-600">Speakly</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">{navLinks}</nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white flex flex-col shadow-xl transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-lg font-bold text-primary-600">Speakly</span>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">{navLinks}</nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center gap-3 px-4 h-14 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-gray-500 hover:text-gray-900 p-1 -ml-1"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-base font-bold text-primary-600">Speakly</span>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 h-16 shrink-0">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  active ? "text-primary-600" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium leading-none">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
