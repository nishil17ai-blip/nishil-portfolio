import { create } from "zustand";

export type Activity = "idle" | "thinking" | "answering";

interface SceneState {
  /** 0 at the top of the page, 1 at the bottom. Drives the morph. */
  progress: number;
  /** Which cluster is lit. -1 means none. */
  focus: number;
  /** What the assistant is doing, so the field can react to it. */
  activity: Activity;
  setProgress: (v: number) => void;
  setFocus: (v: number) => void;
  setActivity: (v: Activity) => void;
}

export const useScene = create<SceneState>((set) => ({
  progress: 0,
  focus: -1,
  activity: "idle",
  setProgress: (progress) => set({ progress }),
  setFocus: (focus) => set({ focus }),
  setActivity: (activity) => set({ activity }),
}));
