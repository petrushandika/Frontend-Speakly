"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  // Runs only on the client after hydration — avoids mismatch with SSR
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sk-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sk-theme", "light");
    }
  }

  // Avoid hydration mismatch
  if (!mounted) {
    return <div className={compact ? "w-8 h-8" : "w-9 h-9"} />;
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--line)] transition-all cursor-pointer"
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Mode terang" : "Mode gelap"}
      className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--surface)] border border-[var(--line)] text-[var(--foreground)] hover:bg-[var(--surface-strong)] transition-all cursor-pointer shrink-0"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
