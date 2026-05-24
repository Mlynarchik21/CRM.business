import { create } from "zustand";
import type { Profile } from "@/types";

interface AppState {
  /** Текущий профиль команды (заполняется после авторизации) */
  currentUser: Profile | null;
  setCurrentUser: (user: Profile | null) => void;

  /** Свёрнут ли сайдбар */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
