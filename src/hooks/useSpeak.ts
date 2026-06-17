"use client";

import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Returns a `speak(text)` function that uses the user's saved accent preference.
 * Pulls accent from the tRPC profile cache — no extra network request if profile
 * is already loaded elsewhere on the page.
 */
export function useSpeak() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const accent = profile?.accentPreference ?? "american";
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop and clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const token = localStorage.getItem("sb-access-token") ?? "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/synthesize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 900), accent }),
        signal: controller.signal,
      });
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play();
    } catch {
      // ignore — network errors or aborts
    } finally {
      clearTimeout(timer);
    }
  }, [accent]);

  return speak;
}
