import { create } from "zustand";

interface LessonActivity {
  verbDone: boolean;
  vocabDone: boolean;
  grammarDone: boolean;
  readingDone: boolean;
  speakingDone: boolean;
  totalXp: number;
}

interface LessonStore {
  today: LessonActivity | null;
  setToday: (lesson: LessonActivity) => void;
  markActivity: (activity: keyof Omit<LessonActivity, "totalXp">, xp: number) => void;
}

export const useLessonStore = create<LessonStore>((set) => ({
  today: null,
  setToday: (today) => set({ today }),
  markActivity: (activity, xp) =>
    set((state) => ({
      today: state.today
        ? { ...state.today, [activity]: true, totalXp: state.today.totalXp + xp }
        : null,
    })),
}));
