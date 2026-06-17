"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("sb-access-token");
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3.5 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 hover:translate-x-1.5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
    >
      <LogOut className="w-5 h-5 shrink-0" />
      <span>Sign out</span>
    </button>
  );
}
