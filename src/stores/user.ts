import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  goal: string;
  domain: string;
  accentPreference: "american" | "british" | "australian" | "neutral";
  totalXp: number;
  currentStreak: number;
}

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    { name: "speakly-user" },
  ),
);
