import { create } from "zustand";

import {
  defaultReaderPreferences,
  type ReaderMode,
  type ReaderPreferences,
} from "@/types/reader";

interface ReaderState {
  activeDocumentId?: string;
  currentChunkIndex: number;
  isPlaying: boolean;
  preferences: ReaderPreferences;
  setActiveDocument: (documentId?: string) => void;
  setMode: (mode: ReaderMode) => void;
  setChunkIndex: (index: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  updatePreferences: (changes: Partial<ReaderPreferences>) => void;
  resetPreferences: () => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  activeDocumentId: undefined,
  currentChunkIndex: 0,
  isPlaying: false,
  preferences: defaultReaderPreferences,
  setActiveDocument: (activeDocumentId) => set({ activeDocumentId }),
  setMode: (mode) =>
    set((state) => ({ preferences: { ...state.preferences, mode } })),
  setChunkIndex: (currentChunkIndex) => set({ currentChunkIndex }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  updatePreferences: (changes) =>
    set((state) => ({
      preferences: { ...state.preferences, ...changes },
    })),
  resetPreferences: () =>
    set({
      preferences: defaultReaderPreferences,
    }),
}));
