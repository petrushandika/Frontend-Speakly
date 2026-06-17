"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function LogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("sb-access-token");
    router.push("/");
  }

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
    >
      <LogOut className="w-4 h-4 shrink-0" />
      <span>Sign out</span>
    </button>
  );
}
