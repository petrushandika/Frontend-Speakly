"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
    >
      <span className="text-base">🚪</span>
      Sign out
    </button>
  );
}
